"""(nos_game_project/scripts/art/gen.py에서 가져와 --mask를 더했다)
그림 한 장 생성 래퍼: sprite-gen gen(OpenAI) -> 크로마 제거 -> pixel_unfake 격자 복원.

사용:
  tools/sprite-gen/.venv/Scripts/python.exe scripts/art/gen.py --game <id> --id <artId> \
      --prompt-file <path> [--ref <png> ...] [--states <json 파일 또는 JSON 문자열>] \
      --out tools/art-runs/<id>/<artId>/ [--cell WxH] [--palette-size N] [--logical-height N] \
      [--outline on|off|0..1] [--safe-margin N] [--aspect-ratio 1:1] [--quality low|medium|high|auto]       [--var 키=값 ...] [--sheet] [--no-key] [--pitch-hint PX]
  (--var: 프롬프트 틀의 {{키}}를 채운다. 빠진 키·안 쓴 키는 오류. --sheet: --states에 상태 여러 개를 받아, 한 번의 호출로
   세로로 쌓인 줄 그림 하나를 받고 줄마다 잘라 상태별로 격자 복원한다(걷기 4방향 한 호출). 줄 순서 = --states 키 순서)
  (--dry-run: 호출 없이 명령만 출력. --from-raw <png>: API를 부르지 않고 이미 있는 원본으로 후처리만 한다. 호출 수 0)

규칙(스펙 5절 비용·키):
- 그림 하나에 생성 호출 한 번. 이 래퍼는 재시도하지 않는다. 다만 sprite-gen 자체가 OpenAI가 문서로 밝힌
  '요금이 매겨지지 않는' 429/503 거절은 최대 2번까지 다시 보낸다. 크레딧 오류는 다시 보내지 않는다.
- 키(OPENAI_API_KEY)는 .env에서 읽어 하위 프로세스의 환경 변수로만 넘긴다. 인자·로그·출력에 넣지 않고, 출력에 섞이면 가린다.
- 크레딧·인증 오류면 메시지를 출력하고 종료 코드 3으로 끝낸다.
- 호출 수는 tools/art-runs/calls.jsonl에 한 줄({date, game, id, calls})로 더한다. 호출을 보낸 시도마다 1을 센다(실패해도 센다).

원본은 마젠타 단색 배경으로 받아 run/raw/에 그대로 보존하고, 배경 제거와 격자 복원은 extract가 한다.
투명 배경 참고 이미지는 마젠타 위에 얹어(out/refs/) 올린다.

--out 안의 결과: run/(sprite-gen 실행 폴더, raw/ 원본 포함), gen-report.json, final/frame-N.png(격자 그림), final.png(가로로 이은 시트).
"""
from __future__ import annotations

import argparse
import datetime
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
# 이 저장소 tools/sprite-gen(설치했을 때) → 없으면 이전 저장소의 설치본(nos-art 스킬 2절)
_LOCAL_SG = ROOT / "tools" / "sprite-gen"
_OLD_SG = Path(r"C:/Users/mrdoo/Documents/nos_game_project/tools/sprite-gen")
SPRITE_GEN = _LOCAL_SG if (_LOCAL_SG / ".venv").exists() else _OLD_SG
CALLS_LOG = ROOT / "tools" / "art-runs" / "calls.jsonl"
EXIT_CREDIT_OR_AUTH = 3
DEFAULT_STATE = "art"

# 크레딧·인증 오류로 읽는 문구(sprite-gen이 낸 한 줄과 OpenAI 오류 코드). 소문자로 비교한다.
# 호출 전에 찍는 요금 안내 줄("running on OPENAI_API_KEY ...")에 걸리지 않도록 키 이름만으로는 판정하지 않는다
CREDIT_AUTH_MARKERS = (
    "(http 401)", "(http 403)", "incorrect api key", "invalid_api_key",
    "insufficient_quota", "credit_balance", "billing_hard_limit", "billing_not_active",
    "spend_limit", "usage_limit_reached", "exceeded your current quota",
    "usage_limit_exceeded", "spend_limit_exceeded",  # organization_usage_limit_exceeded도 이 문구에 걸린다
)

KEY_BACKGROUND = (
    "Draw the subject on a flat, solid #FF00FF magenta background that fills the whole image. "
    "The background is a single flat colour: not transparent, no checkerboard, no gradient, no ground shadow."
)


def parse_env(text: str) -> dict[str, str]:
    """.env 한 파일의 KEY=VALUE 줄을 읽는다(주석·빈 줄 무시, 따옴표 벗김)."""
    out: dict[str, str] = {}
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        v = v.strip()
        if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
            v = v[1:-1]
        out[k.strip().removeprefix("export ").strip()] = v
    return out


def redact(text: str, secrets: list[str]) -> str:
    """키 값과 키처럼 생긴 문자열을 [redacted]로 가린다."""
    for s in secrets:
        if s:
            text = text.replace(s, "[redacted]")
    text = re.sub(r"sk-[A-Za-z0-9_\-]{8,}", "[redacted]", text)
    return re.sub(r"(?i)bearer\s+[A-Za-z0-9_\-\.]{8,}", "Bearer [redacted]", text)


def is_credit_or_auth_error(output: str) -> bool:
    low = output.lower()
    return any(m in low for m in CREDIT_AUTH_MARKERS)


def with_key_background(prompt: str) -> str:
    """프롬프트 끝에 마젠타 단색 배경 문장을 한 번만 붙인다(추출 단계가 이 색을 지운다)."""
    return prompt if "#FF00FF" in prompt else f"{prompt.rstrip()}\n\n{KEY_BACKGROUND}\n"


def flatten_ref(path: str, dest_dir: Path) -> str:
    """투명 배경 참고 이미지를 마젠타 위에 얹어 RGB로 저장한다(모델이 투명 체크무늬를 따라 그리지 않게)."""
    from PIL import Image
    dest_dir.mkdir(parents=True, exist_ok=True)
    img = Image.open(path).convert("RGBA")
    flat = Image.new("RGBA", img.size, (255, 0, 255, 255))
    flat.alpha_composite(img)
    dst = dest_dir / Path(path).name
    flat.convert("RGB").save(dst)
    return str(dst)


def sprite_gen_exe() -> Path:
    for rel in ("Scripts/sprite-gen.exe", "bin/sprite-gen"):
        p = SPRITE_GEN / ".venv" / rel
        if p.exists():
            return p
    raise FileNotFoundError("sprite-gen 실행 파일을 찾지 못했습니다(tools/sprite-gen/.venv).")


def parse_vars(items: list[str]) -> dict[str, str]:
    """--var 키=값 목록을 사전으로. '=' 없는 항목은 ValueError."""
    out: dict[str, str] = {}
    for it in items:
        if "=" not in it:
            raise ValueError(f"--var '{it}'은 키=값 형식이어야 합니다.")
        k, v = it.split("=", 1)
        out[k.strip()] = v
    return out


_PLACEHOLDER = re.compile(r"\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}")


def render_prompt(text: str, variables: dict[str, str]) -> str:
    """프롬프트 틀의 {{키}}를 채운다. 채우지 않은 자리와 쓰지 않은 변수는 ValueError(틀과 호출이 어긋나는 것을 막는다)."""
    wanted = set(_PLACEHOLDER.findall(text))
    missing = sorted(wanted - set(variables))
    if missing:
        raise ValueError("프롬프트 틀에 채우지 않은 자리가 있습니다: " + ", ".join(missing))
    unused = sorted(set(variables) - wanted)
    if unused:
        raise ValueError("프롬프트 틀에 없는 --var입니다: " + ", ".join(unused))
    return _PLACEHOLDER.sub(lambda m: variables[m.group(1)], text)


def split_sheet_rows(img, n: int, key: tuple[int, int, int] = (255, 0, 255), tol: int = 60, min_gap: int = 2) -> list:
    """세로로 쌓인 n줄 그림을 줄마다 자른다. 마젠타(키색)만 있는 가로 틈 가운데 가장 넓은 n-1개의 한가운데에서 자른다.
    틈이 모자라면(줄이 서로 붙었으면) 높이를 n등분한다. 각 줄은 전체 너비를 유지한다."""
    from PIL import Image
    rgb = img.convert("RGB")
    w, h = rgb.size
    px = rgb.load()

    def is_key(c) -> bool:
        return abs(c[0] - key[0]) + abs(c[1] - key[1]) + abs(c[2] - key[2]) <= tol

    # 가장자리에 남은 노이즈 몇 픽셀은 줄로 세지 않는다(그 밖 여백이 틈으로 뽑히는 것을 막는다)
    noise = max(3, w // 100)
    empty = [sum(1 for x in range(w) if not is_key(px[x, y])) <= noise for y in range(h)]
    gaps: list[tuple[int, int]] = []  # (시작, 끝+1) 안쪽 틈만(위·아래 가장자리 여백은 뺀다)
    first = next((y for y in range(h) if not empty[y]), None)
    last = next((y for y in range(h - 1, -1, -1) if not empty[y]), None)
    if first is not None and last is not None:
        y = first
        while y <= last:
            if empty[y]:
                y0 = y
                while y <= last and empty[y]:
                    y += 1
                if y - y0 >= min_gap:
                    gaps.append((y0, y))
            else:
                y += 1
    if len(gaps) >= n - 1:
        widest = sorted(sorted(gaps, key=lambda g: g[1] - g[0], reverse=True)[: n - 1])
        cuts = [0] + [(a + b) // 2 for a, b in widest] + [h]
    else:
        cuts = [round(i * h / n) for i in range(n + 1)]
    return [rgb.crop((0, cuts[i], w, cuts[i + 1])) for i in range(n)]


def select_states(states: dict, only: str | None) -> dict:
    """--only a,b: 줄 그림에서 이 상태만 추출·수집한다(나머지 줄은 버린다. 예: 좌우 반전으로 만들 줄). 순서는 원래 순서."""
    if not only:
        return states
    want = [n.strip() for n in only.split(",") if n.strip()]
    unknown = [n for n in want if n not in states]
    if unknown:
        raise ValueError("--only에 없는 상태입니다: " + ", ".join(unknown))
    return {k: v for k, v in states.items() if k in want}


def load_states(arg: str | None, frames_default: int = 1, allow_many: bool = False) -> dict:
    """--states: JSON 파일 경로 또는 JSON 문자열. 없으면 프레임 1개짜리 상태 하나. allow_many는 --sheet에서만."""
    if not arg:
        return {DEFAULT_STATE: {"frames": frames_default, "fps": 1, "loop": False, "action": "still"}}
    p = Path(arg)
    states = json.loads(p.read_text(encoding="utf8") if p.exists() else arg)
    if not isinstance(states, dict) or not states:
        raise ValueError("--states는 상태 이름을 키로 하는 JSON 객체여야 합니다.")
    if len(states) != 1 and not allow_many:
        raise ValueError("그림 하나에 생성 호출 한 번이 원칙이라 --states는 상태 하나만 받습니다(여러 줄은 --sheet).")
    return states


def log_calls(game: str, art_id: str, calls: int, log_path: Path = CALLS_LOG) -> None:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    row = {"date": datetime.date.today().isoformat(), "game": game, "id": art_id, "calls": calls}
    with open(log_path, "a", encoding="utf8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")


def run_generation(cmd: list[str], env: dict[str, str], secrets: list[str], game: str, art_id: str,
                   log_path: Path = CALLS_LOG) -> tuple[int, str]:
    """생성 호출 한 번. 호출 수를 하위 프로세스를 돌리기 전에 먼저 기록해, 중간에 끊겨도 센다."""
    log_calls(game, art_id, 1, log_path)
    return run_tool(cmd, env, secrets)


def run_tool(cmd: list[str], env: dict[str, str], secrets: list[str]) -> tuple[int, str]:
    """하위 프로세스를 한 번 돌리고 (종료 코드, 가린 출력)을 돌려준다."""
    proc = subprocess.run(cmd, env=env, capture_output=True, text=True, encoding="utf-8", errors="replace", cwd=str(SPRITE_GEN))
    return proc.returncode, redact((proc.stdout or "") + (proc.stderr or ""), secrets)


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="sprite-gen으로 그림 한 장 생성 + 격자 복원")
    ap.add_argument("--game", required=True)
    ap.add_argument("--id", required=True, dest="art_id")
    ap.add_argument("--prompt-file", required=True)
    ap.add_argument("--ref", action="append", default=[])
    ap.add_argument("--states")
    ap.add_argument("--out", required=True)
    ap.add_argument("--cell", default="16x16", help="칸 크기 WxH(격자 복원 뒤 한 프레임의 도트 수)")
    ap.add_argument("--palette-size", type=int, default=8)
    ap.add_argument("--logical-height", type=int)
    ap.add_argument("--outline", default="on")
    ap.add_argument("--pitch-hint", type=int, help="원본 한 픽셀 블록의 대략 크기(px). 격자 검출이 흔들릴 때 쓴다")
    ap.add_argument("--safe-margin", type=int, default=0)
    ap.add_argument("--aspect-ratio", default="1:1")
    ap.add_argument("--quality")
    ap.add_argument("--only", help="줄 그림에서 이 상태만 추출한다(쉼표로 구분)")
    ap.add_argument("--var", action="append", default=[], help="프롬프트 틀의 {{키}}를 채운다(키=값)")
    ap.add_argument("--sheet", action="store_true", help="상태 여러 개를 한 번의 호출로 줄 그림 하나에 받아 줄마다 자른다")
    ap.add_argument("--no-key", action="store_true", help="마젠타 배경 문장을 붙이지 않는다(타일·장면처럼 화면 가득 채우는 그림)")
    ap.add_argument("--mask", help="대륙 윤곽 마스크 PNG: 결과를 이 크기로 맞추고 마스크 밖 픽셀을 지운다(윤곽은 늘 마스크가 정한다)")
    ap.add_argument("--dry-run", action="store_true", help="API를 부르지 않고 생성 명령만 보여 준다")
    ap.add_argument("--from-raw", help="API를 부르지 않고 이 원본 PNG로 후처리만 한다")
    ap.add_argument("--raw-only", action="store_true", help="생성 원본만 받고 멈춘다(배경처럼 화면을 채우는 그림은 scripts/art/bg.py로 줄인다)")
    args = ap.parse_args(argv)

    out = Path(args.out).resolve()
    prompt_file = Path(args.prompt_file).resolve()
    refs = [str(Path(r).resolve()) for r in args.ref]
    try:
        cw, ch = (int(n) for n in args.cell.lower().split("x"))
        states = load_states(args.states, allow_many=args.sheet)
        variables = parse_vars(args.var)
        prompt_text = prompt_file.read_text(encoding="utf8")
        if variables or "{{" in prompt_text:
            prompt_text = render_prompt(prompt_text, variables)
    except ValueError as e:
        print(f"오류: {e}", file=sys.stderr)
        return 2
    state = next(iter(states))
    all_states = states
    try:
        states = select_states(states, args.only)
    except ValueError as e:
        print(f"오류: {e}", file=sys.stderr)
        return 2
    raw_name = "sheet" if args.sheet else state

    dotenv = parse_env((ROOT / ".env").read_text(encoding="utf8")) if (ROOT / ".env").exists() else {}
    key = dotenv.get("OPENAI_API_KEY", "")
    model = dotenv.get("OPENAI_IMAGE_MODEL", "")
    secrets = [key]
    env = dict(os.environ)
    env["PYTHONIOENCODING"] = "utf-8"
    if key:
        env["OPENAI_API_KEY"] = key  # 환경 변수로만 넘긴다
    exe = str(sprite_gen_exe())

    if not args.from_raw and not args.dry_run and (not key or not model):
        print("오류: .env에 OPENAI_API_KEY와 OPENAI_IMAGE_MODEL이 필요합니다(값은 출력하지 않습니다).", file=sys.stderr)
        return EXIT_CREDIT_OR_AUTH if not key else 2

    run_dir = out / "run"
    final_dir = out / "final"
    out.mkdir(parents=True, exist_ok=True)

    # 1) 실행 폴더 준비(칸 크기 = 격자 복원 뒤 크기, 배율 1)
    request = {"states": states}
    prep = [exe, "prepare", "--out-dir", str(run_dir), "--character-id", args.art_id,
            "--cell-width", str(cw), "--cell-height", str(ch), "--safe-margin", str(args.safe_margin),
            "--fit-pixel-unfake", "--fit-logical-height", str(args.logical_height or ch),
            "--fit-palette-size", str(args.palette_size), "--fit-outline", args.outline,
            "--fit-align-y", "bottom", *(["--fit-pitch-hint", str(args.pitch_hint)] if args.pitch_hint else []), "--force", "--request-json", json.dumps(request)]
    code, text = run_tool(prep, env, secrets)
    if code != 0:
        print(text, file=sys.stderr)
        return 1

    raw_path = run_dir / "raw" / f"{raw_name}.png"
    raw_path.parent.mkdir(parents=True, exist_ok=True)

    # 2) 생성(호출 한 번, 재시도 없음)
    calls = 0
    if args.from_raw:
        if Path(args.from_raw).resolve() != raw_path.resolve():
            shutil.copyfile(args.from_raw, raw_path)
    else:
        # 원본은 마젠타 단색 배경으로 받아 그대로 보존하고, 배경 제거는 extract가 한다(실패해도 원본이 남는다)
        sent_prompt = out / "prompt-sent.txt"
        sent_prompt.write_text(f"{prompt_text.rstrip()}\n" if args.no_key else with_key_background(prompt_text), encoding="utf8")
        flat_refs = [flatten_ref(r, out / "refs") for r in refs]
        gen = [exe, "gen", "--provider", "openai", "--model", model, "--prompt-file", str(sent_prompt),
               "--out", str(raw_path), "--report", str(out / "gen-report.json"),
               "--aspect-ratio", args.aspect_ratio]
        if args.quality:
            gen += ["--quality", args.quality]
        for r in flat_refs:
            gen += ["--ref", r]
        if args.dry_run:
            print("dry-run: " + " ".join(g if g != model else "<model>" for g in gen))
            return 0
        calls = 1
        code, text = run_generation(gen, env, secrets, args.game, args.art_id)
        if code != 0:
            print(text, file=sys.stderr)
            if is_credit_or_auth_error(text):
                print("크레딧 또는 인증 오류로 멈춥니다. 다시 시도하지 않습니다(종료 코드 3).", file=sys.stderr)
                return EXIT_CREDIT_OR_AUTH
            return 1
        if text.strip():
            print(text)
    if args.raw_only:
        print(f"생성 호출 {calls}회. 원본: {raw_path}")
        return 0

    if args.sheet:
        # 줄 그림 하나를 상태 수만큼 잘라 상태별 원본으로 둔다(--from-raw도 같다)
        from PIL import Image
        for st, row_img in zip(all_states, split_sheet_rows(Image.open(raw_path), len(all_states))):
            row_img.save(run_dir / "raw" / f"{st}.png")

    # 3) 추출: 구성요소 분리 -> pixel_unfake 격자 복원 -> 공용 팔레트
    code, text = run_tool([exe, "extract", "--run-dir", str(run_dir), *(["--states", ",".join(states)] if args.only else [])], env, secrets)
    print(text)
    if code != 0:
        return 1

    # 4) 결과 모으기: 상태 하나면 final/frame-N.png + final.png, 여러 줄이면 final/<상태>/frame-N.png + final/<상태>.png
    from PIL import Image
    final_dir.mkdir(parents=True, exist_ok=True)
    multi = len(states) > 1
    for st in states:
        frames_dir = run_dir / "frames" / st
        frames = [f for f in frames_dir.glob("frame-*.png") if re.fullmatch(r"frame-\d+\.png", f.name)]
        frames.sort(key=lambda p: int(re.search(r"frame-(\d+)\.png$", p.name).group(1)))
        if not frames:
            print(f"오류: 추출된 프레임이 없습니다({st}).", file=sys.stderr)
            return 1
        dest = final_dir / st if multi else final_dir
        dest.mkdir(parents=True, exist_ok=True)
        imgs = []
        for i, f in enumerate(frames):
            shutil.copyfile(f, dest / f"frame-{i}.png")
            imgs.append(Image.open(f).convert("RGBA"))
        sheet = Image.new("RGBA", (sum(im.width for im in imgs), max(im.height for im in imgs)), (0, 0, 0, 0))
        x = 0
        for im in imgs:
            sheet.paste(im, (x, 0))
            x += im.width
        sheet.save(final_dir / f"{st}.png" if multi else out / "final.png")
        want = int(states[st].get("frames", 1))
        note = "" if len(imgs) == want else f" (요청 {want}개와 다름)"
        print(f"완료: {st} 프레임 {len(imgs)}개{note}")
    if args.mask:
        apply_mask(out / "final.png", Path(args.mask))
        print(f"마스크로 잘랐습니다: {args.mask}")
    print(f"생성 호출 {calls}회. 결과: {final_dir}")
    return 0


def apply_mask(img_path: Path, mask_path: Path) -> None:
    """결과를 마스크 크기로 맞추고(최근접), 마스크가 투명한 곳은 지운다."""
    from PIL import Image
    mask = Image.open(mask_path).convert("RGBA")
    img = Image.open(img_path).convert("RGBA").resize(mask.size, Image.NEAREST)
    m = mask.split()[3]
    r, g, b, a = img.split()
    a = Image.composite(Image.new("L", mask.size, 255), Image.new("L", mask.size, 0), m)
    Image.merge("RGBA", (r, g, b, a)).save(img_path)


if __name__ == "__main__":
    sys.exit(main())

"""생성 원본 한 장을 게임 그림 크기로 줄인다(배경·초상처럼 화면이나 칸을 채우는 그림).

사용: python scripts/art/bg.py <raw.png> <out.png> --size 480x360 [--colors 16] [--palette activities/<id>/art/palette.json]
- 가로세로 비율이 다르면 가운데를 잘라 맞춘다.
- 크기를 줄일 때 칸 평균(BOX)을 쓰고, 색 수를 줄인다(--colors). --palette를 주면 그 색들을 꼭 쓰도록 섞는다.
- 반투명·중간색 외곽선이 생기지 않게 알파는 0 또는 255로만 둔다.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("raw")
    ap.add_argument("out")
    ap.add_argument("--size", default="480x360")
    ap.add_argument("--colors", type=int, default=16)
    ap.add_argument("--palette")
    ap.add_argument("--key", action="store_true", help="마젠타 배경을 투명으로")
    a = ap.parse_args()
    w, h = (int(n) for n in a.size.lower().split("x"))
    img = Image.open(a.raw).convert("RGBA")
    sw, sh = img.size
    if sw / sh > w / h:
        nw = round(sh * w / h)
        img = img.crop(((sw - nw) // 2, 0, (sw - nw) // 2 + nw, sh))
    else:
        nh = round(sw * h / w)
        img = img.crop((0, (sh - nh) // 2, sw, (sh - nh) // 2 + nh))
    small = img.resize((w, h), Image.BOX)
    alpha = None
    if a.key:
        px = small.load()
        alpha = Image.new("L", (w, h), 255)
        ap_ = alpha.load()
        for y in range(h):
            for x in range(w):
                r, g, b, _ = px[x, y]
                if r - g > 60 and b - g > 60 and r > 120 and b > 120:
                    ap_[x, y] = 0
    rgb = small.convert("RGB")
    if a.palette:
        cols = [c["hex"] for c in json.loads(Path(a.palette).read_text(encoding="utf8"))["colors"]]
        flat: list[int] = []
        for c in cols[:256]:
            flat += [int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16)]
        pal = Image.new("P", (1, 1))
        pal.putpalette(flat + flat[:3] * (256 - len(cols)))
        q = rgb.quantize(palette=pal, dither=Image.Dither.NONE)
    else:
        q = rgb.quantize(colors=a.colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    out = q.convert("RGBA")
    if alpha is not None:
        out.putalpha(alpha)
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    out.save(a.out)
    print(f"{a.out}: {w}x{h}, {len(out.getcolors(65536) or [])} colours")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""정리 페이지 "이 활동에서 겪은 것"의 작은 그림 6개를 게임 그림에서 잘라 한 줄로 만든다(생성 없음).

사용: python activities/continental-drift/tools/art/journey-icons.py  ->  activities/continental-drift/art/summary/journey.png (424x48)
순서: 해안선, 화석, 빙하, 산맥, 학회, 바다 밑 줄무늬 (정리 페이지 목록 순서와 같다).
"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ACTIVITY = Path(__file__).resolve().parents[2]  # activities/<id>
ROOT = ACTIVITY.parents[1]
ART = ACTIVITY / "art"
OUT = ART / "summary" / "journey.png"
IW, IH, GAP = 64, 48, 8
INK = (27, 42, 56, 255)


def assembled(layer: str | None) -> Image.Image:
    """The world board with every piece on its target, optionally with one evidence layer."""
    pieces = json.loads((ART / "pieces" / "pieces.json").read_text(encoding="utf8"))["pieces"]
    board = Image.open(ART / "sail" / "sea.png").convert("RGBA")
    for pid, p in pieces.items():
        x, y = p["target"]
        board.alpha_composite(Image.open(ART / "pieces" / f"{pid}-art.png").convert("RGBA"), (x, y))
        if layer and (ART / "pieces" / f"{pid}-{layer}.png").exists():
            board.alpha_composite(Image.open(ART / "pieces" / f"{pid}-{layer}.png").convert("RGBA"), (x, y))
    return board


def seafloor() -> Image.Image:
    data = json.loads((ART / "seafloor" / "seafloor.json").read_text(encoding="utf8"))
    board = Image.new("RGBA", (480, 360), (29, 52, 72, 255))
    for pid, p in data["pieces"].items():
        board.alpha_composite(Image.open(ART / "seafloor" / f"{pid}.png").convert("RGBA"), tuple(p["target"]))
    return board


def crop(img: Image.Image, cx: int, cy: int) -> Image.Image:
    return img.crop((cx - IW // 2, cy - IH // 2, cx + IW // 2, cy + IH // 2))


def main() -> int:
    icons = [
        crop(assembled(None), 252, 140),  # coastlines fitted
        crop(assembled("fossil"), 252, 162),  # fossil bands
        crop(assembled("glacier"), 250, 196),  # glacier arrows
        crop(assembled("mountain"), 242, 186),  # mountain lines
        crop(Image.open(ART / "scenes" / "debate.png").convert("RGBA"), 240, 96),  # the meeting hall board
        crop(seafloor(), 200, 120),  # stripes either side of the ridge
    ]
    strip = Image.new("RGBA", (len(icons) * IW + (len(icons) - 1) * GAP, IH), (0, 0, 0, 0))
    for i, ic in enumerate(icons):
        x = i * (IW + GAP)
        strip.alpha_composite(ic, (x, 0))
        px = strip.load()
        for k in range(IW):
            px[x + k, 0] = INK
            px[x + k, IH - 1] = INK
        for k in range(IH):
            px[x, k] = INK
            px[x + IW - 1, k] = INK
    OUT.parent.mkdir(parents=True, exist_ok=True)
    strip.save(OUT)
    print(f"{OUT}: {strip.size[0]}x{strip.size[1]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

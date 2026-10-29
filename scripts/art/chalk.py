"""칠판 분필 그림을 도트 크기로 줄인다(가는 분필 선이 칠판색에 묻히지 않게).

사용: python scripts/art/chalk.py <raw.png> <out.png> --size 300x200
- 원본 픽셀을 칠판·흰 분필·노란 분필·파란 분필 네 색 중 가까운 색으로 나눈다.
- 한 칸에서 분필 픽셀이 18% 넘으면 그 칸은 가장 많은 분필 색, 아니면 칠판색이 된다.
"""
from __future__ import annotations

import argparse
from collections import Counter

from PIL import Image

BOARD = (27, 66, 44)
CHALK = {"white": (232, 226, 206), "yellow": (236, 214, 128), "blue": (126, 186, 232)}


def nearest(c):
    cands = {"board": BOARD, **CHALK}
    return min(cands, key=lambda k: sum((a - b) ** 2 for a, b in zip(c, cands[k])))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("raw")
    ap.add_argument("out")
    ap.add_argument("--size", default="300x200")
    a = ap.parse_args()
    w, h = (int(n) for n in a.size.split("x"))
    img = Image.open(a.raw).convert("RGB")
    sw, sh = img.size
    px = img.load()
    out = Image.new("RGB", (w, h))
    op = out.load()
    for y in range(h):
        for x in range(w):
            x0, x1 = int(x * sw / w), int((x + 1) * sw / w)
            y0, y1 = int(y * sh / h), int((y + 1) * sh / h)
            votes = Counter(nearest(px[xx, yy]) for yy in range(y0, y1) for xx in range(x0, x1))
            total = sum(votes.values())
            chalk = [(n, k) for k, n in votes.items() if k != "board"]
            if chalk and sum(n for n, _ in chalk) / total > 0.18:
                op[x, y] = CHALK[max(chalk)[1]]
            else:
                op[x, y] = BOARD
    out.save(a.out)
    print(f"{a.out}: {w}x{h}, 4 colours")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

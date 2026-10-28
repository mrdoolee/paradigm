"""마젠타 배경 생성 원본에서 스프라이트를 잘라 도트 격자로 줄인다(sprite-gen extract 대신 쓰는 단순한 길).

사용: python scripts/art/cut.py <raw.png> <out-dir> --names down,up,left,right --cell 16x16 [--cols 1]
- 세로로 쌓인 줄(--names 수만큼)을 마젠타 틈으로 나눈다(--cols 2 이상이면 가로로도 나눈다).
- 한 칸의 그림 테두리 상자를 찾고, 원본 한 도트 크기(pitch)를 상자 크기/칸 크기로 잡아 칸마다 가장 많은 색을 고른다.
- 결과는 칸 크기 PNG(배경 투명), 아래쪽·가운데 정렬. 이름은 <out-dir>/<name>.png.
"""
from __future__ import annotations

import argparse
from collections import Counter
from pathlib import Path

from PIL import Image


def is_key(c) -> bool:
    r, g, b = c[:3]
    return r > 170 and b > 170 and g < 120


def bands(mask_rows: list[bool], n: int) -> list[tuple[int, int]]:
    """True=내용 있음. 내용 구간을 찾아 n개가 되도록 가장 가까운 것끼리 합친다."""
    segs: list[list[int]] = []
    for i, v in enumerate(mask_rows):
        if v and (not segs or segs[-1][1] != i):
            segs.append([i, i + 1])
        elif v:
            segs[-1][1] = i + 1
    segs = [s for s in segs if s[1] - s[0] >= 3]
    while len(segs) > n:
        gaps = [(segs[i + 1][0] - segs[i][1], i) for i in range(len(segs) - 1)]
        _, i = min(gaps)
        segs[i] = [segs[i][0], segs[i + 1][1]]
        del segs[i + 1]
    return [tuple(s) for s in segs]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("raw")
    ap.add_argument("out")
    ap.add_argument("--names", required=True)
    ap.add_argument("--cell", default="16x16")
    ap.add_argument("--cols", type=int, default=1)
    ap.add_argument("--fill", action="store_true", help="칸을 꽉 채우는 그림(타일): 상자를 칸 크기로 늘린다")
    a = ap.parse_args()
    names = a.names.split(",")
    cw, ch = (int(n) for n in a.cell.lower().split("x"))
    img = Image.open(a.raw).convert("RGB")
    w, h = img.size
    px = img.load()
    rows_n = (len(names) + a.cols - 1) // a.cols
    row_has = [sum(0 if is_key(px[x, y]) else 1 for x in range(0, w, 2)) > 2 for y in range(h)]
    row_bands = bands(row_has, rows_n)
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    k = 0
    for (y0, y1) in row_bands:
        col_has = [sum(0 if is_key(px[x, y]) else 1 for y in range(y0, y1, 2)) > 1 for x in range(w)]
        col_bands = bands(col_has, a.cols)
        for (x0, x1) in col_bands:
            if k >= len(names):
                break
            bw, bh = x1 - x0, y1 - y0
            pitch = max(bw / cw, bh / ch) if not a.fill else None
            cell = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
            cp = cell.load()
            if a.fill:
                sx, sy = bw / cw, bh / ch
                ox, oy = 0, 0
            else:
                sx = sy = pitch
                ox = (cw - bw / pitch) / 2
                oy = ch - bh / pitch
            for cy in range(ch):
                for cx in range(cw):
                    fx0 = x0 + (cx - ox) * sx
                    fy0 = y0 + (cy - oy) * sy
                    mx, my = fx0 + sx / 2, fy0 + sy / 2
                    if mx < x0 or my < y0 or mx >= x1 or my >= y1:
                        continue
                    votes: Counter = Counter()
                    for yy in range(int(fy0 + sy * 0.25), int(fy0 + sy * 0.75) + 1):
                        for xx in range(int(fx0 + sx * 0.25), int(fx0 + sx * 0.75) + 1):
                            if 0 <= xx < w and 0 <= yy < h:
                                c = px[xx, yy]
                                votes["key" if is_key(c) else (c[0] // 8 * 8, c[1] // 8 * 8, c[2] // 8 * 8)] += 1
                    if not votes:
                        continue
                    best, _ = votes.most_common(1)[0]
                    if best != "key":
                        cp[cx, cy] = (*best, 255)
            cell.save(out / f"{names[k]}.png")
            k += 1
    print(f"{k}/{len(names)} cut -> {out}")
    return 0 if k == len(names) else 1


if __name__ == "__main__":
    raise SystemExit(main())

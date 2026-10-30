"""정리 페이지 1쪽의 판 경계·지진·화산 지도를 공개 데이터로 그린다(같은 입력이면 같은 그림).

사용: python activities/continental-drift/tools/art/plates-map.py  ->  activities/continental-drift/art/summary/plates.png (400x160)
입력(git 밖 work/data/, 받는 곳은 sources.md MAP-*):
- ne_110m_admin_0_countries.geojson  땅(Natural Earth, 퍼블릭 도메인)
- pb2002.json                        판 경계(Bird 2003 PB2002, fraxen/tectonicplates, ODC-By 1.0)
- quakes.json                        지진 규모 6.5 이상 1975~2024(USGS, 퍼블릭 도메인)
- volc-all.json                      화산 위치(NOAA NCEI 화산 위치 DB, 미국 정부 자료)
투영: 경위도 그대로(경도 -180~180, 위도 84~-60), 1도 = 1.11픽셀.
"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw

ACTIVITY = Path(__file__).resolve().parents[2]  # activities/<id>
ROOT = ACTIVITY.parents[1]
GEO = ROOT / "work" / "data"
OUT = ACTIVITY / "art" / "summary" / "plates.png"
W, H = 400, 160
LAT_TOP, LAT_BOTTOM = 84.0, -60.0

SEA = (31, 59, 85)
LAND = (122, 140, 98)
LAND_EDGE = (92, 110, 74)
BOUNDARY = (217, 72, 59)
QUAKE = (255, 210, 63)
VOLCANO = (244, 236, 216)
VOLCANO_EDGE = (27, 42, 56)


def xy(lon: float, lat: float) -> tuple[float, float]:
    return (lon + 180) / 360 * W, (LAT_TOP - lat) / (LAT_TOP - LAT_BOTTOM) * H


def rings(geom):
    if geom["type"] == "Polygon":
        yield from geom["coordinates"][:1]
    elif geom["type"] == "MultiPolygon":
        for poly in geom["coordinates"]:
            yield poly[0]


def main() -> int:
    img = Image.new("RGB", (W, H), SEA)
    d = ImageDraw.Draw(img)
    countries = json.loads((GEO / "ne_110m_admin_0_countries.geojson").read_text(encoding="utf8"))
    for f in countries["features"]:
        for ring in rings(f["geometry"]):
            pts = [xy(lon, lat) for lon, lat in ring]
            d.polygon(pts, fill=LAND)
    # one-pixel coast: land pixels next to sea
    px = img.load()
    coast = [(x, y) for y in range(H) for x in range(W) if px[x, y] == LAND and any(
        0 <= x + dx < W and 0 <= y + dy < H and px[x + dx, y + dy] == SEA for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
    for x, y in coast:
        px[x, y] = LAND_EDGE

    plates = json.loads((GEO / "pb2002.json").read_text(encoding="utf8"))
    for f in plates["features"]:
        g = f["geometry"]
        lines = [g["coordinates"]] if g["type"] == "LineString" else g["coordinates"]
        for line in lines:
            for (a, b), (c, e) in zip(line, line[1:]):
                if abs(c - a) > 180:
                    continue  # crosses the date line
                d.line([xy(a, b), xy(c, e)], fill=BOUNDARY, width=1)

    volcanoes = json.loads((GEO / "volc-all.json").read_text(encoding="utf8"))
    for v in volcanoes:
        lat, lon = v.get("latitude"), v.get("longitude")
        if lat is None or lon is None or not (LAT_BOTTOM <= lat <= LAT_TOP):
            continue
        x, y = (int(c) for c in xy(lon, lat))
        # a small 3-pixel triangle: top, bottom-left, bottom-right
        for dx, dy in ((0, -1), (-1, 0), (1, 0)):
            if 0 <= x + dx < W and 0 <= y + dy < H:
                px[x + dx, y + dy] = VOLCANO
    # earthquakes last so they stay visible on top of the volcano marks
    quakes = json.loads((GEO / "quakes.json").read_text(encoding="utf8"))
    for f in quakes["features"]:
        lon, lat = f["geometry"]["coordinates"][:2]
        if LAT_BOTTOM <= lat <= LAT_TOP:
            x, y = xy(lon, lat)
            px[int(x) % W, min(H - 1, int(y))] = QUAKE

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT)
    print(f"{OUT}: {W}x{H}, plates {len(plates['features'])}, quakes {len(quakes['features'])}, volcanoes {len(volcanoes)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

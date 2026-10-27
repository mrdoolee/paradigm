# 그림 출처 — 대륙이동설

## 대륙 윤곽 마스크 (`pieces/`)

- **자료**: Natural Earth 1:110m Cultural Vectors, Admin 0 – Countries, v5.1.2
  (`https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_admin_0_countries.geojson`).
  퍼블릭 도메인(Natural Earth 이용 조건: "All versions of Natural Earth raster + vector map data are in the public domain").
- **만든 방법**: `scripts/map/build-masks.ts`(같은 입력이면 같은 결과).
  - 나라를 대륙 조각 8개로 묶는다(`scripts/map/groups.ts`). 다각형 무게중심이 묶음 상자 밖이면 뺀다(예: 프랑스령 기아나는 유라시아에서 빠진다). 인도 조각 = 인도·파키스탄·방글라데시·네팔·부탄·스리랑카.
  - 조각마다 자기 중심을 가운데로 한 람베르트 정적 방위 도법(1도 ≈ 1.1픽셀), 북쪽이 위. 6픽셀² 미만 섬은 버리고, 나라 경계 사이 40픽셀 이하 빈칸(호수)은 메운다.
  - `<id>.png` 흰 땅, `<id>-outline.png` 윤곽, `<id>-dotted.png` 점선 윤곽.
- **시작 자리**(`pieces.json`의 `start`): 조각 중심을 경위도 지도에 놓은 자리(퍼즐 영역 안으로 자름). 아프리카만 판게아 배치에 맞춰 아래로 옮겼다.
- **정답 자리**(`target`): 판게아 배치를 참고한 근사. 참고: USGS, *This Dynamic Earth* (Kious & Tilling, 1996) 판게아 그림(미국 정부 저작물, 퍼블릭 도메인). 회전 없이 옮기기만 하므로 실제 복원과 다르다. 대략 자리에서 시작해 "겹침은 적고 이웃 해안과 닿는 곳은 많게" 고르는 작은 탐색으로 정한 뒤 눈으로 확인했다(2026-10-27).

## 무늬 층 (`pieces/<id>-fossil|glacier|mountain.png`)

- `activities/continental-drift/patterns.json`(정답 배치 좌표)을 그려 조각마다 잘랐다. 근거는 `activities/continental-drift/sources.md`의 ID.

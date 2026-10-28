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

## 생성 그림 (2026-10-29)

- **모델**: OpenAI 이미지 API, 모델 `gpt-image-2.5-sunburst`(`.env`의 `OPENAI_IMAGE_MODEL`), `sprite-gen`(aldegad/sprite-gen, Apache-2.0)의 `gen` 명령으로 호출(`scripts/art/gen.py --raw-only`). 사용자 승인: 2026-10-29 "필요한 그림은 API 호출해서 알아서".
- **후처리**: 원본(마젠타 배경)은 git 밖 `tools/art-runs/continental-drift/`에 둔다.
  - 스프라이트·타일: `scripts/art/cut.py`(마젠타 틈으로 나누고, 원본 한 도트 크기를 재어 칸마다 가장 많은 색을 고름).
  - 배경·초상: `scripts/art/bg.py`(가운데 잘라 비율 맞춤 → 칸 평균으로 줄임 → 16색 이내).
  - 대륙: `cut.py --fill`로 마스크 크기에 맞춘 뒤 `gen.apply_mask`로 마스크 밖 픽셀을 지움(윤곽은 늘 Natural Earth 마스크).
- **프롬프트**: `art/prompts/*.txt`(같은 틀에 `--var`로 채움). 참고 이미지는 대륙 마스크(`pieces/<id>.png`)뿐. 실존 인물 사진은 쓰지 않았다.
- **사람**: 학생·한별·선장·과학자 셋은 모두 지어낸 모습이다. 실존 과학자(사니·데이비드·뒤 토이트)의 얼굴을 닮게 그리지 않았고 초상도 없다(진본·라이선스 미확인).

| 파일 | 원본 id | 호출 | 손질 |
|---|---|---|---|
| `chars/player-{down,up,left,right}.png` | player | 1 | cut 16×24 |
| `chars/{aide,port,india-scientist,australia-scientist,africa-scientist}-down.png` | people | 1 | cut 16×24 |
| `town/{grass,road,water,tree,wall,roof,pier,flowers}.png` | tiles | 1 | cut --fill 16×16 |
| `portrait/aide.png` | portrait-aide | 1 | bg 64×64, 16색, 배경 투명 |
| `minigames/dig.png` | dig-bg | 1 | bg 480×360, 16색 |
| `sail/ship.png`, `sail/survey-ship.png` | ships | 1 | cut 36×10, 72×24 |
| `pieces/<id>-art.png` (대륙 8개) | africa, south-america, … | 8 | cut --fill 마스크 크기, 마스크로 자름 |
| `sail/sea.png` | sail-sea | 1 | bg 480×360, 12색 (항해·퍼즐·마무리 바다) |
| `minigames/{scratch,strata}.png` | scratch-bg, strata-bg | 2 | bg 480×360, 16색 |
| `scenes/{debate,title}.png` | debate-bg, title-bg | 2 | bg 480×360, 16색 |
| (쓰지 않음) | survey-bg | 1 | 해령을 눈 덮인 물 위 산맥처럼 그려 사실과 어긋남 → 코드로 그린 단면도를 씀 |

생성 호출 합계: 20회 (견본 5 + 대량 15), 기록 `tools/art-runs/calls.jsonl`.

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

## 지역 마을 타일과 마을 사람 (2026-10-29, 두 번째)

- 같은 모델·도구·후처리. 사용자 요청: "지역 특성에 맞게 마을 배경", "빈 공간이 많으니 NPC". 참고 이미지는 앞의 `tiles`·`people` 원본(같은 그림체 유지).
- 프롬프트: `art/prompts/tiles-region.txt`(마을마다 `--var place=… list=…`), `art/prompts/folk.txt`.
- 마을 사람은 모두 지어낸 1920년대 주민이다. 실존 인물을 닮게 그리지 않았고, 희화화하지 않도록 프롬프트에 적었다.
- 동물이 사람만큼 커지지 않도록 `cut.py --pitch 9.2`로 모든 칸의 도트 크기를 같게 잘랐다.
- 새 바다 타일 4장은 16×16으로 줄이면 점 무늬로 보여 쓰지 않고, 앞의 `town/water.png`를 모든 마을이 함께 쓴다.

| 파일 | 원본 id | 호출 | 손질 |
|---|---|---|---|
| `town/lab/{ground,ground2,road,tree,wall,roof,pier,lamp,bench,barrels,hedge}.png` | town-lab | 1 | cut --fill 16×16, 3열 |
| `town/india/{ground,ground2,road,tree,wall,roof,pier,palm,well,stall,pots}.png` | town-india | 1 | 같음 |
| `town/australia/{ground,ground2,road,tree,wall,roof,pier,windmill,tank,boulder,fence}.png` | town-australia | 1 | 같음 |
| `town/africa/{ground,ground2,road,tree,wall,roof,pier,cliff,vines,gable,rocks}.png` | town-africa | 1 | 같음 |
| `chars/folk-{postman,fisher,paper,cat,fruit,pupil,peacock,water}-down.png` | folk-a | 1 | cut 16×24, 2열, --pitch 9.2 |
| `chars/folk-{farmer,girl,roo,kooka,flower,capefisher,dassie,gull}-down.png` | folk-b | 1 | 같음 |

생성 호출 합계(누계): 26회 (앞 20 + 이번 6). 원본의 8번(놋 주전자를 든 사람)은 사실 확인 뒤 "물 장수"로 쓴다(1920년대 인도 시골의 차 장수는 확인 못 함).

## 땅다리 칠판 그림 (2026-10-29, 세 번째)

- 사용자 요청: "땅다리로 건넌다는 설명에서는 이미지를 그려서 이야기". 학회 장면에서 반대 쪽 설명이 나올 때 대화창 위에 띄운다.
- 생성 1회(`art/prompts/landbridge.txt`, 3:2, 참고 이미지 없음): 칠판에 분필로 그린 남아메리카·아프리카(지금 자리), 그 사이 땅다리와 메소사우루스 두 마리. 대륙 윤곽은 분필 스케치라 정확한 지도가 아니다(퍼즐 대륙은 여전히 Natural Earth 마스크).
- 손질: `scripts/art/chalk.py`로 300×200, 4색(칠판·흰·노랑·파랑) — 칸에서 분필이 18% 넘으면 분필색이라 가는 선이 묻히지 않는다. 양쪽 해안의 나무 표시 하나씩을 메소사우루스 화석 표시(흰 분필)로 바꿨다(F-MESOSAURUS: 브라질·아프리카 남부).
- `scenes/landbridge-sunk.png`: 같은 그림에서 땅다리와 동물을 지우고 땅다리 자리를 파란 점선으로 남기고, 끊긴 해안선을 이었다(근거 O-BRIDGE: 반대 쪽은 가라앉은 땅다리로 설명).

| 파일 | 원본 id | 호출 | 손질 |
|---|---|---|---|
| `scenes/landbridge.png`, `scenes/landbridge-sunk.png` | landbridge | 1 | chalk 300×200 4색, 화석 표시, 가라앉은 판은 손 편집 |

생성 호출 합계(누계): 27회.

## 마을 사람·선장·학회 참석자 초상 (2026-10-30)

- 사용자 요청: "npc들 얼굴 이미지를 각각 만들어서 … 각 나라에 맞게". 생성 2회(`art/prompts/portraits.txt`, 3:2, 한 장에 6명). 참고 이미지: 한별 초상 원본(그림체), 마을 사람 걷는 그림 원본(옷차림).
- 모두 지어낸 인물(가상 인물). 실존 과학자(사니·데이비드·뒤 토이트)는 진본 초상·라이선스를 확인하지 못해 여전히 그리지 않는다. 동물은 서술(narr)로 말하므로 초상이 없다.
- 지역: 연구실 마을은 유럽 사람, 인도 마을은 인도 사람, 오스트레일리아 마을은 1920년대 농촌 정착민, 케이프는 케이프 말레이 꽃 장수와 남아프리카 어부, 학회 참석자는 미국 지질학자.
- 손질: 마젠타 틈으로 6칸을 자르고 `bg.py --size 64x64 --colors 16`, 테두리에서 이어진 배경색을 투명으로(한별 초상과 같게).

| 파일 | 원본 id | 호출 | 손질 |
|---|---|---|---|
| `portrait/{captain,postman,fisher,paper,fruit,pupil}.png` | portraits-a | 1 | 자르기, bg 64×64 16색, 배경 투명 |
| `portrait/{water,farmer,girl,flower,capefisher,member}.png` | portraits-b | 1 | 같음 |

생성 호출 합계(누계): 29회.
- `chars/folk-flower-down.png`: 초상(케이프 말레이 꽃 장수)과 맞도록 얼굴·손 피부색 33픽셀을 손으로 바꿨다(2026-10-30, 생성 없음).

## 건물 타일 (2026-10-30)

- 사용자 지적: 시드니·케이프 집이 "깨져 보임"(벽 타일이 테두리 있는 작은 집 한 채로 그려져 이어 붙이면 상자가 반복됨). 마을마다 이음매 없는 건물 타일 6종을 다시 생성(4회, `art/prompts/build-tiles.txt`, 참고: 각 마을 타일 원본). 3×3 이어 붙여 이음매 확인 뒤 사용.

| 파일 | 원본 id | 호출 | 손질 |
|---|---|---|---|
| `town/<마을>/{roof,eave,wall,window,door,wall2}.png` (lab·india·australia·africa) | build-<마을> | 4 | cut --fill 16×16, 3열 |

생성 호출 합계(누계): 33회.

## 땅다리 그림 다시 (2026-10-30, 게임 세계지도 도트 스타일)

- 사용자 요청: "게임 세계지도 도트 스타일로". 앞의 칠판 그림(`landbridge.txt`, chalk.py)을 대신한다.
- 바탕은 코드로 합성: 항해 바다(`sail/sea.png`)에 대륙 그림(`pieces/<id>-art.png`, Natural Earth 마스크로 자른 것)과 외곽선을 오늘 위치에 놓고 (134,85)–(284,185)를 잘라 2배.
- 생성 1회(`art/prompts/landbridge-map.txt`, 참고: 이 바탕을 4배로 키운 그림): 땅다리와 메소사우루스 두 마리. 생성 그림의 대륙 윤곽은 조금 달라져서 쓰지 않고, **바탕에서 바다였던 칸에 생긴 땅다리·동물 색만** 바탕 위에 옮겼다(대륙 윤곽은 늘 마스크).
- `scenes/landbridge-sunk.png`: 같은 바탕에 땅다리 자리를 파란 점선으로만 남겼다(생성 없음).
- 두 그림 모두 메소사우루스 화석 표시(작은 도마뱀 모양)를 파라나(브라질)와 카루(남아프리카)에 찍었다(F-MESOSAURUS, S-DUTOIT-1927).

| 파일 | 원본 id | 호출 | 손질 |
|---|---|---|---|
| `scenes/landbridge.png`, `scenes/landbridge-sunk.png` | landbridge-map | 1 | 바탕 합성, 땅다리 색만 옮김, 점선판, 화석 표시 |

생성 호출 합계(누계): 34회.

## 실존 과학자 초상 (2026-10-30)

- 규칙(CLAUDE.md): 퍼블릭 도메인 원본을 참고해서만, "원작 아님" 표시, 희화화 금지, 진본이 없으면 그리지 않는다.
- **에지워스 데이비드** `portrait/david.png`: 참고 사진 2장(git 밖 `tools/art-runs/continental-drift/ref/`)
  - J.H. Newman, 1898, 뉴사우스웨일스 주립도서관 ML 524 — 위키미디어 공용 "PD-Art (PD-Australia)"
  - 『The Days of a Man』(D.S. Jordan, 1922, 미국 World Book Co.) 수록 초상(E. Spencer Macky) — 공용 "PD-US"
  - 생성 1회(`art/prompts/portrait-real.txt`, 참고: 마을 사람 초상 시트(그림체) + 위 사진 2장). 1920년 무렵 60대 모습. bg 64×64 15색, 배경 투명. 정리 페이지에 "원작 아님"을 적었다.
- **비르발 사니·알렉산더 뒤 토이트**: 퍼블릭 도메인 원본 사진을 찾지 못해 그리지 않았다(공용에 사니는 2025년 흉상 사진 CC BY-SA뿐, 뒤 토이트는 초상 없음).

생성 호출 합계(누계): 35회.

## 정리 페이지 그림 (2026-10-30)

| 파일 | 만든 방법 | 호출 |
|---|---|---|
| `summary/plates.png` (400×160) | 공개 데이터로 코드로 그림: `scripts/art/plates-map.py` (sources.md MAP-PLATES·MAP-QUAKES·MAP-VOLCANOES·MAP-LAND). 선=판 경계, 노란 점=지진, 흰 세모=화산, 범례는 원고 글 | 0 |
| `summary/journey.png` (424×48) | 게임 그림을 잘라 이음: `scripts/art/journey-icons.py` (해안선·화석·빙하·산맥·학회·줄무늬) | 0 |
| `summary/section.png` (240×144) | 생성 1회 `art/prompts/summary-section.txt`(참고: 해령 장면 화면) → bg 16색. 해령에서 판이 벌어지고 해구에서 가라앉음, 화산 | 1 |
| `summary/mantle.png` (240×144) | 생성 1회 `art/prompts/summary-mantle.txt` → bg 16색. 맨틀의 느린 흐름(가운데 올라오고 양옆 가라앉음) | 1 |

- 생성 그림은 맨틀을 용암처럼 주황으로 칠했다. 맨틀이 액체라는 오해를 막으려고 설명 글에 "맨틀은 대부분 고체지만 아주 천천히 흘러요(단순화한 그림)"를 붙였다.

생성 호출 합계(누계): 37회.

# CLAUDE.md

이 저장소에서 Claude Code가 따를 안내.

## 무엇을 만드나

**패러다임: 과학자의 시간** — 과학사 사례로 **과학의 본성(NOS)** 을 겪어 보는 짧은 웹 게임 활동 모음. 대상은 한국 중·고등학생, 혼자 하는 자율 학습이 기본.

- 프로젝트 이름은 `src/engine/strings.ts`의 `SITE_TITLE` 한 곳(목록 페이지·모든 게임 제목 화면·브라우저 탭). 한 줄 소개 `SITE_TAGLINE`("과학사로 겪는 과학의 본성").
- **게임마다 서브 네임**을 짓는다. 원고의 `@line-title`(제목 화면 큰 글)·`@line-card-title`(목록 카드)에 쓰고, 탐구 질문은 `@line-card-desc` 첫 문장에 둔다. 카드 아래 작은 정보는 `@line-card-meta`(예: 약 20분 · 혼자 하기 · 성취기준). 탭 제목은 "서브 네임 · 프로젝트 이름".

- 한 활동은 **10~15분**(대륙이동설은 사용자 결정으로 **20분 이내**, 증거 수집 RPG). **기록이 아니라 경험이 목적**이다. 결과를 수집하지 않는다(교사 화면·시트 연동·저장 없음).
- **타이핑 없이** 끌기·고르기·누르기로 진행한다. 학생이 흐름을 따라가면 NOS를 느끼게 하고, 가상 조수가 짧게 짚어 준다. 끝나면 학생용 정리 페이지(과학 개념 + 이 활동의 NOS 뜻).
- 카드 획득, "렌즈" 같은 장치 이름은 쓰지 않는다.
- 첫 활동: **대륙이동설 — 판게아의 기억** (`activities/continental-drift/`). 다음: 플로지스톤을 같은 방식으로 다시(서브 네임은 그때 정한다).
- 설계: `docs/superpowers/specs/2026-10-27-continental-drift-design.md`
- 참고용 이전 저장소(코드는 가져오지 않음): `C:\Users\mrdoo\Documents\nos_game_project`

## 교육·사료 규칙 (반드시)

- **정답 판정은 사실에만** 건다. 과학자의 해석·학생의 선택에는 정답을 매기지 않는다.
- **과학사 신화를 만들지 않는다.** 결정적 실험 하나로 끝났다, 고독한 천재, 출처 불명 일화 금지. 진 쪽의 합리적 근거와 이긴 쪽의 한계를 함께 보인다.
- 역사 서술은 검토 에이전트로 **사실 확인**한다. 1차 사료 인용과 각색을 구분한다.
- **동료 인물(가상 포함)** 을 둔다. 가상 인물은 화면에 "가상 인물"로 표시하고 실존 인물 행적과 섞지 않는다. 실존 인물은 "사료 근거 / 사료 각색".
- 마지막에 **현재 과학의 설명으로 정리**하되 잠정성(지금 증거로 본 가장 나은 설명)을 유지한다.
- 실존 인물 초상: 퍼블릭 도메인 원본 참고 64×64 도트, "원작 아님" 표시, 희화화 금지, 진본이 없으면 그리지 않는다. 출처는 `activities/<id>/art/PROVENANCE.md`.
- 성취기준 코드는 확인된 것만(curriculum-kr-secondary 도구). 대륙이동설: [9과09-05].
- 게임 글은 **`activities/<id>/script.md` 한 곳**. 코드에 문장을 넣지 않는다. 한국어는 `humanize-korean`으로 점검한다.
- 포켓몬스터의 이름·그림·글꼴·음악, escape-kit 코드·에셋을 쓰지 않는다. 고전 RPG는 형식만 참고.

## 화면 규칙 (대화창이 화면을 밀지 않게)

- 게임 전체를 **480×360 가상 화면** 하나에 그리고 **정수 배율**(보통 2배)로 보인다. `pixelArt: true`. 게임 UI에 HTML을 쓰지 않는다.
- **마을(걷는 지도) 기준**: 타일은 16×16으로 그리고 마을은 **2배(32px)로 표시**, 화면 한 장 = **15×10칸**(안내 띠 아래). 지도가 더 크면 카메라가 캐릭터를 따라가고 지도 밖은 막는다. 목표(과학자·현장 등)는 대화창에 가리지 않는 위 7줄에. 집은 건물 타일(지붕·처마·벽·창·문)로 쌓는다.
- **대화창**은 대화할 때만, 아래쪽 **고정 자리·고정 크기**. 넘치면 쪽을 넘긴다(▼). 세계 위에 겹치는 **UI 장면**이라 세계는 움직이지 않는다.
- 선택지는 대화창 위 오른쪽 작은 창. 퍼즐 중 안내는 **위쪽 띠 한 줄**(대화 중엔 숨김), 주된 안내는 그림.
- 도트 그림, 고전 RPG 느낌. 글꼴 갈무리(Galmuri11) 2배. 효과음은 처음엔 꺼짐, 배경음악 없음.
- 기기: PC 1280×800, 태블릿 가로 1024×768(터치). 휴대폰은 맞추지 않는다.
- 그림은 OpenAI 이미지 API로 생성(`nos-art`). 대륙은 실제 지도 윤곽 기반.

## 기술과 명령어

Phaser 4 + TypeScript + Vite. 배포(Vercel)·push는 사용자 승인 뒤.

| 명령 | 설명 |
|---|---|
| `bash .claude/skills/nos-check/scripts/check.sh [--shots] [--e2e]` | 규칙·타입·테스트·원고 검사 한 번에 |
| `npm run dev` | 개발 서버 (Claude Code에서는 Browser 도구의 preview_start) |
| `npm run typecheck` / `npm test` / `npm run check:script` / `npm run shots` / `npm run e2e` | 타입·단위·원고·스크린샷·끝까지 플레이 (e2e 서버 포트 5191) |
| `npm run build:logo` | 첫 화면 제목 로고(`src/home/logo-*.png`)를 갈무리 도트 글꼴(BDF, OFL)로 다시 만들기 — `SITE_TITLE`을 바꾸면 돌린다 |
| `npm run build:masks` / `build:sea` / `build:stripes` | 대륙 마스크·항해 바다 칸·해저 줄무늬 다시 만들기 (도구는 `activities/continental-drift/tools/`) |

### 폴더 구조

```
src/engine/        모든 게임 공통: 화면·배율, UI 장면(대화창·선택지·안내 띠), 입력, 끌어 맞추기 / script/ 원고 읽기·검사 / strings.ts 플랫폼 공통 문구
src/rpg/           고전 RPG 틀: 걷기, 칸 길찾기, 정리 창
src/home/          첫 화면: 생성한 도트 제목 로고, 게임 카드(위아래로 나열, 고르기 강조·방향키), 제작자 모달
                   카드 = 원고 @line-card-title·desc·meta + 표지 art/cover.png(없으면 art/scenes/title.png, 240×180 가운데 1배)
activities/<id>/   한 주제의 모든 것: index.html(주소 /<id>/), script.md, sources.md, 데이터, art/,
                   game/(이 주제 장면·main.ts·anchors.ts), tools/(전용 생성 도구), tests/unit·e2e/
scripts/ tests/    공통 도구·공통 테스트
work/              git 밖 작업 폴더: ledger/<id>/(장부·검토 결과), art-runs/(그림 생성 원본), data/(내려받은 자료), debug/
```

- 주제 코드는 공통 부품을 `@engine/…`, `@rpg/…`로 가져온다. 새 주제는 `activities/<id>/`에 같은 구조를 만들면 페이지·테스트·원고 검사가 스스로 찾는다.
- 마을·제목·항해 장면은 아직 대륙이동설 전용이다. 두 번째 주제를 설계할 때 일반화해 `src/rpg`로 옮긴다.

## 하네스: NOS 활동 만들기

**목표:** 설계·계획대로 활동을 단계별로 만들고, 단계 끝마다 원고·사료 검토와 플레이 검토를 한 번씩 받는다. 가볍고 빠르게.

**호출 조건:** 활동을 만들거나 이어 가는 작업은 `nos-build` 스킬을 쓴다. 검증만은 `nos-check`, 원고는 `nos-script`, 그림은 `nos-art`, 외부 게임 개발 스킬을 쓸 때는 `nos-gamedev`를 먼저 읽는다. 설계는 `superpowers:brainstorming`, 계획은 `superpowers:writing-plans`. 단순 질문에는 직접 답해도 된다.

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
| --- | --- | --- | --- |
| 2026-10-27 | Harness v2로 처음 구성 (에이전트 3, 프로젝트 스킬 5, 외부 스킬 9, PostToolUse 규칙 훅) | 전체 | 이전 저장소(긴 RPG, 무거운 검토 파이프라인)를 접고 10~15분 경험형 활동으로 새로 시작 |
| 2026-10-31 | 폴더 구조를 src/engine·src/rpg·activities/<id>/(game·tools·tests)·work/로, 장부를 work/ledger/<id>/로. 규칙 검사·nos-build·nos-check·nos-art·nos-script·검토 에이전트 경로 갱신 | 구조·하네스 | 고전 RPG 형태로 주제를 계속 더하기 위해 |

## 문서 위치

| 파일 | 내용 |
|---|---|
| `docs/superpowers/specs/2026-10-27-continental-drift-design.md` | 대륙이동설 활동 + 저장소·하네스 설계 (승인됨) |
| `docs/superpowers/specs/2026-10-28-continental-drift-rpg-design.md` | 대륙이동설을 증거 수집 RPG로(마을·항구·항해·미니게임), 위 설계를 바꾼 부분 (승인됨) |
| `docs/superpowers/plans/2026-10-29-continental-drift-rpg.md` | 위 RPG 설계의 구현 계획 |
| `docs/superpowers/plans/2026-10-30-continental-drift-polish.md` | 대륙이동설 마무리 다듬기 계획 |
| `docs/superpowers/plans/2026-10-31-folder-structure.md` | 폴더 구조 정리(engine·rpg·주제 폴더·work/) 계획 |
| `docs/research/2026-10-01-hos-nos-case-list.md` | 과학사 사례 24개의 NOS 분석·평가 (이전 저장소에서 가져옴) |
| `docs/research/2026-10-14-classic-rpg-ui-ux-patterns.md` | 고전 도트 RPG 화면·조작 규칙 조사 (이전 저장소에서 가져옴, 코드 경로는 이전 저장소 기준) |

# 대륙이동설 활동 구현 계획

> **For agentic workers:** 이 저장소에서는 `nos-build` 스킬이 이 계획을 실행한다(CLAUDE.md). nos-build가 없을 때만 superpowers:executing-plans 또는 superpowers:subagent-driven-development로 태스크 단위 실행. 단계는 체크박스(`- [ ]`)로 추적한다.

**Goal:** 중학생이 14분 안팎에 끝까지 하며 대륙이동설에서 판구조론까지를 겪는 도트 웹 게임(`/continental-drift`)과 정리 페이지(`/continental-drift/about/`)를 만들고, 다음 활동이 다시 쓸 공통 부품(고정 화면, UI 장면, 끌어 맞추기, 원고 파서·검사)을 남긴다.

**Architecture:** Phaser 4 게임 하나가 480×360 가상 화면에 모든 것을 그리고 정수 배율로 키운다. 대화·선택지·안내 띠는 늘 위에 있는 `Ui` 장면이 맡고, 세계 장면(Title·Puzzle·Debate·Ending)은 `await ui.say(앵커)` 식으로 흐름을 짠다. 모든 게임 글은 `activities/continental-drift/script.md`에서 오고, 같은 글자 폭 표·줄 바꿈 함수를 원고 검사(Node)와 실행(브라우저)이 함께 쓴다. 대륙은 Natural Earth 해안선으로 만든 윤곽 마스크 PNG이며, 회색 상자부터 최종 그림까지 같은 좌표를 쓴다.

**Tech Stack:** Phaser 4.2 · TypeScript · Vite(다중 페이지) · Vitest · Playwright(Chromium) · tsx · galmuri(Galmuri11) · opentype.js(글자 폭 표 생성) · d3-geo + pngjs(마스크 생성) · marked(정리 페이지). 2026-10-27 확인 버전: phaser 4.2.1, vite 8.3.5, vitest 5.0.5, @playwright/test 1.64.1, galmuri 2.40.3, opentype.js 2.0.0. TypeScript는 `~5.9`로 고정(7.x 네이티브 tsc는 쓰지 않는다).

**Spec:** `docs/superpowers/specs/2026-10-27-continental-drift-design.md`

## Global Constraints

- 한 활동 10~15분, 목표 14분 안팎. 원고 대화 총량 **45쪽 이하**(한 쪽 약 6초).
- 결과 수집·저장·이어하기·교사 화면·시트 연동 없음. 새로고침하면 처음부터.
- 타이핑 없음. 끌기·고르기·누르기만. 회전 없음(끌기만).
- 가상 화면 **480×360**, 배율 = `max(1, min(floor(W/480), floor(H/360)))`, `pixelArt: true`, `Scale.FIT` 소수 배율 금지. 남는 곳은 테두리 색. 게임 UI에 HTML 금지(`this.add.dom`, `document.createElement` in `src/game/**`).
- 대화창: 아래 고정 **464×104**, 초상 64×64 + 이름표 + 본문. 넘치면 쪽 넘김(▼, 쪽 번호). 선택지: 대화창 위 오른쪽, 커서 ▶. 안내 띠: 위쪽 높이 **22**, 왼쪽 할 일·오른쪽 진행 점 ●○○, **대화 중 숨김**. 퍼즐 핵심은 위쪽 약 2/3(y 22~240).
- 글꼴 Galmuri11(OFL, npm `galmuri`)을 웹 글꼴로 불러 캔버스 글자로. **판단:** 설계 문서의 "11px"은 글꼴 이름이고, 글꼴이 설계된 크기는 12px다(galmuri README). 가상 화면 12px → 2배 24px.
- 게임 글은 전부 `activities/<id>/script.md`. 코드 속 한국어 금지(테스트·`src/strings.ts`·`scripts/` 제외). `Math.random` 금지. 이모지 금지(▶◀▼▲ 허용). "렌즈", "카드 획득" 금지.
- 정답 판정은 사실(퍼즐 자리)에만. 틀린 자리 표시 없음. ④ 선택지는 무엇을 골라도 다음으로.
- 가상 인물은 "가상 인물", 베게너는 "사료 각색" 표시. 실존 초상은 퍼블릭 도메인 진본이 있을 때만 64×64 도트 + "원작 아님".
- 성취기준은 [9과09-05]만.
- 기기: PC 1280×800, 태블릿 가로 1024×768(터치). 휴대폰 제외. 입력: 마우스·터치 끌기, 키보드(방향키·Enter·Esc·Tab).
- 효과음 3개(대화 넘김·착 붙음·단계 완료), 처음엔 꺼짐, 끄기/켜기 버튼. 배경음악 없음.
- 그림 키는 루트 `.env`의 `OPENAI_API_KEY`, 모델 `OPENAI_IMAGE_MODEL`. 키 값을 명령줄·로그·대화에 쓰지 않는다. 생성 원본은 git 제외.
- push·Vercel 배포는 사용자 승인 뒤. 커밋 메시지 끝: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`(실제 모델명).
- 매 태스크 끝 `bash .claude/skills/nos-check/scripts/check.sh` 통과 후 커밋. 화면을 바꾼 태스크는 `--shots`까지.

## Review Focus

1. **실제 1280×800 노트북 창**(브라우저 테두리 빼면 약 1280×690) → 배율 1로 내려가고 잘림·스크롤 없이 가운데 보여야 한다. 테스트: Task 1 `pickZoom(1280, 690) === 1`, Task 17 Playwright 1280×690에서 스크롤 없음 확인.
2. **플레이 중 창 크기 바꿈·태블릿 회전** → 배율만 다시 계산되고 진행 상태(장면·단계·대륙 자리)는 그대로. 테스트: Task 17 e2e에서 퍼즐 중 viewport 변경 후 `__nos.state()` 비교.
3. **원고에 Galmuri11에 없는 글자**(“ ” — · 같은 문장 부호, 드문 한자) → 화면에 빈 네모가 뜨기 전에 원고 검사가 줄 번호와 글자로 막는다. 테스트: Task 7 `MISSING_GLYPH`.
4. **빠른 연타·끌기 도중 대화 시작** → 쪽을 건너뛰거나 선택이 두 번 처리되지 않고, 끌던 대륙이 대화 뒤에서 움직이거나 퍼즐 영역 밖에 버려지지 않는다. 테스트: Task 3 `clampToArea`, Task 8 `say` 한 번 열린 동안 두 번째 `say`는 대기열, 같은 프레임 두 번 `confirm`은 한 쪽만 넘김.
5. **캔버스 실제 글자 폭 ≠ 글자 폭 표** → 실행 중 줄이 대화창 밖으로 넘친다. 테스트: Task 9 e2e에서 `__nos.measureCanvas(s)`와 `galmuriMeasure(s)`가 견본 문장 20개에서 같다.

---

## 파일 구조

```
package.json, tsconfig.json, vite.config.ts, playwright.config.ts
index.html                              # / 활동 카드 목록
continental-drift/index.html            # 게임 페이지
continental-drift/about/index.html      # 정리 페이지
public/sfx/{page,snap,done}.wav         # 스크립트로 합성한 효과음
src/strings.ts                          # 플랫폼 공통 문구(규칙 검사 허용 파일), 원고 표시 이름 목록
src/home/main.ts                        # 카드 목록 렌더(원고의 line-card-* 사용)
src/about/main.ts                       # page-about 마크다운 → HTML
src/script/                             # 원고 공통 부품(브라우저·Node 공용, Phaser 없음)
  galmuri11-widths.json                 # 생성물: 글자 폭 표
  measure.ts  wrap.ts  parse.ts  check.ts
src/game/common/                        # 게임 공통 부품
  screen.ts  layout.ts  actions.ts  snap.ts  DragBoard.ts  UiScene.ts  debug.ts  boot.ts
src/game/continental-drift/             # 이 활동의 장면
  main.ts  anchors.ts  scenes/{BootScene,TitleScene,PuzzleScene,DebateScene,EndingScene}.ts
activities/continental-drift/
  script.md  sources.md  puzzle.json  patterns.json
  art/STYLE.md  art/palette.json  art/PROVENANCE.md  art/pieces/*.png  art/pieces/pieces.json  art/*.png
scripts/
  check-script.ts                       # check:script CLI(한국어 오류 메시지)
  font/build-widths.ts                  # Galmuri11.ttf → galmuri11-widths.json
  map/{groups.ts,raster.ts,build-masks.ts}
  sfx/make-sfx.ts
  art/gen.py                            # 단계 E, sprite-gen 래퍼
tests/unit/*.test.ts   tests/e2e/{helpers.ts,play.spec.ts,shots.spec.ts}
```

**판단:** 실존·가상 표시 이름(가상 인물/사료 근거/사료 각색)과 `등장인물` 제목 같은 형식 단어는 `src/strings.ts`에 둔다(규칙 검사가 허용하는 유일한 코드 파일). 활동 장면 코드는 HTML 금지 검사를 받도록 `src/game/` 아래에 둔다.

---

## 단계 A — 준비

### Task 1: 저장소 뼈대와 고정 화면

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `playwright.config.ts`, `index.html`, `continental-drift/index.html`, `continental-drift/about/index.html`, `src/strings.ts`, `src/game/common/screen.ts`, `src/game/common/boot.ts`, `src/game/continental-drift/main.ts`, `tests/unit/screen.test.ts`, `tests/e2e/smoke.spec.ts`
- Modify: `.gitignore` (`tools/geo/` 추가), `.claude/skills/nos-art/SKILL.md` (출처 파일 경로를 `activities/<id>/art/PROVENANCE.md`로 통일)

**Interfaces:**
- Produces:
  - `screen.ts`: `VIEW_W = 480`, `VIEW_H = 360`, `pickZoom(innerW: number, innerH: number): number`
  - `boot.ts`: `startGame(scenes: Phaser.Types.Scenes.SceneType[], parent: HTMLElement): Promise<Phaser.Game>` — `document.fonts.load('12px Galmuri11')`를 기다린 뒤 `new Phaser.Game({ type: AUTO, width: 480, height: 360, pixelArt: true, backgroundColor, scale: { mode: NONE, zoom: pickZoom(...) }, parent, scene })`. `resize` 때 `game.scale.setZoom(pickZoom(...))`.
  - npm scripts: `dev`, `build`, `preview`, `typecheck`(`tsc --noEmit`), `test`(`vitest run`), `shots`(`playwright test --grep @shots`), `e2e`(`playwright test --grep @e2e`).
  - `playwright.config.ts`: Chromium만, projects `desktop`(1280×800), `tablet`(1024×768, `hasTouch: true`), webServer `vite --port 5174 --strictPort`, baseURL `http://localhost:5174`.

- [ ] **Step 1: 의존성 설치**

`npm init -y` 후 `npm i phaser@4.2.1 galmuri@2.40.3 marked` / `npm i -D typescript@~5.9 vite vitest @playwright/test tsx opentype.js d3-geo pngjs @types/d3-geo @types/pngjs @types/node` / `npx playwright install chromium`. `"type": "module"`.

- [ ] **Step 2: 실패하는 테스트**

```ts
// tests/unit/screen.test.ts
import { pickZoom } from '../../src/game/common/screen';
test('PC 1280x800과 태블릿 1024x768은 2배', () => {
  expect(pickZoom(1280, 800)).toBe(2);
  expect(pickZoom(1024, 768)).toBe(2);
});
test('2배가 안 들어가면 1배, 더 작아도 1배', () => {
  expect(pickZoom(1280, 690)).toBe(1);
  expect(pickZoom(959, 720)).toBe(1);
  expect(pickZoom(300, 200)).toBe(1);
});
test('큰 화면은 정수 배율로 커진다', () => {
  expect(pickZoom(1920, 1080)).toBe(3);
});
```

- [ ] **Step 3: `npm test` → FAIL(모듈 없음)**

- [ ] **Step 4: 구현**

`screen.ts`, `boot.ts`, 세 HTML(각 페이지 `<main>` 또는 게임 부모 `<div id="game">`, body는 flex 가운데 정렬·`overflow:hidden`·테두리 색 배경). `vite.config.ts`는 `build.rollupOptions.input`에 세 HTML. 게임 페이지는 `import 'galmuri/dist/galmuri.css'` 후 `startGame([빈 장면 하나])`. 문서 제목 같은 플랫폼 문구는 `src/strings.ts`.

- [ ] **Step 5: `npm test`·`npm run typecheck` → PASS**

- [ ] **Step 6: 연기 e2e**

`tests/e2e/smoke.spec.ts` (`@e2e` 태그): `/continental-drift/` 열면 canvas 크기가 `desktop`·`tablet` 모두 960×720, `document.documentElement.scrollWidth <= innerWidth` 그리고 `scrollHeight <= innerHeight`. `npm run e2e` → PASS.

- [ ] **Step 7: `check.sh` 통과 후 커밋** — `chore: Vite+Phaser 뼈대와 480x360 정수 배율 화면`

---

## 단계 B — 회색 상자 프로토타입 (원고 없음)

질문 하나: **대륙 끌어 맞추기가 재미있고 시간 안에 들어가나?** 화면에 글자는 없다(진행 점·테두리·점선만).

### Task 2: 대륙 윤곽 마스크 생성

**Files:**
- Create: `scripts/map/groups.ts`, `scripts/map/raster.ts`, `scripts/map/build-masks.ts`, `tests/unit/raster.test.ts`, `activities/continental-drift/art/pieces/*.png`, `activities/continental-drift/art/pieces/pieces.json`, `activities/continental-drift/art/PROVENANCE.md`
- Modify: `package.json` (`build:masks`)

**Interfaces:**
- Produces:
  - `raster.ts`: `rasterizeRings(rings: [number, number][][], w: number, h: number): Uint8Array` (짝홀 규칙, 픽셀 중심 표본, 1=땅), `outline(mask: Uint8Array, w: number, h: number): Uint8Array` (땅이면서 4방향 이웃 중 하나가 바다·가장자리), `dotted(ring: Uint8Array, w: number, h: number): Uint8Array` (`(x + y) % 2 === 0`인 윤곽 픽셀만)
  - 파일: 대륙마다 `<id>.png`(흰 땅·투명 바다), `<id>-outline.png`, `<id>-dotted.png`
  - `pieces.json`: `{ "pxPerDeg": number, "pieces": { [id]: { "w": number, "h": number, "start": [x, y], "target": [x, y], "fixed"?: true } } }` — 좌표는 대륙 그림 왼쪽 위, 가상 화면 정수 픽셀.
  - 대륙 id 8개: `africa`(고정), `south-america`, `india`, `antarctica`, `australia`, `north-america`, `greenland`, `eurasia`.

- [ ] **Step 1: 실패하는 테스트**

```ts
// tests/unit/raster.test.ts
test('정사각형 고리는 안쪽 픽셀만 칠한다', () => {
  const m = rasterizeRings([[[1,1],[5,1],[5,5],[1,5],[1,1]]], 8, 8);
  expect(m[2*8+2]).toBe(1); expect(m[0]).toBe(0);
  expect([...m].filter(v => v).length).toBe(16);
});
test('구멍(안쪽 고리)은 짝홀 규칙으로 비운다', () => {
  const m = rasterizeRings([[[0,0],[8,0],[8,8],[0,8],[0,0]], [[3,3],[5,3],[5,5],[3,5],[3,3]]], 8, 8);
  expect(m[3*8+3]).toBe(0); expect(m[1*8+1]).toBe(1);
});
test('윤곽은 바다에 닿은 땅 픽셀, 점선은 그 절반쯤', () => {
  const m = rasterizeRings([[[1,1],[5,1],[5,5],[1,5],[1,1]]], 8, 8);
  const o = outline(m, 8, 8);
  expect([...o].filter(v => v).length).toBe(12);
  expect([...dotted(o, 8, 8)].filter(v => v).length).toBe(6);
});
```

- [ ] **Step 2: `npx vitest run tests/unit/raster.test.ts` → FAIL**

- [ ] **Step 3: `raster.ts` 구현** — 행마다 픽셀 중심 y+0.5에서 모든 고리 변과의 교차 x를 모아 정렬, 짝 사이를 칠한다.

- [ ] **Step 4: 테스트 PASS**

- [ ] **Step 5: `groups.ts`·`build-masks.ts` 구현**

자료: Natural Earth 1:110m Admin 0 Countries GeoJSON(퍼블릭 도메인), `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_admin_0_countries.geojson`을 `tools/geo/`에 없으면 내려받는다(git 제외).

묶음(`groups.ts`, 나라 속성 `CONTINENT`·`ADMIN` 기준, 다각형마다 자기 무게중심이 상자 `[경도min, 위도min, 경도max, 위도max]` 안일 때만 넣어 해외 영토를 뺀다):

| id | 고르는 나라 | 상자 |
|---|---|---|
| africa | CONTINENT = Africa | [-20,-36,52,38] |
| south-america | CONTINENT = South America | [-82,-56,-34,13] |
| north-america | CONTINENT = North America, ADMIN ≠ Greenland | [-170,7,-52,84] |
| greenland | ADMIN = Greenland | [-75,59,-10,84] |
| antarctica | CONTINENT = Antarctica | [-180,-90,180,-60] |
| australia | ADMIN = Australia | [112,-44,154,-10] |
| india | ADMIN ∈ India, Pakistan, Bangladesh, Nepal, Bhutan, Sri Lanka | [60,5,98,37] |
| eurasia | CONTINENT ∈ Europe, Asia, india 묶음 제외 | [-25,0,180,85] |

투영: 대륙마다 `d3.geoAzimuthalEqualArea().rotate([-λc, -φc])`(λc, φc = `geoCentroid`), scale = `pxPerDeg * 180 / π`, `pxPerDeg = 1.1`(처음 값). 북쪽이 위, 회전 없음. 투영 넓이 6픽셀² 미만 다각형은 버린다. 출력 그림은 땅을 감싸는 최소 상자로 자른다.

`start`: 대륙 무게중심을 등장방형(x = 24 + (λc+180)·pxPerDeg, y = 22 + (84 − φc)·pxPerDeg)에 놓은 자리에서 그림 크기 절반을 뺀 값을, 그림 전체가 `PUZZLE_AREA`(y 22~240) 안에 들도록 자른다. `target`: 파일에 이미 있으면 **보존**, 없으면 `start`와 같게. africa는 `fixed: true`, `start = target`.

- [ ] **Step 6: `npm run build:masks` → PNG 24개 + `pieces.json` 생성 확인, 대륙 모양을 눈으로 확인(`Read`로 PNG 열기)**

- [ ] **Step 7: `PROVENANCE.md`에 Natural Earth(버전·URL·퍼블릭 도메인), 투영·묶음·제외 규칙 기록. 커밋** — `feat: Natural Earth 해안선으로 대륙 윤곽 마스크 생성`

### Task 3: 끌어 맞추기 판정

**Files:**
- Create: `src/game/common/snap.ts`, `src/game/common/layout.ts`, `tests/unit/snap.test.ts`

**Interfaces:**
- Produces:
  - `layout.ts`: `interface Rect { x: number; y: number; w: number; h: number }`, `interface Pt { x: number; y: number }`, `TOPBAR: Rect = {0,0,480,22}`, `TOPBAR_TEXT_W = 424`, `PUZZLE_AREA: Rect = {0,22,480,218}`, `DIALOG: Rect = {8,248,464,104}`, `PORTRAIT: Rect = {16,256,64,64}`, `NAME_POS: Pt = {88,256}`, `BODY: { x: 88, y: 274, w: 368 }`, `LINE_H = 16`, `LINES_PER_PAGE = 3`, `PAGE_MARK_POS: Pt = {456,334}`(오른쪽 정렬), `CHOICE = { right: 472, bottom: 244, w: 200, rowH: 16, pad: 6 }`, `LINE_W = 464`, `FONT = { family: 'Galmuri11', sizePx: 12, lineSpacing: 4 }`, `SNAP_RADIUS = 10`, `KEY_STEP = 4`
  - `snap.ts`: `trySnap(pos: Pt, target: Pt, radius: number): Pt | null`, `clampToArea(pos: Pt, size: { w: number; h: number }, area: Rect): Pt`, `snapSteps(from: Pt, to: Pt, n: number): Pt[]`

- [ ] **Step 1: 실패하는 테스트**

```ts
test('반경 안이면 정답 자리, 밖이면 null', () => {
  expect(trySnap({x:107,y:206}, {x:100,y:200}, 10)).toEqual({x:100,y:200}); // 거리 √85 ≈ 9.2
  expect(trySnap({x:108,y:207}, {x:100,y:200}, 10)).toBeNull();            // √113 ≈ 10.6
  expect(trySnap({x:110,y:200}, {x:100,y:200}, 10)).toEqual({x:100,y:200}); // 경계 포함
});
test('퍼즐 영역 밖으로 끌면 그림 전체가 영역 안에 남는다', () => {
  const area = {x:0,y:22,w:480,h:218};
  expect(clampToArea({x:-30,y:300}, {w:40,h:50}, area)).toEqual({x:0,y:190});
  expect(clampToArea({x:470,y:0}, {w:40,h:50}, area)).toEqual({x:440,y:22});
});
test('착 붙는 움직임은 정수 칸 n단계, 마지막은 정답 자리', () => {
  expect(snapSteps({x:0,y:0}, {x:9,y:-3}, 3)).toEqual([{x:3,y:-1},{x:6,y:-2},{x:9,y:-3}]);
});
```

- [ ] **Step 2: FAIL 확인 → Step 3: 구현(`snapSteps`는 `Math.round(from + (to−from)·i/n)`) → Step 4: PASS**

- [ ] **Step 5: 커밋** — `feat: 끌어 맞추기 판정(반경 검사, 영역 가두기, 칸 단위 착 붙음)`

### Task 4: DragBoard와 회색 상자 퍼즐 장면

**Files:**
- Create: `src/game/common/actions.ts`, `src/game/common/DragBoard.ts`, `src/game/common/debug.ts`, `src/game/continental-drift/scenes/BootScene.ts`, `src/game/continental-drift/scenes/PuzzleScene.ts`, `activities/continental-drift/puzzle.json`, `activities/continental-drift/patterns.json`, `tests/e2e/helpers.ts`, `tests/e2e/play.spec.ts`
- Modify: `scripts/map/build-masks.ts` (무늬 자르기), `src/game/continental-drift/main.ts`

**Interfaces:**
- Consumes: Task 2 `pieces.json`·PNG, Task 3 `snap.ts`·`layout.ts`
- Produces:
  - `actions.ts`: `type Action = 'confirm' | 'cancel' | 'up' | 'down' | 'left' | 'right' | 'cycle'`; `bindActions(scene: Phaser.Scene, onAction: (a: Action) => void): () => void` (Enter·Space→confirm, Esc→cancel, 방향키, Tab→cycle + 기본 동작 막기; 반환값은 해제 함수). 장면 코드는 키를 직접 읽지 않는다.
  - `DragBoard.ts`:
    ```ts
    interface PieceSpec { id: string; w: number; h: number; start: Pt; target: Pt; fixed?: boolean;
      tex: string; outlineTex: string; dottedTex: string; layers: Record<string, string> } // 무늬 이름 → 텍스처 키
    class DragBoard {
      constructor(scene: Phaser.Scene, pieces: PieceSpec[], area: Rect)
      setPhase(movable: string[], pattern: string | null): void
      readonly events: Phaser.Events.EventEmitter // 'snap'(id), 'phase-done'
      setEnabled(on: boolean): void              // 대화 중 false
      info(id: string): { pos: Pt; target: Pt; snapped: boolean }
    }
    ```
    대륙마다 `Container`(땅 + 무늬 층들 + 윤곽). `setPhase`의 `pattern` 층은 그 층이 있는 **모든** 대륙에서 켠다(이미 붙은 대륙의 빙하 화살표도 보이게), 나머지 층은 끈다. 이번 단계 대륙: 밝은 윤곽, 놓을 자리에 점선 윤곽 2Hz 깜박(초당 3회 이하). 이미 맞춘 대륙: 고정, alpha 0.6. 아직 차례가 아닌 대륙: alpha 0.35, 끌 수 없음. 놓을 때 `clampToArea` → `trySnap(SNAP_RADIUS)` → 맞으면 `snapSteps(n=3, 40ms 간격)`로 이동 후 고정. 틀려도 표시 없이 그 자리. 키보드: cycle = 이번 단계에서 안 맞춘 대륙 차례로 고르기, 방향키 = `KEY_STEP` 이동, confirm = 놓기.
  - `debug.ts`: `installDebug(api: NosDebug): void` — `import.meta.env.DEV`일 때만 `window.__nos = api`. 
    ```ts
    interface NosDebug { state(): { scene: string; phase: string | null; dialog: boolean; choice: boolean;
        guide: string | null; zoom: number; choiceCount: number; world: { x: number; y: number; zoom: number; scrollX: number; scrollY: number } };
      piece(id: string): { pos: Pt; target: Pt; snapped: boolean } | null; movable(): string[];
      toScreen(p: Pt): Pt;  // 가상 좌표 → 페이지 좌표(배율·캔버스 위치 반영)
      measureCanvas?(s: string): number }
    ```
  - `puzzle.json`:
    ```json
    { "phases": [
      { "id": "coast",    "board": "world",    "move": ["south-america"], "pattern": null,       "dot": null, "before": "intro",          "guide": "line-guide-coast",    "after": "coast-after" },
      { "id": "fossil",   "board": "world",    "move": ["india", "antarctica"], "pattern": "fossil", "dot": 0, "before": "fossil-before", "guide": "line-guide-fossil",   "after": "fossil-after" },
      { "id": "glacier",  "board": "world",    "move": ["australia"],     "pattern": "glacier",  "dot": 1, "before": "glacier-before", "guide": "line-guide-glacier",  "after": "glacier-after" },
      { "id": "mountain", "board": "world",    "move": ["north-america", "greenland", "eurasia"], "pattern": "mountain", "dot": 2, "before": "mountain-before", "guide": "line-guide-mountain", "after": "mountain-after" },
      { "id": "stripes",  "board": "seafloor", "move": ["strip-1", "strip-2", "strip-3"], "pattern": null, "dot": null, "before": "seafloor-before", "guide": "line-guide-stripes", "after": "seafloor-after" } ] }
    ```
    `before`·`guide`·`after`는 원고 앵커 이름(단계 B에서는 쓰지 않음, C부터 연결). `PuzzleScene`은 `init({ phases: string[], next: string })`로 이어서 할 단계 목록과 다음 장면 키를 받는다.
  - `patterns.json`: 정답 배치(모든 대륙이 `target`) 기준 가상 좌표. `{ "fossil": [{ "taxon": string, "points": [[x,y],...], "width": number }], "glacier": [{ "from": [x,y], "to": [x,y] }], "mountain": [{ "points": [[x,y],...] }], "placeholder": true }`. `build-masks`가 무늬를 보드 크기 비트맵으로 그린 뒤 대륙마다 `target`에 놓인 마스크와 겹치는 부분만 잘라 `<id>-<무늬>.png`로 쓴다(정답 자리에서 이어지게).

- [ ] **Step 1: 정답 자리 맞추기용 보기** — `?debug=assembled`(DEV)면 모든 대륙을 `target`에 그린다. USGS "This Dynamic Earth"의 판게아 그림(미국 정부 저작물, 퍼블릭 도메인)을 참고해 `pieces.json`의 `target`을 손으로 맞춘다. 판게아 전체가 `PUZZLE_AREA` 안. 남아메리카–아프리카는 "거의 맞지만 완벽하진 않게"(회전이 없으니 자연히 그렇다). 참고 자료를 `PROVENANCE.md`에 기록.

- [ ] **Step 2: 임시 무늬** — `patterns.json`에 `"placeholder": true`로 대략의 화석 띠 2~4개(아프리카–인도–남극–남아메리카), 빙하 화살표(옛 남극 근처 한 점에서 퍼짐), 산맥 선(북아메리카–그린란드–유럽)을 그린다. 사실 확정은 Task 10. `npm run build:masks`.

- [ ] **Step 3: 장면 구현** — `BootScene`이 `import.meta.glob('/activities/continental-drift/art/pieces/*.png', { eager: true, query: '?url', import: 'default' })`로 그림을 읽는다. `PuzzleScene`은 단계를 순서대로: `setPhase` → 진행 점(●○○, `dot`이 null이면 숨김)과 테두리만 그림 → `phase-done`이면 다음 단계. mountain 뒤 합치기 연출: 전체 윤곽을 2번 깜박(약 1초). 단계 B에서는 world 보드 네 단계만, 끝나면 멈춤. `seafloor` 보드는 Task 15.

- [ ] **Step 4: e2e 실패 먼저** — `tests/e2e/helpers.ts`:
  - `dragPiece(page, id, to: 'target' | Pt, touch: boolean)`: `__nos.piece(id)`·`toScreen`으로 화면 좌표를 구해 마우스(`page.mouse` down → 8단계 move → up) 또는 터치(CDP `Input.dispatchTouchEvent` touchStart → touchMove ×8 → touchEnd)로 끈다. 대륙 그림 가운데를 잡고 `target + (그림 크기/2)`로 놓는다.
  - `play.spec.ts` `@e2e 퍼즐 네 단계`: 단계마다 `movable()` 대륙을 정답 자리로 끌고, `phase`가 coast→fossil→glacier→mountain으로 바뀌는지, 끝에 모든 대륙 `snapped`. 또 하나: 남아메리카를 정답에서 30px 떨어진 곳에 놓으면 `snapped === false`이고 자리가 그대로이며 `phase`가 그대로.
  - 실행해서 FAIL 확인(장면 미완성일 때) → 구현 마무리 → PASS(desktop·tablet 둘 다).

- [ ] **Step 5: `check.sh --shots --e2e` 통과(shots는 아직 없으면 "없음"). 커밋** — `feat: 회색 상자 대륙 퍼즐 프로토타입`

- [ ] **Step 6: 멈춤 — 사용자 직접 플레이.** `npm run dev` 주소와 `?debug=assembled` 사용법을 알리고, 물을 것: 재미·손맛·어려움(반경 10px, 대륙 크기), 네 단계 걸린 시간(목표 약 7분 중 ②③ 몫), 계속/수정. 수정이면 이 계획의 C 이후를 고친 뒤 진행. 장부에 결정 기록.

---

## 단계 C — 공통 부품

### Task 5: 글자 폭 표와 줄 바꿈·쪽 나눔

**Files:**
- Create: `scripts/font/build-widths.ts`, `src/script/galmuri11-widths.json`(생성물, 커밋), `src/script/measure.ts`, `src/script/wrap.ts`, `tests/unit/wrap.test.ts`
- Modify: `package.json` (`build:widths`)

**Interfaces:**
- Produces:
  - `galmuri11-widths.json`: `{ "font": "Galmuri11", "sizePx": 12, "ranges": [[from, to, width], ...] }` — `node_modules/galmuri/dist/Galmuri11.ttf`의 cmap 전체를 opentype.js로 읽어 `advanceWidth * 12 / unitsPerEm`. 정수가 아니면 생성 실패. 같은 폭이 이어지는 코드포인트를 한 구간으로 묶는다.
  - `measure.ts`: `type Measure = (s: string) => number`; `interface WidthTable { sizePx: number; ranges: [number, number, number][] }`; `makeTableMeasure(t: WidthTable): Measure`; `missingChars(t: WidthTable, s: string): string[]`(중복 없이, 처음 나온 순서); `galmuriMeasure: Measure`, `galmuriTable: WidthTable`
  - `wrap.ts`: `wrapText(text: string, measure: Measure, maxW: number): string[]`, `paginate(lines: string[], perPage: number): string[][]`, `pagesFor(text: string, measure?: Measure, maxW?: number, perPage?: number): string[][]`(기본값 `galmuriMeasure`, `BODY.w`=368, `LINES_PER_PAGE`=3)

줄 바꿈 규칙: 공백 기준 어절 단위. 어절 하나가 한 줄보다 길면 글자 단위로 끊는다. 줄 앞 공백은 지운다. 문장 부호(`. , ! ? ) 」 ’ ”`)는 줄 머리에 오지 않게 앞 어절에 붙인다(어절 단위라 공백 없이 붙어 있으면 자동).

- [ ] **Step 1: 실패하는 테스트** (폭은 가짜 측정 `s => [...s].length * 10`으로 고정)

```ts
const m = (s: string) => [...s].length * 10;
test('어절 단위로 줄을 바꾼다', () => {
  expect(wrapText('해안선이 딱 맞잖아요', m, 60)).toEqual(['해안선이 딱', '맞잖아요']);
});
test('한 줄보다 긴 어절은 글자 단위로 끊는다', () => {
  expect(wrapText('가나다라마바사아', m, 30)).toEqual(['가나다', '라마바', '사아']);
});
test('세 줄씩 쪽을 나눈다', () => {
  expect(paginate(['a','b','c','d'], 3)).toEqual([['a','b','c'], ['d']]);
});
test('표에 있는 글자 폭을 더하고, 없는 글자를 찾아낸다', () => {
  const t = { sizePx: 12, ranges: [[0x20,0x7e,6],[0xac00,0xd7a3,12]] as [number,number,number][] };
  expect(makeTableMeasure(t)('가 a')).toBe(24);
  expect(missingChars(t, '가“나”')).toEqual(['“', '”']);
});
test('실제 Galmuri11 표: 한글 음절 폭이 0보다 크다', () => {
  expect(galmuriMeasure('가')).toBeGreaterThan(0);
});
```

- [ ] **Step 2: FAIL → Step 3: `build-widths.ts` 실행(`npm run build:widths`)·`measure.ts`·`wrap.ts` 구현 → Step 4: PASS**

- [ ] **Step 5: 커밋** — `feat: Galmuri11 글자 폭 표와 줄 바꿈·쪽 나눔`

### Task 6: 원고 파서

**Files:**
- Create: `src/script/parse.ts`, `tests/unit/parse.test.ts`
- Modify: `src/strings.ts` (`MARK_LABELS = ['가상 인물', '사료 근거', '사료 각색']`, `CHARACTERS_HEADING = '등장인물'`)

**Interfaces:**
- Produces:
  ```ts
  interface Character { id: string; name: string; mark: string | null; portrait: string | null }
  interface Speech { speaker: string; text: string; line: number }
  interface Choice { label: string; target: string; line: number }
  type Block =
    | { kind: 'dialogue'; anchor: string; line: number; speeches: Speech[] }
    | { kind: 'choices';  anchor: string; line: number; choices: Choice[] }
    | { kind: 'line';     anchor: string; line: number; text: string }
    | { kind: 'page';     anchor: string; line: number; markdown: string };
  interface Script { characters: Map<string, Character>; blocks: Map<string, Block> }
  type ParseErrorCode = 'NO_CHARACTERS' | 'BAD_CHARACTER_ROW' | 'BAD_MARK' | 'DUP_ANCHOR'
    | 'BAD_SPEECH' | 'UNKNOWN_SPEAKER' | 'BAD_CHOICE' | 'LINE_NOT_SINGLE' | 'EMPTY_BLOCK';
  interface ParseError { code: ParseErrorCode; line: number; detail: string }
  function parseScript(text: string): { script: Script; errors: ParseError[] }
  ```

원고 형식(이 태스크가 정한다, `nos-script`가 따른다):
- `<!-- ... -->` 주석은 무시(여러 줄 가능). `# 제목`은 무시.
- `## 등장인물` 아래 표: `| id | 이름 | 표시 | 초상 |`. 표시는 `MARK_LABELS` 중 하나 또는 `-`(해설 등). 초상은 그림 키 또는 `-`.
- `## @이름` = 앵커. 다음 `## ` 제목까지 한 덩어리. 앵커 이름은 `[a-z0-9-]+`. 종류는 이름 머리로: `choice-` → 선택지, `line-` → 한 줄, `page-` → 자유 마크다운(`###` 이하 제목 허용), 그 밖 → 대화.
- 대화: 빈 줄이 아닌 줄마다 `id: 말`. **말 하나가 새 쪽에서 시작**하고 길면 자동으로 쪽이 이어진다.
- 선택지: 줄마다 `- 보이는 글 -> @앵커`.
- 한 줄: 빈 줄이 아닌 줄이 정확히 하나.
- 줄 번호는 1부터, 원고 파일 기준.

- [ ] **Step 1: 실패하는 테스트** — 아래 고정 원고 하나로:

```ts
const SRC = `<!-- 안내 -->
# 원고
## 등장인물
| id | 이름 | 표시 | 초상 |
|---|---|---|---|
| aide | 조수 | 가상 인물 | aide |
| narr | | - | - |

## @intro
aide: 첫 말
narr: 해설

## @choice-why
- 줄어서 -> @reply-a
- 모르겠다 -> @reply-b

## @line-guide-coast
남아메리카를 끌어 보세요

## @page-about
### 소제목
본문
`;
test('네 종류 블록과 등장인물을 읽는다', () => {
  const { script, errors } = parseScript(SRC);
  expect(errors).toEqual([]);
  expect(script.characters.get('aide')).toEqual({ id: 'aide', name: '조수', mark: '가상 인물', portrait: 'aide' });
  expect(script.blocks.get('intro')).toMatchObject({ kind: 'dialogue', line: 9,
    speeches: [{ speaker: 'aide', text: '첫 말', line: 10 }, { speaker: 'narr', text: '해설', line: 11 }] });
  expect(script.blocks.get('choice-why')).toMatchObject({ kind: 'choices',
    choices: [{ label: '줄어서', target: 'reply-a', line: 14 }, { label: '모르겠다', target: 'reply-b', line: 15 }] });
  expect(script.blocks.get('line-guide-coast')).toMatchObject({ kind: 'line', text: '남아메리카를 끌어 보세요' });
  expect(script.blocks.get('page-about')).toMatchObject({ kind: 'page', markdown: '### 소제목\n본문' });
});
test('형식 오류를 줄 번호와 함께 모은다', () => {
  const bad = SRC.replace('narr: 해설', '해설만').replace('aide: 첫 말', 'ghost: 누구')
    .replace('- 모르겠다 -> @reply-b', '- 모르겠다').replace('가상 인물 | aide', '상상 인물 | aide')
    .replace('남아메리카를 끌어 보세요', '한 줄\n두 줄');
  const codes = parseScript(bad).errors.map(e => [e.code, e.line]);
  expect(codes).toEqual(expect.arrayContaining([['BAD_MARK', 6], ['UNKNOWN_SPEAKER', 10], ['BAD_SPEECH', 11], ['BAD_CHOICE', 15], ['LINE_NOT_SINGLE', 17]]));
});
test('같은 앵커가 두 번이면 DUP_ANCHOR', () => {
  expect(parseScript(SRC + '\n## @intro\naide: 또\n').errors.map(e => e.code)).toContain('DUP_ANCHOR');
});
```

- [ ] **Step 2: FAIL → Step 3: 구현 → Step 4: PASS → Step 5: 커밋** — `feat: 원고 파서(등장인물·대화·선택지·한 줄·페이지)`

### Task 7: 원고 검사(`check:script`)와 임시 원고

**Files:**
- Create: `src/script/check.ts`, `src/game/continental-drift/anchors.ts`, `scripts/check-script.ts`, `tests/unit/check.test.ts`, `activities/continental-drift/script.md`(임시 원고)
- Modify: `package.json` (`check:script`: `tsx scripts/check-script.ts`)

**Interfaces:**
- Consumes: Task 5 `Measure`·`wrapText`·`pagesFor`·`missingChars`, Task 6 `parseScript`, Task 3 `layout.ts`
- Produces:
  - `anchors.ts`: `export const ANCHORS: Record<string, Block['kind']>` — 이 활동 코드가 부르는 앵커 전부:
    - 대화: `intro`, `coast-after`, `fossil-before`, `fossil-after`, `glacier-before`, `glacier-after`, `mountain-before`, `mountain-after`, `merge-after`, `debate-arrive`, `debate-mechanism-q`, `debate-landbridge`, `debate-note`, `seafloor-before`, `seafloor-after`, `ending`
    - 선택지: `choice-debate-mechanism` (대상 앵커는 원고가 정하되 모두 대화 블록이어야 한다)
    - 한 줄: `line-title`, `line-start`, `line-guide-coast`, `line-guide-fossil`, `line-guide-glacier`, `line-guide-mountain`, `line-guide-stripes`, `line-card-title`, `line-card-desc`
    - 페이지: `page-about`
  - `check.ts`:
    ```ts
    type IssueCode = ParseErrorCode | 'MISSING_ANCHOR' | 'WRONG_KIND' | 'BAD_TARGET' | 'SPEECH_TOO_LONG'
      | 'LINE_TOO_WIDE' | 'GUIDE_TOO_WIDE' | 'CHOICE_TOO_WIDE' | 'NAME_TOO_WIDE' | 'TOTAL_PAGES' | 'MISSING_GLYPH';
    interface Issue { code: IssueCode; line: number; detail: string }
    interface CheckResult { issues: Issue[]; totalPages: number; pagesByAnchor: Record<string, number> }
    function checkScript(text: string, opts: { required: Record<string, Block['kind']>; maxPages: number;
      measure?: Measure; table?: WidthTable }): CheckResult
    ```
    규칙: 앵커 빠짐·종류 다름, 선택지 대상 없음/대화 아님, 말 하나가 **2쪽 초과**, `line-guide-*`는 `TOPBAR_TEXT_W`(424) 한 줄, 그 밖 `line-*`는 `LINE_W`(464) 한 줄, 선택지 글은 `CHOICE.w − 2·pad − 12`(176) 한 줄, 이름표(이름 + " · " + 표시)는 `BODY.w` 한 줄, 대화 블록 쪽 수 합 > `maxPages`(45), 글꼴에 없는 글자(`page-about`은 HTML로 보이므로 제외).
  - `scripts/check-script.ts`: `activities/*/script.md`마다 `src/game/<id>/anchors.ts`를 불러 검사, `activities/<id>/script.md:<줄>  <한국어 설명>`을 출력, 끝에 `대화 <n>쪽 / 상한 45쪽`과 앵커별 쪽 수. 오류가 있으면 종료 코드 1. 오류 코드→한국어 설명 표는 이 파일에.

- [ ] **Step 1: 실패하는 테스트** (`tests/unit/check.test.ts`, 가짜 측정 `s => [...s].length * 12` + 한글·ASCII만 있는 가짜 표)

```ts
test('필수 앵커가 없으면 MISSING_ANCHOR, 종류가 다르면 WRONG_KIND', ...);   // required { intro: 'dialogue', 'line-title': 'line' } 에 intro 없음 / line-title이 대화
test('선택지 대상이 없으면 BAD_TARGET', ...);
test('말 하나가 3쪽이 되면 SPEECH_TOO_LONG, 2쪽은 통과', ...);           // 30자 × 3줄 = 1쪽 → 181자 말은 3쪽
test('안내 띠 글이 424px을 넘으면 GUIDE_TOO_WIDE', ...);                // 36자 × 12 = 432
test('대화 쪽 수 합이 상한을 넘으면 TOTAL_PAGES, totalPages를 돌려준다', ...); // maxPages: 2, 말 3개
test('글꼴에 없는 글자는 MISSING_GLYPH와 그 글자', ...);                 // '“'
```
각 테스트는 `checkScript(...).issues.map(i => i.code)`에 해당 코드가 있는지(또는 없는지)와 `line`을 단언한다.

- [ ] **Step 2: FAIL → Step 3: 구현 → Step 4: PASS**

- [ ] **Step 5: 임시 원고** — `script.md`에 머리 안내 주석(형식 설명, 교사용), 등장인물 표(`aide | 조수 | 가상 인물 | aide`, `wegener | 알프레트 베게너 | 사료 각색 | -`, `member | 학회 참석자 | 가상 인물 | -`, `narr | | - | -`), `ANCHORS`의 모든 앵커를 짧은 임시 문장으로. 맨 위 주석에 `임시 원고 — Task 11에서 바꾼다`. `npm run check:script` → 통과, 쪽 수 출력 확인. 일부러 앵커 하나를 지워 한국어 오류가 줄 번호와 함께 나오는지 확인하고 되돌린다.

- [ ] **Step 6: `check.sh` 통과 후 커밋** — `feat: 원고 검사 check:script와 임시 원고`

### Task 8: UI 장면(대화창·선택지·안내 띠·효과음 버튼)

**Files:**
- Create: `src/game/common/UiScene.ts`, `scripts/sfx/make-sfx.ts`, `public/sfx/{page,snap,done}.wav`, `tests/unit/dialog-queue.test.ts`, `src/game/common/dialogQueue.ts`
- Modify: `package.json` (`build:sfx`)

**Interfaces:**
- Consumes: Task 5 `pagesFor`, Task 6 `Script`, Task 3 `layout.ts`, Task 4 `actions.ts`
- Produces:
  - `dialogQueue.ts` (Phaser 없는 순수 상태, 테스트 대상):
    ```ts
    class DialogQueue {
      enqueue<T>(job: () => Promise<T>): Promise<T>   // 한 번에 하나만 실행, 나머지는 순서대로 대기
      get busy(): boolean
    }
    class PageCursor {
      constructor(pages: string[][][])  // 말마다 쪽 목록
      advance(frame: number): 'next' | 'done' | 'ignored'  // 같은 frame에 두 번 부르면 두 번째는 'ignored'
      current(): { speechIndex: number; page: string[]; pageNo: number; pageCount: number }
    }
    ```
  - `UiScene` (key `'ui'`, 게임 장면 목록 맨 뒤, `launch` 한 번):
    ```ts
    class UiScene extends Phaser.Scene {
      bind(script: Script, world: Phaser.Scene): void         // 세계 장면이 바뀔 때마다 부른다
      say(anchor: string): Promise<void>                        // 대화 블록 전체, 마지막 쪽을 넘기면 끝
      choose(anchor: string): Promise<string>                   // 고른 선택지의 대상 앵커
      setGuide(anchor: string | null, dots?: { done: number; total: number } | null): void
      sfx(name: 'page' | 'snap' | 'done'): void                 // 소리 꺼짐이면 아무것도 안 함
      readonly status: { dialog: boolean; choice: boolean; guide: string | null }
    }
    ```
    - 대화창: `DIALOG` 자리에 9칸 나눔 테두리(회색 상자 단계는 사각형 2겹), 초상(`portrait` 키가 있으면 64×64, 없으면 빈 칸), 이름표 `이름 · 표시`(표시가 `-`면 이름만, 이름이 비면 이름표 없음), 본문 3줄, 오른쪽 아래 `▼ 쪽/전체`. 아래에서 올라오는 연출은 2단계 칸 이동(각 40ms). 창 크기는 바뀌지 않는다.
    - 대화가 열린 동안: 세계 장면 `input.enabled = false`, 안내 띠 숨김. 닫히면 둘 다 되돌린다. `say`·`choose`는 `DialogQueue`로 차례를 지킨다.
    - 넘기기: confirm 또는 대화창 아무 데나 누르기. `PageCursor.advance(game.loop.frame)`.
    - 선택지: `CHOICE` 자리(대화창 위 오른쪽), 위아래로 고르고 confirm, 또는 줄 누르기. 커서 ▶. 선택지가 떠 있는 동안 직전 대화창은 그대로 보인다.
    - 안내 띠: `TOPBAR`, 왼쪽 글(앵커의 한 줄), 오른쪽 진행 점(●○○), 대화·선택지 중 숨김.
    - 효과음 버튼: 오른쪽 위 16×16 도트 아이콘(스피커 / 스피커+줄), 처음엔 꺼짐, 누르면 토글. 상태는 메모리에만.
  - `make-sfx.ts`: 22050Hz 8비트 사각파 WAV 3개를 결정적으로 합성(page 짧은 틱 60ms, snap 두 음 120ms, done 세 음 상승 300ms). 외부 소리 파일·라이선스 없음.

- [ ] **Step 1: 실패하는 테스트** (`dialog-queue.test.ts`)

```ts
test('두 번째 say는 첫 번째가 끝난 뒤에 시작한다', async () => {
  const q = new DialogQueue(); const log: string[] = [];
  let release!: () => void;
  const a = q.enqueue(() => new Promise<void>(r => { log.push('a-start'); release = () => { log.push('a-end'); r(); }; }));
  const b = q.enqueue(async () => { log.push('b-start'); });
  await Promise.resolve(); expect(log).toEqual(['a-start']);
  release(); await a; await b;
  expect(log).toEqual(['a-start', 'a-end', 'b-start']);
});
test('같은 프레임 두 번 넘기기는 한 쪽만 넘긴다', () => {
  const c = new PageCursor([[['1'], ['2']], [['3']]]);
  expect(c.advance(10)).toBe('next'); expect(c.advance(10)).toBe('ignored');
  expect(c.current().page).toEqual(['2']);
  expect(c.advance(11)).toBe('next'); expect(c.current().speechIndex).toBe(1);
  expect(c.advance(12)).toBe('done');
});
```

- [ ] **Step 2: FAIL → Step 3: `dialogQueue.ts`, `UiScene.ts`, `make-sfx.ts` 구현(`npm run build:sfx`) → Step 4: PASS**

- [ ] **Step 5: 커밋** — `feat: UI 장면(대화창·선택지·안내 띠·효과음 토글)`

### Task 9: 퍼즐에 원고 연결, 타이틀, 밀림 검사

**Files:**
- Create: `src/game/continental-drift/scenes/TitleScene.ts`, `tests/e2e/shots.spec.ts`
- Modify: `PuzzleScene.ts`, `BootScene.ts`, `main.ts`, `debug.ts`, `tests/e2e/helpers.ts`, `tests/e2e/play.spec.ts`

**Interfaces:**
- Consumes: Task 8 `UiScene`, Task 7 `ANCHORS`, Task 4 `DragBoard`·`puzzle.json`
- Produces:
  - `main.ts`: 원고를 `import scriptText from '/activities/continental-drift/script.md?raw'`로 읽어 `parseScript`. 오류가 있으면 DEV에서는 콘솔에 오류를 내고 멈춘다(배포 전에는 `check:script`가 막는다). 장면 순서 `[Boot, Title, Puzzle, Debate, Ending, Ui]`.
  - `TitleScene`: `line-title`, `line-start`. confirm 또는 누르기 → `Puzzle`(`{ phases: ['coast','fossil','glacier','mountain'], next: 'debate' }`).
  - `PuzzleScene` 단계마다: `await ui.say(before)` → `setGuide(guide, dots)` → 퍼즐 → 맞출 때마다 `ui.sfx('snap')` → 단계 끝 `ui.sfx('done')`, `setGuide(null)` → `await ui.say(after)`. mountain 뒤 합치기 연출 → `await ui.say('merge-after')` → `next` 장면(Debate가 아직 없으면 멈춤).
  - `helpers.ts`: `advance(page, touch)` — 대화창이 열려 있으면 Enter(desktop) 또는 대화창 가운데 탭(tablet); `playUntil(page, pred, touch)` — 선택지면 첫 항목 confirm, 대화면 넘기기, 퍼즐이면 `movable()` 첫 대륙을 정답 자리로 끌기를 `pred(state)`가 참이 될 때까지(최대 400번).
  - `debug.ts`: `measureCanvas(s)` 추가 — UI 장면 글꼴 설정과 같은 캔버스 `measureText(s).width`.

- [ ] **Step 1: 밀림 e2e 먼저** (`play.spec.ts`)
  - `@e2e 대화창이 떠도 세계가 그대로`: 퍼즐 coast 단계에서 대화가 없을 때 `state().world`와 canvas `boundingBox()`를 기록 → `coast-after` 대화가 열린 상태에서 다시 기록 → 둘 다 같다. 대화 중 `guide === null`, 대화 뒤 `guide === 'line-guide-fossil'`(다음 단계 시작 후).
  - `@e2e 원고 글자 폭 = 캔버스 글자 폭`: 원고의 대화 말 20개(앞에서부터)에 대해 `measureCanvas(s) === galmuriMeasure(s)`.
  - `@e2e 대화 중 대륙을 끌 수 없다`: 대화가 열린 상태에서 남아메리카를 끌어도 `piece('south-america').pos` 그대로.
  - 실행 → FAIL.

- [ ] **Step 2: 구현 → e2e PASS(두 project)**

- [ ] **Step 3: 글자 폭이 다르면** 캔버스 `letterSpacing`·`fontKerning = 'none'` 설정을 먼저 맞추고, 그래도 다르면 멈추고 원인을 장부에 남긴다(표를 바꾸지 않는다 — 원고 검사와 실행이 같은 함수를 써야 한다).

- [ ] **Step 4: 스크린샷** — `shots.spec.ts` `@shots`: `title`, `puzzle-coast`(대화 없음), `puzzle-coast-dialog`(대화 열림), `puzzle-fossil`, `puzzle-glacier`, `puzzle-mountain`을 `test-results/screens/<project>-<이름>.png`로. (Debate 이후 장면은 Task 14~16에서 추가.)

- [ ] **Step 5: `check.sh --shots --e2e` 통과 후 커밋** — `feat: 퍼즐에 원고·UI 연결, 타이틀, 밀림 검사`

- [ ] **Step 6: 단계 C 끝 — `nos-play-reviewer` 검토**(스크린샷 + e2e 결과, 점검표 A~D). 지적 처리는 nos-build 3절.

---

## 단계 D — 원고 (`nos-script` 절차)

### Task 10: 사실 확인과 사료 근거표

**Files:**
- Create: `activities/continental-drift/sources.md`

**Interfaces:**
- Produces: `sources.md` 표 `| ID | 사실 | 근거(서지·URL) | 1차/2차 | 상태(확인/확인 필요) |`. 원고·`patterns.json`·정리 페이지는 이 ID를 근거로 쓴다.

- [ ] **Step 1: 확인할 사실 목록을 표로** — 최소 다음을 담는다:
  - 베게너의 대륙이동설 발표(1912 강연, 1915 『대륙과 해양의 기원』)와 근거 종류(해안선, 화석, 고기후·빙하, 지질 구조)
  - 화석 분포: 메소사우루스(남아메리카–아프리카), 글로소프테리스(남반구 대륙·인도), 리스트로사우루스·키노그나투스의 분포 — 어느 대륙에 걸쳐 그리나
  - 페름–석탄기 빙하 흔적의 분포와 방향(남아메리카·아프리카·인도·남극·오스트레일리아)
  - 대서양 양쪽 옛 산맥(애팔래치아–칼레도니아 계열)의 연결
  - 반대 근거: 움직이는 힘이 없다(베게너가 제시한 극을 피하는 힘·조석 힘이 너무 약하다는 계산 비판), 육교설·영구설로 화석을 설명. 1926년 AAPG 뉴욕 심포지엄 등 실제 반박 기록.
  - 지지와 메커니즘 제안: 뒤 토이트(1937 『떠도는 대륙』), 홈스의 맨틀 대류 제안(1928~1931 무렵)
  - 해저 연구의 축적: 해저 지형 지도(타프·히젠), 고지자기 극 이동, 해저 확장설(헤스·디츠), 자기 줄무늬 해석(바인–매슈스–몰리, 1963 무렵) → 1960년대 후반 판구조론
  - 지금도 남은 질문: 판을 움직이는 힘(맨틀 대류·판 당김·해령 밀기의 비중)
  - 베게너 초상: 퍼블릭 도메인 사진이 있는지(촬영자·연도·저작권 상태)
  - 퍼즐 ⑤ 줄무늬: 해령 양쪽 대칭 자기 줄무늬의 일반적 모습(그림 근거)

- [ ] **Step 2: `nos-content-reviewer`에 사실 확인 맡기기**(웹 검색). 결과를 `sources.md`에 반영. 확인 안 된 것은 `확인 필요`로 두고 원고에 쓰지 않는다.

- [ ] **Step 3: `patterns.json` 확정** — 화석 띠·빙하 화살표·산맥 선을 `sources.md` ID에 맞춰 다시 그리고 `"placeholder"`를 지운다. 각 항목에 `"source": "<ID>"`. `npm run build:masks` 후 `?debug=assembled`로 이어짐 확인.

- [ ] **Step 4: 커밋** — `docs: 대륙이동설 사료 근거표와 무늬 자료 확정`

### Task 11: 원고 작성

**Files:**
- Modify: `activities/continental-drift/script.md`

- [ ] **Step 1: 초안** — `ANCHORS`의 앵커 전부를 설계 4절 순서대로. 지킬 것:
  - 조수 이름·말투는 초안에 두 안을 제시하고 사용자가 정한다(등장인물 표의 `aide` 행).
  - ② 뒤(`coast-after`): "모양만 닮은 건 아닐까요?" 취지(증거의 한계).
  - ④ `debate-mechanism-q` → `choice-debate-mechanism` 선택지 3개(예: 지구가 식으며 줄어서 / 달·해의 조석 힘으로 / 잘 모르겠다), 각 대상 앵커(`debate-reply-*`)는 반박 대사 하나로 끝나고 정답 표시 없음. 조석 힘 반박은 실제 기록에 있던 내용만.
  - `debate-landbridge`: 육교설로도 화석이 설명된다는 반론. 학회 참석자는 "가상 인물", 반박 내용은 `sources.md` ID.
  - `debate-note`(조수 짚기, 1쪽): 같은 증거도 다르게 설명된다 / 답 못 한 질문이 남으면 받아들이기 어렵다. 질문하지 않는다.
  - 지지자(뒤 토이트)·메커니즘 제안(홈스)은 조수 대사 한 줄로(혼자였다는 서사 막기).
  - `seafloor-before`: 수십 년 뒤, 여러 연구가 쌓였다. 한 사람·한 실험으로 끝났다고 쓰지 않는다. `seafloor-after`(조수 짚기, 1쪽): 새 증거로 생각이 바뀌었다, 그때 반대한 사람들도 증거를 따랐다.
  - `ending`: 판구조론 정리 + "지금 증거로 본 가장 나은 설명, 판을 움직이는 힘은 지금도 연구 중".
  - `page-about`: ① 판·판의 경계·지진·화산 분포([9과09-05] 뒷부분) ② 장면 ②~⑥과 짝지은 NOS 뜻 ③ 남은 질문. 끝에 `[처음부터 다시 하기](/continental-drift/)`, `[목록으로](/)`. 중학생 눈높이, 짧은 문단.
  - 문장 부호는 Galmuri11에 있는 것만(`check:script`가 잡는다).

- [ ] **Step 2: `npm run check:script`** → 오류 0, 대화 45쪽 이하. 앵커별 쪽 수가 설계 4절 시간 배분(① 1분≈10쪽 이하, ④ 3분 등)에서 크게 벗어나지 않는지 본다.

- [ ] **Step 3: 한국어 점검** — `humanize-korean:humanize-monolith`에 원고를 주되 **바꿀 문장 목록만** 받는다. 사료 인용 뜻을 바꾸지 않는 범위에서 반영. 다시 `check:script`.

- [ ] **Step 4: 멈춤 — 사용자 확인**(원고 초안, 조수 이름·말투). 반영 후 커밋 — `content: 대륙이동설 원고`

- [ ] **Step 5: 단계 D 끝 — `nos-content-reviewer` 검토**(`script.md`, `sources.md`). Critical·Important 1회 수정 → 같은 검토자 재검토.

---

## 단계 E — 그림 (`nos-art` 절차, 키 없으면 건너뛰고 F·G 먼저)

### Task 12: STYLE.md, 생성 래퍼, 견본

**Files:**
- Create: `activities/continental-drift/art/STYLE.md`, `activities/continental-drift/art/palette.json`, `scripts/art/gen.py`
- Modify: `activities/continental-drift/art/PROVENANCE.md`

**Interfaces:**
- Produces:
  - `palette.json`: `{ "colors": [{ "name": string, "hex": "#rrggbb", "use": string }] }` 16색 이내. UI 창 색(테두리·바탕·글자)도 여기서 고른다.
  - `gen.py`: `--dry-run`, `--from-raw <파일>`, `--ref <참고 그림>`, `--mask <마스크 PNG>`(생성 뒤 마스크 밖 픽셀 지우기), `--palette palette.json`, `--out <png>`. 호출 기록 `tools/art-runs/calls.jsonl`. 키는 환경 변수로만 받는다. 출력은 PNG.

- [ ] **Step 1: `.env`에 키가 있는지 확인**(값을 읽거나 출력하지 않고 `OPENAI_API_KEY=` 뒤가 비었는지만). 없으면 장부에 `판단: 그림 보류`, 사용자에게 알리고 Task 14로.
- [ ] **Step 2: `STYLE.md` 모든 칸 작성**(nos-art 1절 표) + `palette.json`.
- [ ] **Step 3: `gen.py` 작성**(이전 저장소 `scripts/art/gen.py`를 참고하되 출력은 PNG). `--dry-run`으로 명령 확인.
- [ ] **Step 4: 멈춤 — 사용자에게 STYLE.md와 견본 계획(5장: 남아메리카·아프리카 대륙, 세계 지도 배경, 창 테두리, 조수 초상, 호출 약 5~8번) 알리고 승인.**
- [ ] **Step 5: 견본 생성 → 대조 시트(`build_preview_sheet.py`) + 견본을 끼운 게임 스크린샷 → 사용자 판정.** 통과 전에는 대량으로 가지 않는다.
- [ ] **Step 6: 커밋**(고른 견본만) — `art: STYLE.md, 팔레트, 생성 래퍼, 견본`

### Task 13: 나머지 그림과 교체

**Files:**
- Create: `activities/continental-drift/art/*.png`(대륙 8 + 무늬 층 3종 다시 칠하기, 세계 지도·학회·해저 배경, 줄무늬 띠, 창 테두리·커서, 조수 초상, 베게너 초상은 Task 10에서 퍼블릭 도메인 확인됐을 때만)
- Modify: `BootScene.ts`(그림이 있으면 그림, 없으면 마스크 단색), `UiScene.ts`(창 테두리 9칸 나눔), `PROVENANCE.md`

- [ ] **Step 1: 사용자에게 장수·호출 수 알리고 승인 → 생성.** 대륙은 `--mask`로 반드시 잘라 윤곽을 지킨다(좌표가 바뀌지 않는다).
- [ ] **Step 2: 교체 후 `check.sh --shots --e2e`** — e2e는 좌표가 같아 그대로 통과해야 한다.
- [ ] **Step 3: 초상 표시** — 실존 인물 초상 옆 "원작 아님"(문구는 원고 `line-not-original`로 추가하고 `ANCHORS`에도 추가), 가상 인물은 이름표 표시로.
- [ ] **Step 4: `PROVENANCE.md`에 그림마다 모델·날짜·참고 이미지·손질 기록. 커밋** — `art: 대륙이동설 그림 교체`
- [ ] **Step 5: 단계 E 끝 — `nos-play-reviewer` 검토(점검표 E 포함).**

---

## 단계 F — 나머지 장면과 정리 페이지

### Task 14: 학회 장면(④)

**Files:**
- Create: `src/game/continental-drift/scenes/DebateScene.ts`
- Modify: `tests/e2e/play.spec.ts`, `tests/e2e/shots.spec.ts`

**Interfaces:**
- Consumes: `UiScene.say/choose`, 앵커 `debate-arrive`, `debate-mechanism-q`, `choice-debate-mechanism`, `debate-landbridge`, `debate-note`
- Produces: 흐름 `say('debate-arrive')` → `say('debate-mechanism-q')` → `const t = await choose('choice-debate-mechanism')` → `say(t)` → `say('debate-landbridge')` → `say('debate-note')` → `scene.start('Puzzle', { phases: ['stripes'], next: 'ending' })`. 배경(회색 상자: 강당 사각형·연단), 화자에 맞춰 연단 쪽 인물 강조.

- [ ] **Step 1: e2e 먼저** — `@e2e 학회 선택지는 무엇을 골라도 다음으로`: 선택지 3개 각각(테스트 3개, 퍼즐은 `playUntil`로 통과) 고른 뒤 `state().scene`이 결국 `Puzzle`이고 phase `stripes`. 화면·`state`에 정답/오답 표시가 없음(UI에 정답 표시 상태 자체가 없음을 `state()` 필드로 확인할 필요는 없고, 같은 장면으로 가는지만 단언). FAIL 확인.
- [ ] **Step 2: 구현 → PASS → shots에 `debate-choice` 추가 → 커밋** — `feat: 학회 장면(④)`

### Task 15: 바다 밑 줄무늬(⑤)

**Files:**
- Create: `scripts/map/build-stripes.ts`, `activities/continental-drift/art/seafloor/*.png`
- Modify: `activities/continental-drift/puzzle.json`(보드 `seafloor` 정의), `PuzzleScene.ts`, `package.json`(`build:stripes`), `tests/e2e/play.spec.ts`

**Interfaces:**
- Produces:
  - `puzzle.json`에 `"boards": { "seafloor": { "ridgeX": 240, "top": 40, "height": 180, "stripes": [w1, w2, ...], "pieces": { "strip-1": { "start": [x,y], "target": [x,y] }, ... } } }`. `stripes`는 해령에서 바깥으로 줄무늬 폭(정상·역전 번갈아, 정수 px) 목록. 왼쪽은 고정 그림, 오른쪽은 세 조각(`strip-1` 가까운 쪽 ~ `strip-3` 먼 쪽)으로 나눠 끈다. `target`은 왼쪽과 거울 대칭 자리.
  - `build-stripes.ts`: 같은 `stripes`로 왼쪽 고정 띠 PNG와 오른쪽 조각 3개(+윤곽·점선)를 만든다(Task 2 `outline`·`dotted` 재사용).
  - `PuzzleScene`이 `board: 'seafloor'`면 같은 `DragBoard`로 띠 조각을 쓴다(무늬 층 없음, 진행 점 숨김).

- [ ] **Step 1: e2e 먼저** — `@e2e 줄무늬 세 조각을 맞추면 마무리로`: `playUntil`로 stripes 단계까지 가서 세 조각을 정답 자리로 → `seafloor-after` 대화 → `state().scene === 'Ending'`. FAIL 확인.
- [ ] **Step 2: 구현 → PASS → shots에 `seafloor` 추가 → 커밋** — `feat: 바다 밑 줄무늬 맞추기(⑤)`

### Task 16: 마무리 장면(⑥), 정리 페이지, 목록 페이지

**Files:**
- Create: `src/game/continental-drift/scenes/EndingScene.ts`, `src/about/main.ts`, `src/home/main.ts`
- Modify: `continental-drift/about/index.html`, `index.html`, `tests/e2e/play.spec.ts`, `tests/e2e/shots.spec.ts`

**Interfaces:**
- Produces:
  - `EndingScene`: 판게아가 갈라져 지금 대륙으로 돌아가는 짧은 칸 단위 연출(약 1초, 각 대륙 `target`→`start`) → `say('ending')` → `location.assign(import.meta.env.BASE_URL + 'continental-drift/about/')`.
  - `src/about/main.ts`: 원고 `page-about`을 `marked`로 HTML로 바꿔 `<main>`에 넣는다. 글꼴은 Galmuri11이 아닌 읽기용 기본 글꼴, 본문 18px 이상, 최대 폭 40em, 스크롤 페이지. 원고 글은 교사가 고치는 신뢰된 파일이지만 `marked`에 HTML 태그 끄기 옵션을 쓴다(원고에 HTML을 쓰지 않는 형식).
  - `src/home/main.ts`: `import.meta.glob('/activities/*/script.md', { query: '?raw', eager: true })`로 활동마다 `line-card-title`·`line-card-desc`를 읽어 카드(링크 `/<id>/`)를 만든다. 페이지 제목 등 플랫폼 문구는 `src/strings.ts`.

- [ ] **Step 1: e2e 먼저** — `@e2e 처음부터 끝까지`(desktop 마우스, tablet 터치): `/`에서 카드 눌러 시작 → `playUntil`로 끝 → URL이 `/continental-drift/about/`, 페이지에 `처음부터 다시 하기`·`목록으로` 링크, 첫 링크를 누르면 타이틀 장면부터(`state().scene === 'Title'`). 진행 중 `history.length`가 늘지 않음(뒤로 가기 = 목록). FAIL 확인.
- [ ] **Step 2: 구현 → PASS → shots에 `ending`, `about`(전체 페이지), `home` 추가**
- [ ] **Step 3: `check.sh --shots --e2e` 통과 후 커밋** — `feat: 마무리 장면, 정리 페이지, 활동 목록`
- [ ] **Step 4: 단계 F 끝 — `nos-content-reviewer`(정리 페이지 글 포함)와 `nos-play-reviewer`를 한 메시지에서 병렬로.** 지적 1회 수정.

---

## 단계 G — 마무리

### Task 17: Review Focus 검사와 끝까지 플레이 검토

**Files:**
- Modify: `tests/e2e/play.spec.ts`, `playwright.config.ts`, `.claude/skills/nos-check/references/play-checklist.md`(사용자가 플레이하며 말한 화면 요구가 있으면)

- [ ] **Step 1: 작은 창** — `@e2e 1280x690 창`: viewport 1280×690에서 canvas 480×360, 가운데, 스크롤 없음. 퍼즐 한 단계를 끌어 맞출 수 있다(배율 1에서도 `toScreen`이 맞다).
- [ ] **Step 2: 크기 바꿈** — `@e2e 퍼즐 중 창 크기 바꿈`: fossil 단계에서 인도를 정답 자리로 끈 뒤 viewport 1024×768 → 1280×690 → 1280×800로 바꾼다. 매번 `state().zoom`이 `pickZoom`과 같고, `scene`·`phase`·`piece('india').snapped`가 그대로, 그 뒤 남극을 끌어 단계가 끝난다.
- [ ] **Step 3: 연타** — `@e2e 대화 연타`: 대화 중 Enter를 한 번에 5번 누르면(`keyboard.press` 5회 연속) 쪽이 최대 5쪽만 넘어가고 선택지가 열려 있을 때 같은 연타로 선택이 한 번만 처리된다(`NosDebug.state()`에 `choiceCount: number`를 더해 1만 늘었는지 확인).
- [ ] **Step 4: `bash .claude/skills/nos-check/scripts/check.sh --shots --e2e` 전체 통과**, 실제 출력 숫자를 장부에 기록.
- [ ] **Step 5: `nos-play-reviewer` 전체 검토**(모든 스크린샷 + e2e 결과). Minor 모음 처리 또는 버림.
- [ ] **Step 6: 커밋** — `test: 작은 창·크기 바꿈·연타 검사, 마무리`
- [ ] **Step 7: 멈춤 — 사용자 플레이테스트 안내**: 처음부터 끝까지 시간 재기(목표 14분 안팎, 15분 초과면 실패 기준), 길 잃은 곳, 실제 노트북·태블릿에서 배율. 배포(Vercel)와 push는 사용자 승인 뒤 별도로.

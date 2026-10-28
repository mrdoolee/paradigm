# 대륙이동설 증거 수집 RPG 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 이 저장소에서는 `nos-build` 스킬이 실행을 맡는다(메인 세션 직접 구현, 단계 끝 검토 서브에이전트).

**Goal:** 한 장면 퍼즐이던 대륙이동설 활동을 마을·항구·항해·미니게임으로 증거를 모으고 연구실 탁자에서 퍼즐을 한 단계씩 맞추는 20분짜리 RPG 흐름으로 바꾼다.

**Architecture:** 진행 순서는 순수 데이터 `ROUTE`와 `Run`(메모리 객체) 하나가 정한다. 장면은 각자 끝날 때 `Run`을 한 칸 넘기고 다음 장면을 연다. 격자 걷기·길찾기는 `src/game/common/`의 공통 부품이다. 마을 지도·항구·미니게임 자료는 활동 폴더의 JSON이다. 대화·선택지·안내 띠는 기존 `Ui` 장면, 퍼즐은 기존 `DragBoard`를 그대로 쓴다.

**Tech Stack:** Phaser 4.2.1, TypeScript ~5.9, Vite 8, Vitest, Playwright(Chromium, desktop 1280×800 / tablet 1024×768 터치).

**Spec:** `docs/superpowers/specs/2026-10-28-continental-drift-rpg-design.md` (바탕: `docs/superpowers/specs/2026-10-27-continental-drift-design.md`)

## Global Constraints

- 480×360 가상 화면, 정수 배율, `pixelArt: true`. 게임 UI에 HTML을 쓰지 않는다(`src/game/**`).
- 게임 글은 `activities/continental-drift/script.md` 한 곳. 코드에 한국어 문장 금지(`src/strings.ts`, 테스트, `scripts/`만 예외).
- `Math.random` 금지. 이모지 금지.
- 정답 판정은 사실에만. 미니게임은 실패·시간 제한·점수 없음.
- 실존 인물 대사는 "사료 각색" 표시, 근거는 `sources.md`. 가상 인물은 "가상 인물". 학생·한별은 발견의 공을 갖지 않는다.
- 대화 중 세계 입력 정지, 세계는 움직이지 않는다. 말 거는 사람·조사할 물건은 y < 240 안.
- 한 번 항해 30초 이내. 활동 전체 20분 이내. `MAX_PAGES` = 70.
- 요금 드는 그림 생성은 사용자 승인됨(2026-10-29). 견본 → 대량 순서, 호출 수를 장부·`PROVENANCE.md`에 기록. 키 값은 어디에도 쓰지 않는다.
- push·배포 금지(사용자 승인 뒤). 커밋 끝: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. 대화창이 열린 채로 마을 칸을 누르거나 방향키를 누름 → 캐릭터가 움직이지 않는다(대화가 넘어갈 뿐). Task 4 e2e.
2. 걷는 중에 다른 칸을 또 누름 → 새 목적지로 길을 바꾸고 칸 사이에 멈추지 않는다(언제나 칸 위에 선다). Task 2 단위 + Task 4.
3. 항해 중 땅·닫힌 항구·다녀온 항구를 누름 → 땅이면 가장 가까운 바다 칸까지, 다녀온 항구면 한 줄 안내 후 계속 항해. 막혀 멈추지 않는다. Task 6.
4. 미니게임에서 같은 칸을 빠르게 여러 번 누르거나 화면 밖으로 끌고 나감 → 끝 조건이 한 번만 발동, 장면이 두 번 바뀌지 않는다. Task 7·9·10.
5. 창 크기를 바꾸거나 1배로 줄어든 작은 창(1280×690)에서 마을·항해 장면 → 누른 칸과 걷는 칸이 같다(좌표 변환). Task 12 robust e2e.

---

## 단계 R1: 순수 논리 (테스트 먼저)

### Task 1: 진행 순서 `ROUTE`와 `Run`

**Files:**
- Create: `src/game/continental-drift/run.ts`
- Test: `tests/unit/run.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Goal =
    | { kind: 'table'; phase: 'coast' | 'fossil' | 'glacier' | 'mountain' }
    | { kind: 'sail'; port: PortId }
    | { kind: 'talk'; town: TownId }
    | { kind: 'field'; game: 'Dig' | 'Scratch' | 'Strata' }
    | { kind: 'debate' } | { kind: 'survey' } | { kind: 'stripes' } | { kind: 'ending' };
  export type PortId = 'hamburg' | 'mumbai' | 'sydney' | 'capetown' | 'newyork';
  export type TownId = 'lab' | 'india' | 'australia' | 'africa';
  export const ROUTE: Goal[];          // 아래 순서 그대로
  export const TOWN_OF_PORT: Record<Exclude<PortId, 'newyork'>, TownId>;
  export class Run {
    constructor(start?: number);       // ROUTE 위치
    readonly index: number;
    get goal(): Goal;
    complete(kind: Goal['kind']): void; // 지금 목표의 kind가 다르면 아무것도 안 함(두 번 발동 방지)
    evidence(): number;                 // 끝낸 field 수 0..3
    portStatus(p: PortId): 'next' | 'visited' | 'closed';
    visitedPorts(): PortId[];
  }
  export function runFromStart(s: string | null): Run; // 개발용 ?evidence=n → 그 증거 수 뒤 첫 table 앞 위치
  ```
- ROUTE 순서: table coast → sail mumbai → talk india → field Dig → table fossil → sail sydney → talk australia → field Scratch → table glacier → sail capetown → talk africa → field Strata → table mountain → sail newyork → debate → survey → stripes → ending.

- [ ] **Step 1: 테스트** — `tests/unit/run.test.ts`:
  - `new Run().goal` = `{kind:'table',phase:'coast'}`.
  - `complete('sail')`를 table 목표에서 부르면 index 그대로.
  - 순서대로 complete를 다 부르면 마지막 goal.kind = 'ending', `evidence()` = 3.
  - `table coast` 끝낸 뒤 `portStatus('mumbai')` = 'next', `portStatus('sydney')` = 'closed', `portStatus('hamburg')` = 'visited'.
  - field Dig까지 끝내면 `portStatus('mumbai')` = 'visited'.
  - `runFromStart('2').goal` = `{kind:'table',phase:'glacier'}`의 바로 앞이 아니라 **table glacier** 자체(증거 2개 모은 뒤 첫 탁자). `runFromStart('0')` = table coast.
- [ ] **Step 2:** `npx vitest run tests/unit/run.test.ts` → FAIL.
- [ ] **Step 3:** 구현. hamburg는 늘 'visited'(출발지). newyork은 table mountain을 끝낸 뒤 'next'.
- [ ] **Step 4:** PASS 확인.
- [ ] **Step 5:** 커밋 `feat: 증거 수집 진행 순서(ROUTE, Run)`.

### Task 2: 격자 길찾기 (공통)

**Files:**
- Create: `src/game/common/grid.ts`
- Test: `tests/unit/grid.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface Cell { x: number; y: number }
  export interface Grid { w: number; h: number; open(x: number, y: number): boolean }
  export function gridFromRows(rows: string[], walkable: string): Grid; // walkable = 걸을 수 있는 글자들
  export function findPath(g: Grid, from: Cell, to: Cell, diagonal?: boolean): Cell[] | null; // BFS, from 제외·to 포함, from==to면 []
  export function nearestOpen(g: Grid, target: Cell, from: Cell): Cell | null; // target이 막힌 칸이면 from에서 갈 수 있는 이웃 칸 중 가장 가까운 칸
  export function pathLength(path: Cell[]): number; // 대각선은 √2
  ```
- 대각선 이동은 두 옆칸이 모두 열려 있을 때만(모서리 뚫기 금지).

- [ ] **Step 1: 테스트** — 3×3 가운데 막힘에서 (0,0)→(2,2) 길이 4칸(4방향), 대각선 허용 시 모서리 뚫기 없이 4칸 이하; 막혀 갈 수 없으면 `null`; `nearestOpen`이 막힌 사람 칸 옆 열린 칸을 고름; 범위 밖 칸은 막힌 것으로 본다; 같은 입력은 늘 같은 길(결정적, 이웃 순서 위·오른쪽·아래·왼쪽).
- [ ] **Step 2–4:** 실패 확인 → 구현 → 통과.
- [ ] **Step 5:** 커밋 `feat: 격자 길찾기(공통)`.

### Task 3: 미니게임 판정 논리

**Files:**
- Create: `src/game/continental-drift/minigames/logic.ts`
- Test: `tests/unit/minigames.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // 화석 발굴: 칸 격자, 화석은 칸 사각형들(자료 고정, 무작위 없음)
  export class DigBoard {
    constructor(cols: number, rows: number, fossils: { x: number; y: number; w: number; h: number }[]);
    dig(x: number, y: number): boolean;      // 새로 걷어 냈으면 true
    isDug(x: number, y: number): boolean;
    found(): number;                          // 모든 칸이 드러난 화석 수
    done(): boolean;                          // found() === fossils.length
  }
  // 빙하 자국: 덮인 흙을 문질러 지움
  export class ScratchField {
    constructor(cols: number, rows: number);
    rub(cx: number, cy: number, r: number): number; // 새로 지운 칸 수
    ratio(): number;                                 // 0..1
  }
  export const SCRATCH_DONE = 0.7;
  // 해저 조사: 지나간 x 구간 기록, 줄무늬 색
  export function stripeAt(dx: number, stripes: number[]): 'normal' | 'reversed'; // 해령에서 거리 |dx|, 해령 띠(stripes[0])는 normal
  export class SurveyTrack {
    constructor(x0: number, x1: number);    // 덮어야 할 구간
    mark(a: number, b: number): void;
    coverage(): number;                      // 0..1
  }
  export const SURVEY_DONE = 0.95;
  ```
- 지층 비교는 `DragBoard`를 다시 쓰므로 여기 없음(Task 10).

- [ ] **Step 1: 테스트** — DigBoard: 화석 2개(2×2) 중 하나의 네 칸을 다 파면 `found()`=1, 같은 칸 두 번 `dig` → 두 번째 false, 범위 밖 false. ScratchField 10×10에서 r=0으로 70칸 지우면 `ratio()`=0.7. `stripeAt(0,[12,7])`='normal', `stripeAt(12,[12,7])`='reversed', `stripeAt(-12,…)`='reversed'(거울). SurveyTrack(0,100) mark(0,50), mark(40,100) → coverage 1; 역방향 mark(60,20)도 같게.
- [ ] **Step 2–4:** 실패 → 구현 → 통과.
- [ ] **Step 5:** 커밋 `feat: 미니게임 판정 논리(발굴·문지르기·해저 조사)`.

## 단계 R2: 첫 한 바퀴 (연구실 → 인도 → 화석 단계)

### Task 4: 마을 장면과 걷기

**Files:**
- Create: `src/game/common/Walker.ts`, `src/game/continental-drift/scenes/TownScene.ts`, `activities/continental-drift/towns/lab.json`, `activities/continental-drift/towns/india.json`, `src/game/continental-drift/towns.ts`
- Modify: `src/game/continental-drift/main.ts`(장면 등록), `scenes/TitleScene.ts`(시작 → `Town {town:'lab', at:'start'}`), `scenes/BootScene.ts`(`?start`, `?evidence`, `?town`), `src/game/common/debug.ts`, `tests/e2e/helpers.ts`
- Test: `tests/e2e/town.spec.ts`

**Interfaces:**
- 마을 JSON:
  ```json
  { "id": "lab", "rows": ["30글자 × 21줄"], "walkable": ".,=",
    "spawn": { "start": [x,y], "port": [x,y], "table": [x,y], "field": [x,y] },
    "things": [ { "id": "table", "kind": "table|port|npc|field|aide", "cell": [x,y], "label": "line-…", "talk": "anchor 또는 null" } ] }
  ```
  칸 16px, 지도 원점 (0, 22)(위쪽 띠 아래). `things`의 칸은 막힌 칸이다(옆에서 조사).
- `Walker` (공통):
  ```ts
  export class Walker {
    constructor(scene: Phaser.Scene, grid: Grid, cell: Cell, origin: Pt, tex: string);
    readonly cell: Cell; facing: 'up'|'down'|'left'|'right';
    walkTo(target: Cell, onArrive: () => void): boolean; // 걷는 중이면 지금 칸 도착 뒤 새 길로
    step(dir: 'up'|'down'|'left'|'right'): void;         // 한 칸(막혔으면 방향만)
    facingCell(): Cell;
    stop(): void;
  }
  export const STEP_MS = 110;
  ```
- `TownScene` (`'Town'`, data `{ town: TownId; at: keyof spawn }`): 마을 그리기(회색 상자: 칸 글자별 색), 사물 이름표(`ui.line(label)`), 지금 목표에 맞는 사물 위 깜박임 표시, 위쪽 띠 `ui.setGuide(goalLine, {done: run.evidence()-1, total: 3})`.
  - 조사(Enter는 바라보는 칸, 누르기는 사물 → `nearestOpen`으로 걸어간 뒤): 목표와 맞으면 진행, 아니면 그 사물의 한 줄(`town-not-yet`) 대화.
  - `table` → `Puzzle {phases:[goal.phase], next:'Town', nextData:{town:'lab', at:'table'}}`; `port` → 선장 대화(`port-captain`) → `Sail {to: run.goal.port}`; `npc` → `talk` 목표면 대화 후 `run.complete('talk')`; `field` → `scene.start(goal.game)`.
  - 처음 연구실 도착 때 `lab-intro`, 지역 도착 때 `<town>-arrive`.
- `run`은 registry `'run'`. Boot에서 `runFromStart(params.evidence)`.
- debug: `dbg.town`, `__nos.goalPoint(): Pt | null`(지금 목표 사물 칸 가운데의 가상 좌표), `__nos.player(): Cell | null`.
- helpers `playUntil`: `Town`이면 `goalPoint`를 누른다(tap/click).

- [ ] **Step 1: e2e 먼저** `tests/e2e/town.spec.ts` (@e2e): `?start=Town` → 연구실 칸을 누르면 플레이어가 그 칸에 도착(`player()`), 대화가 열린 동안 방향키·칸 누르기로 플레이어 칸이 바뀌지 않음, 방향키 한 번 = 한 칸, 탁자를 누르면 걸어가서 `Puzzle` 장면이 열림.
- [ ] **Step 2:** 실패 확인 `npx playwright test tests/e2e/town.spec.ts`.
- [ ] **Step 3:** 구현. 원고에 필요한 앵커를 임시 문장으로 추가하고 `anchors.ts`에 등록(Task 11에서 다시 씀).
- [ ] **Step 4:** 통과 + `bash .claude/skills/nos-check/scripts/check.sh`.
- [ ] **Step 5:** 커밋 `feat: 마을 장면과 격자 걷기`.

### Task 5: 퍼즐을 한 단계씩

**Files:**
- Modify: `src/game/common/DragBoard.ts`(`setPhase(movable, patterns: string[])` — 여러 무늬 표시), `scenes/PuzzleScene.ts`, `scenes/EndingScene.ts`(필요하면), `tests/e2e/play.spec.ts`·`flow.spec.ts`(새 흐름에 맞게)

**Interfaces:**
- `PuzzleData` 에 `nextData?: object` 추가. 주어진 첫 단계보다 앞 world 단계의 움직일 대륙은 정답 자리에서 시작(고정, 흐리지 않음). 무늬는 앞 단계들 + 지금 단계 것을 모두 켠다.
- 단계가 끝나면 `run.complete('table')`(world) 또는 `run.complete('stripes')` 뒤 `next`로.
- 산맥 단계 끝 연출(`flashAll` + `mountain-after` + `merge-after`)은 그대로.

- [ ] **Step 1:** e2e: `?start=Puzzle&phases=glacier`에서 남아메리카·인도·남극이 정답 자리(`snapped`)이고 움직일 대륙은 오스트레일리아만, 끝나면 `Town`.
- [ ] **Step 2–4:** 실패 → 구현 → 통과.
- [ ] **Step 5:** 커밋 `feat: 탁자 퍼즐을 한 단계씩, 앞 단계 고정`.

### Task 6: 항해 장면

**Files:**
- Create: `scenes/SailScene.ts`, `src/game/continental-drift/sea.ts`, `activities/continental-drift/sail.json`, `scripts/map/build-sea.ts`(+ `package.json` `build:sea`), `activities/continental-drift/art/sea/sea-grid.json`(생성물)
- Test: `tests/unit/sea.test.ts`, `tests/e2e/sail.spec.ts`

**Interfaces:**
- `sail.json`: `{ "cell": 4, "speedCellsPerSec": n, "ports": { "<PortId>": { "at": [px,py], "label": "line-port-<id>" } }, "open": [[cx,cy],...], "block": [[cx,cy],...] }` — `open`/`block`은 손으로 고치는 덧칸(해협·운하·항구).
- `build-sea.ts`: 대륙 마스크를 오늘 위치(`pieces.json` start)에 놓고 칸마다 가운데 픽셀이 땅이면 막힘 → `sea-grid.json { w, h, cell, rows: string[] }` ('.' 바다, '#' 땅).
- `sea.ts`: `seaGrid(): Grid`(덧칸 적용), `portCell(id): Cell`, `sailSeconds(from, to): number`.
- `SailScene` (`'Sail'`, data `{ to: PortId } | { returnTo: 'hamburg' }`): 오늘 대륙(회색 상자: 대륙 마스크 + 색), 배, 항구 점(next는 깜박임, visited는 흐림, closed는 안 보임). 방향키 8방향 연속 이동(막힌 칸 못 감), 바다·항구 누르기 → 길따라 이동(땅을 누르면 가장 가까운 바다 칸). next 항구 도착 → `run.complete('sail')` → `Town {town, at:'port'}` 또는 newyork이면 `Debate`. visited 항구 도착 → `sail-visited` 대화 후 계속. `returnTo` → 조작 없이 5초 이내로 함부르크까지 미끄러지고 `Town {town:'lab', at:'port'}`.
- debug: `__nos.goalPoint()`가 Sail에선 목표 항구 좌표.

- [ ] **Step 1: 테스트** — `sea.test.ts`: 함부르크에서 뭄바이·시드니·케이프타운·뉴욕까지 길이 있다, 각 `sailSeconds` ≤ 30, 모든 항구 칸이 바다. e2e: 키보드 오른쪽 누름 → 배 x 증가, 땅을 눌러도 배가 땅 위에 서지 않음, 목표 항구 누르기 → `Town india`.
- [ ] **Step 2–4:** `npm run build:sea` → 실패 확인 → 구현·덧칸 조정 → 통과.
- [ ] **Step 5:** 커밋 `feat: 세계 지도 항해`.

### Task 7: 화석 발굴 미니게임과 귀환

**Files:**
- Create: `scenes/DigScene.ts`, `activities/continental-drift/minigames.json`(dig 칸 수·화석 사각형)
- Test: `tests/e2e/minigames.spec.ts`(dig 부분)

**Interfaces:**
- `minigames.json`: `{ "dig": { "cols": 12, "rows": 6, "cell": 24, "origin": [x,y], "fossils": [{x,y,w,h},...] }, "scratch": {...}, "strata": {...}, "survey": {...} }`.
- `DigScene` (`'Dig'`): `dig-before` → 띠 `line-guide-dig`(+ 찾은 수) → 누르기·끌기로 칸 걷기, 키보드는 커서 칸(방향키) + Enter → `done()` 한 번만 → `dig-after` → `run.complete('field')` → `Sail {returnTo:'hamburg'}`.
- debug: `__nos.minigame(): { kind: string; todo: Pt[] }`(아직 할 칸의 가상 좌표). helpers `playUntil`이 미니게임에서 `todo[0]`을 누른다.

- [ ] **Step 1:** e2e: 같은 칸 연타해도 장면이 한 번만 바뀜(Review Focus 4), 모든 화석 칸을 누르면 `Sail` → `Town lab`.
- [ ] **Step 2–4:** 실패 → 구현 → 통과.
- [ ] **Step 5:** 커밋 `feat: 화석 발굴 미니게임과 귀환 항해`.

## 단계 R3: 나머지 지역·학회·해저

### Task 8: 오스트레일리아·남아프리카 마을

**Files:** Create `towns/australia.json`, `towns/africa.json`; Modify `towns.ts`, `script.md`(임시 앵커), `anchors.ts`.
- [ ] e2e: `?start=Town&town=australia&evidence=1` 에서 과학자 대화 → 현장 입구 열림. 커밋 `feat: 오스트레일리아·남아프리카 마을`.

### Task 9: 빙하 자국 미니게임

**Files:** Create `scenes/ScratchScene.ts`; Modify `minigames.json`.
- 바위 판(약 320×160)에 흙 덮개, 문지르기 반지름 2칸, 키보드는 붓 커서를 방향키로 움직이면 지나간 자리 지움. 덮개 아래 찰흔(가는 평행선)과 `ratio() ≥ SCRATCH_DONE`이면 얼음 흐름 화살표. 끝나면 `scratch-after` → field 완료 → 귀환.
- [ ] e2e(같은 파일): 끌기로 끝까지, 화면 밖으로 끌고 나가도 오류 없음. 커밋 `feat: 빙하 자국 미니게임`.

### Task 10: 지층 비교 미니게임 + 남쪽 습곡대 무늬

**Files:** Create `scenes/StrataScene.ts`, `scripts/map/build-strata.ts`(회색 상자 지층 표본 PNG·외곽선, `build:strata`); Modify `minigames.json`, `patterns.json`(mountain에 케이프–벤타나 선, `source: "S-DUTOIT-1927"`), `npm run build:masks` 재생성.
- 왼쪽: 남아프리카 지층 기둥(고정 그림, 층 4개). 오른쪽: 남아메리카 표본 4개를 `DragBoard`로 끌어 같은 높이 칸에 맞춘다(정답 자리 = 같은 층 칸, 아니면 놓은 자리에 머묾. 기존 퍼즐과 같은 규칙). 층 이름 이름표는 원고 `line-strata-<n>`.
- [ ] e2e: 네 표본을 맞추면 귀환. 산맥 단계 스크린샷에서 남쪽 선이 이어져 보임. 커밋 `feat: 지층 비교 미니게임, 남쪽 습곡대 무늬`.

### Task 11: 뉴욕 학회 → 해저 조사 → 줄무늬 → 마무리

**Files:** Create `scenes/SurveyScene.ts`; Modify `DebateScene.ts`(끝나면 `run.complete('debate')` → `Survey`), `PuzzleScene`(stripes 다음 `Ending`).
- `SurveyScene`: `survey-before`(30여 년 뒤, "사료를 바탕으로 꾸민 장면") → 바다 단면 위 조사선, 좌우 이동(방향키·누르기·끌기), 배가 지나간 x 구간 아래에 `stripeAt` 색 줄무늬를 칠함(`seafloor.json` stripes·색). `coverage() ≥ SURVEY_DONE` → `survey-after` → `Puzzle {phases:['stripes'], next:'Ending'}`.
- [ ] e2e `flow.spec.ts`: 처음부터 정리 페이지까지(desktop·tablet). 커밋 `feat: 학회·해저 조사·마무리 연결`.

## 단계 R4: 원고

### Task 12: 사실 확인 → 원고 → 점검 → 검토

**Files:** Modify `activities/continental-drift/sources.md`, `script.md`, `src/game/continental-drift/anchors.ts`(`MAX_PAGES = 70`), `src/script/check.ts`(필요 시), 정리 페이지 글.
- 사실 확인(`nos-content-reviewer`에게 맡겨도 됨): 사니(1920년대 중반 소속, 대륙이동 관련 시점), 데이비드(찰흔·빙하 연구, 대륙이동에 대한 태도), 뒤 토이트(1926 무렵, 1927 비교의 지층 순서 — 빙하 퇴적층·메소사우루스 셰일·사암/이암·현무암), 케이델 1913, 항구 도시와 1920년대 항로, 수에즈·파나마 운하, 1926 뉴욕 심포지엄, 세 사람 초상 사진의 퍼블릭 도메인 여부. 확인 안 된 것은 원고에 단정하지 않는다.
- 원고: 등장인물(sahni·david·dutoit = 사료 각색, captain = 가상 인물), 과학자당 4~5쪽 이내, 미니게임 앞뒤, 무늬가 켜질 때 "다른 연구자들의 자료" 한 줄, 카드 설명 "(약 20분)", 정리 페이지 한 줄 추가.
- `nos-script` 절차: humanize-korean 점검(바꿀 문장 목록만) → 반영 → `npm run check:script` ≤ 70쪽.
- 검토: `nos-content-reviewer`(sonnet) → Critical·Important 고침 → 같은 검토자 재검토 1회.
- [ ] 커밋 `content: 증거 수집 원고와 사료`.

## 단계 R5: 끝까지 플레이와 견고성

### Task 13: e2e·스크린샷·플레이 검토

**Files:** Modify `tests/e2e/robust.spec.ts`(작은 창 1280×690과 창 크기 바꿈을 Town·Sail에도), `shots.spec.ts`(마을·항해·미니게임 넷·탁자 단계마다), `helpers.ts`.
- [ ] `check.sh --shots --e2e` 통과. `nos-play-reviewer`(sonnet)로 스크린샷·플레이 결과 검토 → 고침 1회. 커밋 `test: 새 흐름 끝까지 플레이·스크린샷`.

## 단계 R6: 그림

### Task 14: STYLE 보강 → 견본 → 대량 → 끼우기

**Files:** Modify `activities/continental-drift/art/STYLE.md`, `palette.json`, `art/PROVENANCE.md`; Create `art/prompts/*.txt`, `art/town/*`, `art/chars/*`, `art/sail/*`, `art/minigames/*`, `art/portraits/*`; Modify 장면들(그림이 있으면 그림, 없으면 회색 상자).
- 그림 키 규칙: `ART['<폴더>/<이름>']`가 있으면 이미지, 없으면 지금 회색 상자 그리기. 회색 상자 경로는 지우지 않는다.
- 견본(약 6~8호출): 마을 타일 묶음, 학생 걷기 4방향, 한별 초상, 대륙 하나(아프리카) 질감, 항해 바다 배경, 화석 발굴 배경. → 스스로 대조 시트로 판정(사용자 결정: 알아서) → 대량: 나머지 대륙, 지역 마을 타일 변형, 과학자 서 있는 모습, 선장, 배 둘, 미니게임 배경 셋, 강당 배경, 해저 배경, 창 테두리. 실존 과학자 초상은 퍼블릭 도메인 진본이 확인된 경우만.
- 호출 수는 `tools/art-runs/calls.jsonl`과 장부에. 원본은 git 밖(`tools/art-runs/`).
- [ ] `check.sh --shots --e2e` 통과, `nos-play-reviewer` 검토(그림 일관성 포함) 1회. 커밋 `art: …`.

### Task 15: 마무리

- [ ] CLAUDE.md 문서 표에 새 설계·계획 추가, "한 활동 10~15분"에 "대륙이동설은 사용자 결정으로 20분" 한 줄. 장부 정리. 마지막 `check.sh --shots --e2e`, `npm run build`. 커밋 `docs: …`. push·배포 하지 않음. 사용자에게 아침 보고.

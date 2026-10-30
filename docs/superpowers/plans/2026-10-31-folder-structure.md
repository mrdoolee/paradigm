# 폴더 구조 정리 계획 (2026-10-31)

사용자 승인: 2026-10-31 ("rpg층 만들어줘. git에 안 올리는 작업 폴더도 정리 진행해. 하네스랑 전부 같이 수정"). 실행: 메인 세션 직접. push·배포 없음.

목표: 주제(활동)를 계속 더해 가는 고전 RPG 형태에 맞게, 한 주제의 파일은 한 폴더에, 공통 부품은 `src/`에 둔다. **동작은 바꾸지 않는다**(파일 위치·경로만).

## 결과 구조

```
src/
  engine/            모든 게임 공통: 화면·배율, UI 장면(대화창·선택지·안내 띠), 입력, 끌어 맞추기, 디버그
    script/          원고 읽기·쪽 나누기·줄바꿈·검사
  rpg/               고전 RPG 틀: 걷기(Walker), 칸 길찾기(grid), 정리 창(SummaryScene)
  home/              첫 화면 목록
  strings.ts         플랫폼 공통 문구(코드 속 한국어 허용 한 곳)
activities/<id>/
  index.html         게임 페이지 (주소는 /<id>/)
  script.md sources.md *.json towns/ art/
  game/              이 주제만의 장면·로직 (main.ts, anchors.ts 포함)
  tools/             이 주제 전용 생성 도구 (map/, art/)
  tests/unit/ tests/e2e/
scripts/             공통 도구: 원고 검사, 글꼴 폭, 효과음, 그림 생성·후처리(gen·cut·bg·chalk)
tests/unit/ tests/e2e/   공통 테스트, e2e helpers
work/                git 밖 작업 폴더 하나로
  ledger/<id>/       장부(progress.md)·검토 결과   ← _workspace/
  art-runs/          그림 생성 원본·참고 사진·호출 기록 ← tools/art-runs/
  data/              내려받은 원본 자료(지도·지진·화산)  ← tools/geo/
  debug/             디버그 화면·로그                 ← tools/dbg/, tools/sea-preview.png
  sprite-gen/        (설치했을 때) 그림 생성 도구      ← tools/sprite-gen/
```

- 가져오기 별칭: `@engine/*` → `src/engine/*`, `@rpg/*` → `src/rpg/*` (Vite·tsc·tsx·Playwright 공통).
- 게임 페이지는 Vite 플러그인이 `activities/*/index.html`을 스스로 찾는다. 개발 서버는 `/<id>/`를 그 파일로 돌리고, 빌드는 `dist/<id>/index.html`로 낸다.
- 테스트는 `tests/`와 `activities/*/tests/`를 둘 다 찾는다.
- 마을 장면·제목·항해는 대륙이동설 전용 내용이 박혀 있어 이번엔 옮기지 않는다(2단계: 두 번째 주제 설계 때 일반화).
- 지난 날짜의 설계·계획 문서(docs/superpowers)는 그때 기록이라 경로를 고치지 않는다.

## 순서

| # | 할 일 | 확인 |
|---|---|---|
| 0 | 옮기기 전 스크린샷 56장을 `work/debug/before-shots/`에 | 장 수 |
| 1 | 작업 폴더 → `work/`, `.gitignore` | 파일 수·크기 같음 |
| 2 | `src/game/common` + `src/script` → `src/engine`, Walker·grid·SummaryScene → `src/rpg`, 별칭 | 타입·단위 |
| 3 | `src/game/continental-drift` → `activities/continental-drift/game`, 페이지 `index.html`, Vite 플러그인 | 타입·빌드·개발 서버 응답 |
| 4 | `scripts/map`, 정리 그림 도구 → `activities/continental-drift/tools`, package.json | build:masks·sea·stripes 결과가 git 차이 없음 |
| 5 | 전용 테스트 → `activities/continental-drift/tests`, vitest·playwright 설정 | 단위 전체 |
| 6 | 규칙 검사·편집 훅·check-script(anchors 경로) | 규칙 검사, 일부러 위반한 파일로 훅 확인 |
| 7 | 하네스 문서: CLAUDE.md, nos-build·nos-check·nos-art·nos-script·nos-gamedev, 에이전트 3, PROVENANCE, 메모 | 옛 경로 grep 0 |
| 8 | 전체 검증: 규칙·타입·단위·원고·빌드, e2e 파일별 단일 워커, 스크린샷 픽셀 비교 | 모두 통과, 스크린샷 같음 |

묶음마다 커밋. `git mv`로 옮겨 이력을 남긴다.

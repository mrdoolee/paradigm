---
name: nos-check
description: NOS 활동 저장소의 검증을 한 번에 돌린다 — 규칙 검사, 타입 검사, 단위 테스트, 원고 검사(대화 쪽 넘침·원고 총량·금지 표현), 선택적으로 스크린샷과 끝까지 플레이 e2e. "검증해 줘", "테스트 다 돌려", "커밋 전에 확인", "규칙 위반 있나", "스크린샷 찍어 줘" 같은 요청이나 태스크 마무리 때 쓴다. 원고 문장 다듬기(→ nos-script)나 화면이 재미있고 매끄러운지 판정(→ nos-play-reviewer 에이전트)에는 쓰지 않는다.
---

# NOS 검증

## 한 번에 돌리기

```bash
bash .claude/skills/nos-check/scripts/check.sh            # 규칙·타입·테스트·원고
bash .claude/skills/nos-check/scripts/check.sh --shots    # + 스크린샷
bash .claude/skills/nos-check/scripts/check.sh --e2e      # + 끝까지 플레이
```

- 아직 없는 npm 명령(뼈대 전)은 건너뛰고 "없음"으로 알린다. 실패를 숨기지 않는다.
- 커밋 전에는 기본(인자 없음)을 돌린다. 화면을 바꾼 태스크는 `--shots`까지.
- 결과를 말할 때는 실제 출력의 숫자(테스트 수, 오류 수)를 그대로 옮긴다. 돌리지 않은 것을 통과로 말하지 않는다.

## 이 저장소가 갖출 npm 명령 (단계 A에서 만든다)

| 명령 | 하는 일 |
|---|---|
| `typecheck` | `tsc --noEmit` |
| `test` | Vitest 단위 테스트 |
| `check:script` | 모든 `activities/*/script.md` 검사: 앵커·화자 표시, **대화 한 쪽 넘침**(실행과 같은 줄 바꿈 함수), **원고 총량**(대화 쪽 수 상한, 처음 값 45쪽), 금지 표현 |
| `shots` | Playwright로 주요 장면 스크린샷 → `test-results/screens/<project>-<장면>.png` (project = `desktop` 1280×800, `tablet` 1024×768 터치) |
| `e2e` | 끝까지 플레이(두 project) |

## 규칙 검사 (`scripts/rules-check.mjs`)
편집 훅이 고친 파일마다 돌리고, `check.sh`가 저장소 전체에 돌린다. 오류면 종료 코드 1.
- **코드 안 한국어 문장 금지** (`src/**/*.ts`, 주석·테스트·`src/strings.ts` 제외): 게임 문장은 원고에. 이유: 교사가 고칠 수 있는 곳이 한 곳이어야 한다.
- **게임 화면에 HTML 겹치기 금지** (`src/game/**`에서 `this.add.dom`, `document.createElement`): 이유: 대화창이 화면을 미는 문제의 근원(설계 6절).
- **`Math.random` 금지**: 같은 입력이면 같은 화면이어야 스크린샷·e2e가 안정적이다. 필요하면 시드 난수.
- **이모지 금지** (▶▼◀▲ 같은 도형 기호는 허용).
- **원고 금지 표현**(경고): "렌즈", "카드 획득"처럼 사용자가 빼기로 한 장치 이름.

## 플레이 점검표
`references/play-checklist.md` — `nos-play-reviewer`가 판정 기준으로 쓴다. 사용자가 플레이하며 말한 화면 요구는 여기에 항목으로 옮겨 적는다(다음 검토부터 기준이 된다).

#!/usr/bin/env bash
# NOS 검증 한 번에: 규칙 → 타입 → 테스트 → 원고 [→ 스크린샷] [→ e2e]
# 사용: bash .claude/skills/nos-check/scripts/check.sh [--shots] [--e2e]
set -u
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

SHOTS=0; E2E=0
for a in "$@"; do
  case "$a" in
    --shots) SHOTS=1 ;;
    --e2e) E2E=1 ;;
    *) echo "모르는 인자: $a"; exit 2 ;;
  esac
done

FAIL=0
step() { echo; echo "== $1"; }
has_script() { [ -f package.json ] && node -e "process.exit(require('./package.json').scripts?.['$1'] ? 0 : 1)" 2>/dev/null; }
run_npm() {
  if has_script "$1"; then
    npm run -s "$1" || { echo "실패: npm run $1"; FAIL=1; }
  else
    echo "없음: npm run $1 (아직 만들지 않음 — 건너뜀)"
  fi
}

step "규칙 검사"
node .claude/skills/nos-check/scripts/rules-check.mjs || FAIL=1

step "타입 검사";   run_npm typecheck
step "단위 테스트"; run_npm test
step "원고 검사";   run_npm check:script
[ $SHOTS = 1 ] && { step "스크린샷"; run_npm shots; }
[ $E2E = 1 ] && { step "끝까지 플레이"; run_npm e2e; }

echo
if [ $FAIL = 0 ]; then echo "결과: 통과"; else echo "결과: 실패 (위 '실패'·'오류' 줄 확인)"; fi
exit $FAIL

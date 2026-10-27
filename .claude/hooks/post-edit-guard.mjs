#!/usr/bin/env node
// PostToolUse(Edit|Write) 훅: 고친 파일 하나에 규칙 검사를 돌리고,
// 원고(script.md)를 고쳤으면 한국어·교육 규칙 점검을 상기시킨다.
// 규칙 오류는 종료 코드 2로 Claude에게 되돌려 바로 고치게 한다.
import { spawnSync } from "node:child_process";
import { relative, sep } from "node:path";

let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let filePath;
  try {
    filePath = JSON.parse(raw)?.tool_input?.file_path;
  } catch {
    process.exit(0);
  }
  if (!filePath) process.exit(0);

  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const rel = relative(root, filePath).split(sep).join("/");
  if (rel.startsWith("..") || !/^(src|activities|scripts|tests)\//.test(rel)) process.exit(0);

  const r = spawnSync(process.execPath, [".claude/skills/nos-check/scripts/rules-check.mjs", rel], { cwd: root, encoding: "utf8" });
  if (r.status === 1) {
    process.stderr.write(`규칙 위반 (${rel}):\n${r.stderr}`);
    process.exit(2);
  }

  if (/^activities\/[^/]+\/script\.md$/.test(rel)) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext:
          "원고(script.md)를 고쳤다. nos-script 절차대로 humanize-korean 점검과 교육·사료 규칙(정답은 사실에만, 신화 금지, 가상 인물 표시, 마지막 잠정성)을 확인하고 check:script를 돌린다.",
      },
    }));
  }
  process.exit(0);
});

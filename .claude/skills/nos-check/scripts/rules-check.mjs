#!/usr/bin/env node
// NOS 활동 저장소 규칙 검사.
// 사용: node rules-check.mjs           → 저장소 전체(src, activities, scripts, tests)
//       node rules-check.mjs <파일...>  → 지정한 파일만 (편집 훅에서 사용)
// 오류(종료 코드 1): 코드 속 한국어 문장, 게임 화면의 HTML 겹치기, Math.random, 이모지
// 경고(종료 코드 0): 원고의 금지 표현
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["src", "activities", "scripts", "tests"];
const EXT = /\.(ts|tsx|js|mjs|md)$/;
const SKIP = new Set(["node_modules", "dist", ".git", "test-results", "playwright-report"]);

const HANGUL = /[가-힣]/;
const EMOJI = /\p{Extended_Pictographic}/u;
const ALLOWED_SYMBOLS = /[▶◀▼▲©®™]/g;
// 사용자가 빼기로 한 장치 이름 (2026-10-27)
const BANNED_WORDS = ["렌즈", "카드 획득", "카드를 획득"];

function walk(dir, out) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (EXT.test(name)) out.push(p);
  }
  return out;
}

const norm = (p) => relative(ROOT, p).split(sep).join("/");
const isTest = (f) => /\.(test|spec)\.(ts|tsx)$/.test(f) || /^(activities\/[^/]+\/)?tests\//.test(f);
// 한국어가 허용되는 코드: 테스트, 플랫폼 공통 문구 한 곳, 도구(공통 scripts/, 주제별 activities/<id>/tools/ — 교사용 오류 메시지·사용법)
const hangulOk = (f) => isTest(f) || f === "src/strings.ts" || /^(activities\/[^/]+\/tools|scripts)\//.test(f);
// 게임 화면 코드: 공통 엔진·RPG 틀, 주제별 장면
const isGameCode = (f) => /^(src\/engine|src\/rpg|activities\/[^/]+\/game)\//.test(f);

const files = process.argv.length > 2
  ? process.argv.slice(2).map((p) => resolve(ROOT, p)).filter((p) => existsSync(p))
  : SCAN_DIRS.flatMap((d) => walk(join(ROOT, d), []));

const errors = [];
const warnings = [];

for (const abs of files) {
  const f = norm(abs);
  if (!EXT.test(f) || f.startsWith(".claude/") || f.startsWith("docs/")) continue;
  const lines = readFileSync(abs, "utf8").split(/\r?\n/);
  const isCode = /\.(ts|tsx|js|mjs)$/.test(f);
  const isScript = /^activities\/[^/]+\/.*\.md$/.test(f);
  let inBlock = false;
  lines.forEach((raw, i) => {
    const at = `${f}:${i + 1}`;
    if (isCode) {
      // 주석을 지운 코드만 본다
      let line = raw;
      if (inBlock) { const e = line.indexOf("*/"); if (e < 0) return; line = line.slice(e + 2); inBlock = false; }
      line = line.replace(/\/\*.*?\*\//g, "");
      const s = line.indexOf("/*"); if (s >= 0) { line = line.slice(0, s); inBlock = true; }
      line = line.replace(/\/\/.*$/, "");
      if (/\bMath\.random\s*\(/.test(line)) errors.push(`${at}  Math.random() 금지 — 시드 난수를 쓴다(스크린샷·e2e가 같은 화면을 보도록)`);
      if (EMOJI.test(line.replace(ALLOWED_SYMBOLS, ""))) errors.push(`${at}  이모지 금지`);
      if (!hangulOk(f) && HANGUL.test(line)) errors.push(`${at}  코드 속 한국어 문장 — 원고(activities/<id>/script.md)나 src/strings.ts로 옮긴다`);
      if (isGameCode(f) && (/\.add\.dom\s*\(/.test(line) || /document\.createElement\s*\(/.test(line))) {
        errors.push(`${at}  게임 화면에 HTML 겹치기 금지 — 대화창·선택지·안내 띠는 UI 장면에 캔버스로 그린다(설계 6절)`);
      }
    }
    if (isScript) {
      for (const w of BANNED_WORDS) if (raw.includes(w)) warnings.push(`${at}  금지 표현 "${w}" — 사용자가 빼기로 한 장치 이름`);
      if (EMOJI.test(raw.replace(ALLOWED_SYMBOLS, ""))) errors.push(`${at}  이모지 금지`);
    }
  });
}

for (const w of warnings) console.log(`경고  ${w}`);
for (const e of errors) console.error(`오류  ${e}`);
console.log(`규칙 검사: 파일 ${files.length}개, 오류 ${errors.length}건, 경고 ${warnings.length}건`);
process.exit(errors.length ? 1 : 0);

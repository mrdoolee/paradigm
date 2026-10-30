// 원고 검사: activities/*/script.md 를 검사해 교사가 읽을 수 있는 한국어 메시지로 알린다.
// 사용: npm run check:script
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { checkScript, MAX_SPEECH_PAGES, type IssueCode } from '../src/engine/script/check';
import type { BlockKind } from '../src/engine/script/parse';

const MESSAGES: Record<IssueCode, (d: string) => string> = {
  NO_CHARACTERS: () => '"## 등장인물" 표가 없습니다.',
  BAD_CHARACTER_ROW: (d) => `등장인물 표의 줄 형식이 맞지 않습니다(칸 4개: id | 이름 | 표시 | 초상): ${d}`,
  BAD_MARK: (d) => `표시는 "가상 인물", "사료 근거", "사료 각색", "-" 중 하나여야 합니다: ${d}`,
  DUP_ANCHOR: (d) => `같은 앵커가 두 번 있습니다: @${d}`,
  BAD_SPEECH: (d) => `대화 줄은 "id: 말" 형식이어야 합니다: ${d}`,
  UNKNOWN_SPEAKER: (d) => `등장인물 표에 없는 화자입니다: ${d}`,
  BAD_CHOICE: (d) => `선택지 줄은 "- 보이는 글 -> @앵커" 형식이어야 합니다: ${d}`,
  LINE_NOT_SINGLE: (d) => `@${d} 는 한 줄만 쓸 수 있습니다.`,
  EMPTY_BLOCK: (d) => `@${d} 아래에 내용이 없습니다.`,
  MISSING_ANCHOR: (d) => `게임이 쓰는 앵커가 없습니다: @${d}`,
  WRONG_KIND: (d) => `앵커 종류가 게임이 기대하는 것과 다릅니다: ${d}`,
  BAD_TARGET: (d) => `선택지가 가리키는 대화 앵커가 없습니다: @${d}`,
  SPEECH_TOO_LONG: (d) => `말 하나가 대화창 ${d}쪽입니다(최대 ${MAX_SPEECH_PAGES}쪽). 두 말로 나누세요.`,
  LINE_TOO_WIDE: (d) => `한 줄에 들어가지 않습니다: ${d}`,
  GUIDE_TOO_WIDE: (d) => `안내 띠 한 줄에 들어가지 않습니다: ${d}`,
  CHOICE_TOO_WIDE: (d) => `선택지 창 한 줄에 들어가지 않습니다: ${d}`,
  NAME_TOO_WIDE: (d) => `이름표가 너무 깁니다: ${d}`,
  TOTAL_PAGES: (d) => `대화가 너무 깁니다: ${d}쪽(활동 시간을 넘을 수 있습니다).`,
  OPTIONAL_PAGES: (d) => `마을 사람 대화(@npc-)가 너무 깁니다: ${d}쪽.`,
  SUMMARY_TOO_LONG: (d) => `정리 페이지가 정리 창에 다 들어가지 않습니다: ${d}쪽.`,
  MISSING_GLYPH: (d) => `글꼴(Galmuri11)에 없는 글자라 화면에 빈 네모로 나옵니다: ${d}`,
};

async function main() {
  const root = 'activities';
  let failed = false;
  for (const id of readdirSync(root)) {
    const file = `${root}/${id}/script.md`;
    if (!existsSync(file)) continue;
    const anchorsPath = resolve(`activities/${id}/game/anchors.ts`);
    if (!existsSync(anchorsPath)) {
      console.error(`${file}: activities/${id}/game/anchors.ts 가 없어 검사할 수 없습니다.`);
      failed = true;
      continue;
    }
    const mod = (await import(pathToFileURL(anchorsPath).href)) as {
      ANCHORS: Record<string, BlockKind>;
      MAX_PAGES: number;
      MAX_OPTIONAL_PAGES?: number;
    };
    const r = checkScript(readFileSync(file, 'utf8'), {
      required: mod.ANCHORS,
      maxPages: mod.MAX_PAGES,
      maxOptionalPages: mod.MAX_OPTIONAL_PAGES,
    });
    for (const i of r.issues) console.error(`${file}:${i.line}  ${MESSAGES[i.code](i.detail)}`);
    console.log(`${file}: 대화 ${r.totalPages}쪽 / 상한 ${mod.MAX_PAGES}쪽 (약 ${Math.round((r.totalPages * 6) / 60)}분 읽기)`);
    if (r.optionalPages) console.log(`  마을 사람 대화(골라 듣기) ${r.optionalPages}쪽 / 상한 ${mod.MAX_OPTIONAL_PAGES ?? '-'}쪽`);
    console.log(
      '  ' + Object.entries(r.pagesByAnchor).map(([a, n]) => `${a} ${n}`).join(', '),
    );
    if (r.issues.length) {
      console.error(`${file}: 오류 ${r.issues.length}건`);
      failed = true;
    }
  }
  process.exit(failed ? 1 : 0);
}

void main();

// Pure script checks shared by the CLI (scripts/check-script.ts) and tests.
import { BODY, CHOICE_TEXT_W, LINE_W, TOPBAR_TEXT_W } from '../game/common/layout';
import { galmuriMeasure, galmuriTable, missingChars, type Measure, type WidthTable } from './measure';
import { parseScript, type BlockKind, type ParseErrorCode } from './parse';
import { pagesFor, wrapText } from './wrap';

export type IssueCode =
  | ParseErrorCode
  | 'MISSING_ANCHOR'
  | 'WRONG_KIND'
  | 'BAD_TARGET'
  | 'SPEECH_TOO_LONG'
  | 'LINE_TOO_WIDE'
  | 'GUIDE_TOO_WIDE'
  | 'CHOICE_TOO_WIDE'
  | 'NAME_TOO_WIDE'
  | 'TOTAL_PAGES'
  | 'MISSING_GLYPH';
export interface Issue {
  code: IssueCode;
  line: number;
  detail: string;
}
export interface CheckResult {
  issues: Issue[];
  totalPages: number;
  pagesByAnchor: Record<string, number>;
}

export const MAX_SPEECH_PAGES = 2;
export const NAME_SEP = ' · ';

export function checkScript(
  text: string,
  opts: { required: Record<string, BlockKind>; maxPages: number; measure?: Measure; table?: WidthTable },
): CheckResult {
  const measure = opts.measure ?? galmuriMeasure;
  const table = opts.table ?? galmuriTable;
  const { script, errors } = parseScript(text);
  const issues: Issue[] = errors.map((e) => ({ ...e }));
  const pagesByAnchor: Record<string, number> = {};
  let totalPages = 0;

  for (const [anchor, kind] of Object.entries(opts.required)) {
    const b = script.blocks.get(anchor);
    if (!b) issues.push({ code: 'MISSING_ANCHOR', line: 1, detail: anchor });
    else if (b.kind !== kind) issues.push({ code: 'WRONG_KIND', line: b.line, detail: `${anchor}: ${kind}` });
  }

  const glyphs = (s: string, line: number) => {
    const miss = missingChars(table, s);
    if (miss.length) issues.push({ code: 'MISSING_GLYPH', line, detail: miss.join(' ') });
  };
  const oneLine = (s: string, w: number) => wrapText(s, measure, w).length <= 1;

  for (const c of script.characters.values()) {
    const label = c.mark ? `${c.name}${NAME_SEP}${c.mark}` : c.name;
    if (label && !oneLine(label, BODY.w)) issues.push({ code: 'NAME_TOO_WIDE', line: 1, detail: label });
  }

  for (const b of script.blocks.values()) {
    if (b.kind === 'dialogue') {
      let n = 0;
      for (const s of b.speeches) {
        glyphs(s.text, s.line);
        const pages = pagesFor(s.text, measure).length;
        if (pages > MAX_SPEECH_PAGES) issues.push({ code: 'SPEECH_TOO_LONG', line: s.line, detail: `${pages}` });
        n += pages;
      }
      pagesByAnchor[b.anchor] = n;
      totalPages += n;
    } else if (b.kind === 'line') {
      // line-card-* are shown on the HTML list page, not on the canvas.
      if (b.anchor.startsWith('line-card-')) continue;
      glyphs(b.text, b.line + 1);
      const guide = b.anchor.startsWith('line-guide-');
      if (!oneLine(b.text, guide ? TOPBAR_TEXT_W : LINE_W)) {
        issues.push({ code: guide ? 'GUIDE_TOO_WIDE' : 'LINE_TOO_WIDE', line: b.line + 1, detail: b.text });
      }
    } else if (b.kind === 'choices') {
      for (const c of b.choices) {
        glyphs(c.label, c.line);
        if (!oneLine(c.label, CHOICE_TEXT_W)) issues.push({ code: 'CHOICE_TOO_WIDE', line: c.line, detail: c.label });
        const t = script.blocks.get(c.target);
        if (!t || t.kind !== 'dialogue') issues.push({ code: 'BAD_TARGET', line: c.line, detail: c.target });
      }
    }
  }

  if (totalPages > opts.maxPages) issues.push({ code: 'TOTAL_PAGES', line: 1, detail: `${totalPages}/${opts.maxPages}` });
  issues.sort((a, b) => a.line - b.line);
  return { issues, totalPages, pagesByAnchor };
}

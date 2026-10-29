// Pure script checks shared by the CLI (scripts/check-script.ts) and tests.
import { BODY, CHOICE_TEXT_W, LINE_W, SUMMARY, TOPBAR_TEXT_W } from '../game/common/layout';
import { galmuriMeasure, galmuriTable, missingChars, type Measure, type WidthTable } from './measure';
import { parseScript, type BlockKind, type ParseErrorCode } from './parse';
import { layoutPage } from './page';
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
  | 'OPTIONAL_PAGES'
  | 'SUMMARY_TOO_LONG'
  | 'MISSING_GLYPH';
export interface Issue {
  code: IssueCode;
  line: number;
  detail: string;
}
export interface CheckResult {
  issues: Issue[];
  totalPages: number;
  /** pages of optional talk (`npc-*`: townsfolk the student may skip), not in totalPages */
  optionalPages: number;
  pagesByAnchor: Record<string, number>;
}

/** Anchors of talk the student can skip (townsfolk). They have their own cap. */
export const OPTIONAL_PREFIX = 'npc-';

export const MAX_SPEECH_PAGES = 2;
export const NAME_SEP = ' · ';

export function checkScript(
  text: string,
  opts: { required: Record<string, BlockKind>; maxPages: number; maxOptionalPages?: number; measure?: Measure; table?: WidthTable },
): CheckResult {
  const measure = opts.measure ?? galmuriMeasure;
  const table = opts.table ?? galmuriTable;
  const { script, errors } = parseScript(text);
  const issues: Issue[] = errors.map((e) => ({ ...e }));
  const pagesByAnchor: Record<string, number> = {};
  let totalPages = 0;
  let optionalPages = 0;

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
      if (b.anchor.startsWith(OPTIONAL_PREFIX)) optionalPages += n;
      else totalPages += n;
    } else if (b.kind === 'line') {
      // line-card-* are shown on the HTML list page, not on the canvas.
      if (b.anchor.startsWith('line-card-')) continue;
      glyphs(b.text, b.line + 1);
      const guide = b.anchor.startsWith('line-guide-');
      if (!oneLine(b.text, guide ? TOPBAR_TEXT_W : LINE_W)) {
        issues.push({ code: guide ? 'GUIDE_TOO_WIDE' : 'LINE_TOO_WIDE', line: b.line + 1, detail: b.text });
      }
    } else if (b.kind === 'page') {
      glyphs(b.markdown.replace(/[#*\[\]()/-]/g, ''), b.line + 1);
      const n = layoutPage(b.markdown, measure, SUMMARY.textW, SUMMARY.rows).pages.length;
      if (n > SUMMARY.maxPages) issues.push({ code: 'SUMMARY_TOO_LONG', line: b.line, detail: `${n}/${SUMMARY.maxPages}` });
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
  if (opts.maxOptionalPages !== undefined && optionalPages > opts.maxOptionalPages)
    issues.push({ code: 'OPTIONAL_PAGES', line: 1, detail: `${optionalPages}/${opts.maxOptionalPages}` });
  issues.sort((a, b) => a.line - b.line);
  return { issues, totalPages, optionalPages, pagesByAnchor };
}

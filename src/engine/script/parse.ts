// Reads activities/<id>/script.md. The format is described in the file's header comment.
// Errors carry codes; scripts/check-script.ts turns them into teacher-facing messages.
import { CHARACTERS_HEADING, MARK_LABELS } from '../../strings';

export interface Character {
  id: string;
  name: string;
  mark: string | null;
  portrait: string | null;
}
export interface Speech {
  speaker: string;
  text: string;
  line: number;
}
export interface Choice {
  label: string;
  target: string;
  line: number;
}
export type Block =
  | { kind: 'dialogue'; anchor: string; line: number; speeches: Speech[] }
  | { kind: 'choices'; anchor: string; line: number; choices: Choice[] }
  | { kind: 'line'; anchor: string; line: number; text: string }
  | { kind: 'page'; anchor: string; line: number; markdown: string };
export type BlockKind = Block['kind'];
export interface Script {
  characters: Map<string, Character>;
  blocks: Map<string, Block>;
}
export type ParseErrorCode =
  | 'NO_CHARACTERS'
  | 'BAD_CHARACTER_ROW'
  | 'BAD_MARK'
  | 'DUP_ANCHOR'
  | 'BAD_SPEECH'
  | 'UNKNOWN_SPEAKER'
  | 'BAD_CHOICE'
  | 'LINE_NOT_SINGLE'
  | 'EMPTY_BLOCK';
export interface ParseError {
  code: ParseErrorCode;
  line: number;
  detail: string;
}

const ANCHOR = /^##\s+@([a-z0-9-]+)\s*$/;
const SPEECH = /^([a-z0-9-]+):\s*(.+)$/;
const CHOICE = /^-\s+(.+?)\s+->\s+@([a-z0-9-]+)\s*$/;

export function kindOf(anchor: string): BlockKind {
  if (anchor.startsWith('choice-')) return 'choices';
  if (anchor.startsWith('line-')) return 'line';
  if (anchor.startsWith('page-')) return 'page';
  return 'dialogue';
}

interface Section {
  title: string;
  anchor: string | null;
  line: number;
  body: { text: string; line: number }[];
}

/** Splits into `## ` sections, dropping HTML comments but keeping line numbers. */
function sections(text: string): Section[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const out: Section[] = [];
  let cur: Section | null = null;
  let inComment = false;
  lines.forEach((raw, i) => {
    const n = i + 1;
    let line = raw;
    if (inComment) {
      const end = line.indexOf('-->');
      if (end < 0) return;
      line = line.slice(end + 3);
      inComment = false;
    }
    line = line.replace(/<!--.*?-->/g, '');
    const start = line.indexOf('<!--');
    if (start >= 0) {
      line = line.slice(0, start);
      inComment = true;
    }
    if (/^##\s/.test(line)) {
      const m = ANCHOR.exec(line.trim());
      cur = { title: line.replace(/^##\s+/, '').trim(), anchor: m ? m[1] : null, line: n, body: [] };
      out.push(cur);
      return;
    }
    if (/^#\s/.test(line)) return;
    cur?.body.push({ text: line, line: n });
  });
  return out;
}

function trimBody(body: Section['body']) {
  let a = 0;
  let b = body.length;
  while (a < b && !body[a].text.trim()) a++;
  while (b > a && !body[b - 1].text.trim()) b--;
  return body.slice(a, b);
}

export function parseScript(text: string): { script: Script; errors: ParseError[] } {
  const errors: ParseError[] = [];
  const characters = new Map<string, Character>();
  const blocks = new Map<string, Block>();
  const secs = sections(text);

  const charSec = secs.find((s) => !s.anchor && s.title === CHARACTERS_HEADING);
  if (!charSec) errors.push({ code: 'NO_CHARACTERS', line: 1, detail: CHARACTERS_HEADING });
  else {
    const rows = charSec.body.filter((r) => r.text.trim().startsWith('|'));
    for (const r of rows.slice(2)) {
      const cells = r.text.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      if (cells.length !== 4 || !/^[a-z0-9-]+$/.test(cells[0])) {
        errors.push({ code: 'BAD_CHARACTER_ROW', line: r.line, detail: r.text.trim() });
        continue;
      }
      const [id, name, mark, portrait] = cells;
      if (mark !== '-' && !(MARK_LABELS as readonly string[]).includes(mark)) {
        errors.push({ code: 'BAD_MARK', line: r.line, detail: mark });
      }
      characters.set(id, {
        id,
        name,
        mark: mark === '-' ? null : mark,
        portrait: portrait === '-' || !portrait ? null : portrait,
      });
    }
  }

  for (const s of secs) {
    if (!s.anchor) continue;
    const anchor = s.anchor;
    if (blocks.has(anchor)) {
      errors.push({ code: 'DUP_ANCHOR', line: s.line, detail: anchor });
      continue;
    }
    const body = trimBody(s.body);
    const filled = body.filter((b) => b.text.trim());
    if (!filled.length) {
      errors.push({ code: 'EMPTY_BLOCK', line: s.line, detail: anchor });
      continue;
    }
    const kind = kindOf(anchor);
    if (kind === 'page') {
      blocks.set(anchor, { kind, anchor, line: s.line, markdown: body.map((b) => b.text).join('\n') });
    } else if (kind === 'line') {
      if (filled.length !== 1) errors.push({ code: 'LINE_NOT_SINGLE', line: filled[1].line, detail: anchor });
      blocks.set(anchor, { kind, anchor, line: s.line, text: filled[0].text.trim() });
    } else if (kind === 'choices') {
      const choices: Choice[] = [];
      for (const b of filled) {
        const m = CHOICE.exec(b.text.trim());
        if (!m) errors.push({ code: 'BAD_CHOICE', line: b.line, detail: b.text.trim() });
        else choices.push({ label: m[1], target: m[2], line: b.line });
      }
      blocks.set(anchor, { kind, anchor, line: s.line, choices });
    } else {
      const speeches: Speech[] = [];
      for (const b of filled) {
        const m = SPEECH.exec(b.text.trim());
        if (!m) {
          errors.push({ code: 'BAD_SPEECH', line: b.line, detail: b.text.trim() });
          continue;
        }
        if (charSec && !characters.has(m[1])) errors.push({ code: 'UNKNOWN_SPEAKER', line: b.line, detail: m[1] });
        speeches.push({ speaker: m[1], text: m[2].trim(), line: b.line });
      }
      blocks.set(anchor, { kind, anchor, line: s.line, speeches });
    }
  }
  return { script: { characters, blocks }, errors };
}

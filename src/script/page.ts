// Lays out a `page-*` block (a small markdown subset) into fixed-size pages for the in-game summary window.
// Supported: `### heading`, `- bullet`, paragraphs, `**bold**` (shown plain), `[label](href)` lines (buttons),
// and pictures `![caption](art/key "WxH")` that take whole rows (the caption goes under the picture).
import type { Measure } from './measure';
import { wrapText } from './wrap';

export type RowKind = 'h' | 'p' | 'li' | 'gap' | 'img' | 'imgfill' | 'cap';
export interface Row {
  kind: RowKind;
  text: string;
  /** pixels from the left edge of the text area */
  indent: number;
  /** first line of a bullet (draws the bullet mark) */
  bullet?: boolean;
  /** picture rows: the art key and its size in pixels (only on the first row of the picture) */
  img?: { key: string; w: number; h: number };
}
export interface PageLink {
  label: string;
  href: string;
}
export interface PageLayout {
  title: string;
  pages: Row[][];
  links: PageLink[];
}

export const BULLET = '·';
const LINK = /^\[(.+?)\]\((\S+?)\)\s*$/;
const IMAGE = /^!\[(.*?)\]\((\S+)\s+"(\d+)x(\d+)"\)\s*$/;

type Block = { kind: 'h' | 'p' | 'li'; text: string } | { kind: 'img'; text: string; key: string; w: number; h: number };

function blocks(markdown: string): { title: string; body: Block[]; links: PageLink[] } {
  const out: Block[] = [];
  const links: PageLink[] = [];
  let title = '';
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push({ kind: 'p', text: para.join(' ') });
    para = [];
  };
  for (const raw of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim().replace(/\*\*(.+?)\*\*/g, '$1');
    const link = LINK.exec(line);
    const image = IMAGE.exec(line);
    if (!line) flush();
    else if (image) {
      flush();
      out.push({ kind: 'img', text: image[1], key: image[2], w: Number(image[3]), h: Number(image[4]) });
    }
    else if (link) {
      flush();
      links.push({ label: link[1], href: link[2] });
    } else if (line.startsWith('#')) {
      flush();
      const text = line.replace(/^#+\s*/, '');
      if (!title) title = text;
      else out.push({ kind: 'h', text });
    } else if (line.startsWith('- ')) {
      flush();
      out.push({ kind: 'li', text: line.slice(2).trim() });
    } else para.push(line);
  }
  flush();
  return { title, body: out, links };
}

/** Rows of one block, already wrapped to the text width. */
function rowsOf(b: Block, measure: Measure, width: number, rowH: number): Row[] {
  if (b.kind === 'img') {
    const n = Math.ceil(b.h / rowH);
    const rows: Row[] = [{ kind: 'img', text: '', indent: 0, img: { key: b.key, w: b.w, h: b.h } }];
    for (let i = 1; i < n; i++) rows.push({ kind: 'imgfill', text: '', indent: 0 });
    for (const text of b.text ? wrapText(b.text, measure, width) : []) rows.push({ kind: 'cap', text, indent: 0 });
    return rows;
  }
  if (b.kind === 'li') {
    const indent = Math.ceil(measure(`${BULLET} `));
    return wrapText(b.text, measure, width - indent).map((text, i) => ({ kind: 'li', text, indent, bullet: i === 0 }));
  }
  return wrapText(b.text, measure, width).map((text) => ({ kind: b.kind, text, indent: 0 }));
}

/**
 * Splits the page into pages of at most `rowsPerPage` rows. A heading never ends a page and a block is
 * kept whole when it fits on a fresh page; gaps between blocks are dropped at page edges.
 */
export function layoutPage(markdown: string, measure: Measure, width: number, rowsPerPage: number, rowH = 16): PageLayout {
  const { title, body, links } = blocks(markdown);
  const pages: Row[][] = [];
  let cur: Row[] = [];
  const room = () => rowsPerPage - cur.length;
  const newPage = () => {
    while (cur.length && cur[cur.length - 1].kind === 'gap') cur.pop();
    if (cur.length) pages.push(cur);
    cur = [];
  };
  body.forEach((b, i) => {
    const rows = rowsOf(b, measure, width, rowH);
    // bullets of one list sit together and a heading sits right on its text; other blocks get a blank row before them
    const prev = body[i - 1]?.kind;
    const gap = cur.length > 0 && prev !== 'h' && !(b.kind === 'li' && prev === 'li') ? 1 : 0;
    // a heading keeps the whole first block under it on its page
    const next = b.kind === 'h' && body[i + 1] ? rowsOf(body[i + 1], measure, width, rowH).length : 0;
    const need = rows.length + Math.min(next, rowsPerPage - rows.length);
    if (gap + need > room() && need <= rowsPerPage) newPage();
    else if (gap) cur.push({ kind: 'gap', text: '', indent: 0 });
    for (const r of rows) {
      if (room() <= 0) newPage();
      cur.push(r);
    }
  });
  newPage();
  return { title, pages, links };
}

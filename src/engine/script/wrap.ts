import { BODY, LINES_PER_PAGE } from '../layout';
import { galmuriMeasure, type Measure } from './measure';

/** Wraps on spaces (Korean word units); a word longer than a line is cut by character. */
export function wrapText(text: string, measure: Measure, maxW: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  const pushChars = (word: string) => {
    for (const ch of word) {
      if (cur && measure(cur + ch) > maxW) {
        lines.push(cur);
        cur = '';
      }
      cur += ch;
    }
  };
  for (const word of words) {
    const candidate = cur ? `${cur} ${word}` : word;
    if (measure(candidate) <= maxW) {
      cur = candidate;
    } else if (measure(word) <= maxW) {
      if (cur) lines.push(cur);
      cur = word;
    } else {
      if (cur) {
        lines.push(cur);
        cur = '';
      }
      pushChars(word);
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export function paginate(lines: string[], perPage: number): string[][] {
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
  return pages;
}

/** Pages of a dialog speech as the dialog box shows them. */
export function pagesFor(text: string, measure: Measure = galmuriMeasure, maxW: number = BODY.w, perPage: number = LINES_PER_PAGE): string[][] {
  return paginate(wrapText(text, measure, maxW), perPage);
}

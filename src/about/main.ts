import { marked } from 'marked';
import scriptText from '../../activities/continental-drift/script.md?raw';
import { parseScript } from '../script/parse';

// The summary page is plain, scrollable HTML (not the game canvas).
const { script } = parseScript(scriptText);
const page = script.blocks.get('page-about');
const title = script.blocks.get('line-card-title');
if (title && title.kind === 'line') document.title = title.text;
const main = document.getElementById('about')!;
if (page && page.kind === 'page') {
  // The script is a trusted repo file; raw HTML in it is still dropped so the format stays markdown-only.
  const html = marked.parse(page.markdown, { async: false, gfm: true }) as string;
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  for (const el of tpl.content.querySelectorAll('script, iframe, object, embed, style')) el.remove();
  main.replaceChildren(tpl.content);
  const links = [...main.querySelectorAll('a')].filter((a) => a.getAttribute('href')?.startsWith('/'));
  if (links.length) {
    const nav = document.createElement('nav');
    for (const a of links) {
      a.classList.add('button');
      nav.append(a);
    }
    main.append(nav);
  }
}

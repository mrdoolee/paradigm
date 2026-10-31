import 'galmuri/dist/galmuri.css';
import { parseScript } from '../engine/script/parse';
import { SITE_TAGLINE, SITE_TITLE } from '../engine/strings';

// Game list: one card per activities/<id>/script.md (line-card-* anchors), cover from art/cover.png
// or, if there is none, the title screen background art/scenes/title.png.
const scripts = import.meta.glob('../../activities/*/script.md', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;
const covers = import.meta.glob(['../../activities/*/art/cover.png', '../../activities/*/art/scenes/title.png'], {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const idOf = (path: string) => path.split('/activities/')[1].split('/')[0];
const coverOf = (id: string) =>
  Object.entries(covers)
    .filter(([p]) => idOf(p) === id)
    .sort(([a], [b]) => Number(b.endsWith('/cover.png')) - Number(a.endsWith('/cover.png')))[0]?.[1];

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string) {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

// title and tagline
document.title = SITE_TITLE;
const title = document.getElementById('site-title')!;
title.prepend(el('span', 'visually-hidden', SITE_TITLE));
document.getElementById('site-tagline')!.textContent = SITE_TAGLINE;

// cards
const list = document.getElementById('games')!;
const cards: HTMLAnchorElement[] = [];
for (const [path, text] of Object.entries(scripts)) {
  const id = idOf(path);
  const { script } = parseScript(text);
  const line = (a: string) => {
    const b = script.blocks.get(a);
    return b && b.kind === 'line' ? b.text : '';
  };
  const a = el('a', 'game');
  a.href = `/${id}/`;
  const cover = el('span', 'cover');
  const src = coverOf(id);
  if (src) {
    const img = el('img', '');
    img.src = src;
    img.alt = '';
    cover.append(img);
  }
  const info = el('span', 'info');
  info.append(el('strong', 'game-title', line('line-card-title')), el('span', 'game-desc', line('line-card-desc')));
  const meta = line('line-card-meta');
  if (meta) info.append(el('span', 'game-meta', meta));
  a.append(el('span', 'cursor', '▶'), cover, info);
  const li = el('li', '');
  li.append(a);
  list.append(li);
  cards.push(a);
}

// selection: like a console menu, one card is always highlighted; mouse, focus and arrow keys move it
let selected = 0;
const select = (i: number, focus: boolean) => {
  if (!cards.length) return;
  selected = (i + cards.length) % cards.length;
  cards.forEach((c, k) => c.classList.toggle('is-selected', k === selected));
  if (focus) cards[selected].focus();
};
cards.forEach((c, i) => {
  c.addEventListener('mouseenter', () => select(i, false));
  c.addEventListener('focus', () => select(i, false));
});
select(0, false);

// credit modal: display only, it never touches the selection or anything else on the page
const backdrop = document.getElementById('credit-backdrop')!;
const modal = document.getElementById('credit-modal')!;
const openBtn = document.getElementById('credit-open')!;
const closeBtn = document.getElementById('credit-close')!;
let returnFocus: HTMLElement | null = null;
const isOpen = () => !backdrop.hidden;

function openModal() {
  returnFocus = document.activeElement as HTMLElement | null;
  backdrop.hidden = false;
  document.documentElement.classList.add('modal-open');
  closeBtn.focus();
}
function closeModal() {
  if (!isOpen()) return;
  backdrop.hidden = true;
  document.documentElement.classList.remove('modal-open');
  (returnFocus ?? openBtn).focus();
}
openBtn.addEventListener('click', openModal);
closeBtn.addEventListener('click', closeModal);
backdrop.addEventListener('click', (e) => {
  if (e.target === backdrop) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (isOpen()) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    } else if (e.key === 'Tab') {
      // keep focus inside the dialog
      const f = [...modal.querySelectorAll<HTMLElement>('button, a[href]')];
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    return;
  }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const onCard = cards.includes(document.activeElement as HTMLAnchorElement);
    select(onCard ? selected + (e.key === 'ArrowDown' ? 1 : -1) : selected, true);
  } else if ((e.key === ' ' || e.key === 'Enter') && cards[selected]) {
    // Space (as in the games) or Enter starts the highlighted game, from a card or with nothing focused
    const onCard = cards.includes(document.activeElement as HTMLAnchorElement);
    if (!onCard && document.activeElement !== document.body) return;
    if (e.key === 'Enter' && onCard) return; // the link handles Enter itself
    e.preventDefault();
    cards[selected].click();
  }
});

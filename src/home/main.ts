import { parseScript } from '../engine/script/parse';
import { SITE_TAGLINE, SITE_TITLE } from '../engine/strings';

// Activity list: one card per activities/<id>/script.md, using its line-card-* anchors.
const scripts = import.meta.glob('../../activities/*/script.md', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;

document.title = SITE_TITLE;
const main = document.getElementById('home')!;
const h1 = document.createElement('h1');
h1.textContent = SITE_TITLE;
const tagline = document.createElement('p');
tagline.className = 'tagline';
tagline.textContent = SITE_TAGLINE;
const list = document.createElement('ul');
list.className = 'cards';
for (const [path, text] of Object.entries(scripts)) {
  const id = path.split('/').slice(-2, -1)[0];
  const { script } = parseScript(text);
  const line = (a: string) => {
    const b = script.blocks.get(a);
    return b && b.kind === 'line' ? b.text : '';
  };
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.href = `/${id}/`;
  a.className = 'card';
  const t = document.createElement('strong');
  t.textContent = line('line-card-title');
  const d = document.createElement('span');
  d.textContent = line('line-card-desc');
  a.append(t, d);
  li.append(a);
  list.append(li);
}
main.append(h1, tagline, list);

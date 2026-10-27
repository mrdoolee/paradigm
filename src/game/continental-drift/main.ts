import 'galmuri/dist/galmuri.css';
import scriptText from '../../../activities/continental-drift/script.md?raw';
import { parseScript } from '../../script/parse';
import { startGame } from '../common/boot';
import { dbg, installDebug } from '../common/debug';
import { UiScene } from '../common/UiScene';
import { BootScene } from './scenes/BootScene';
import { DebateScene } from './scenes/DebateScene';
import { EndingScene } from './scenes/EndingScene';
import { PuzzleScene } from './scenes/PuzzleScene';
import { TitleScene } from './scenes/TitleScene';

const { script, errors } = parseScript(scriptText);
if (errors.length) {
  // check:script blocks this before a build; in dev, show it plainly.
  console.error('script.md errors', errors);
}
const card = script.blocks.get('line-card-title');
if (card && card.kind === 'line') document.title = card.text;

installDebug();
const game = await startGame(
  [BootScene, TitleScene, PuzzleScene, DebateScene, EndingScene, UiScene],
  document.getElementById('game')!,
  { script },
);
dbg.game = game;

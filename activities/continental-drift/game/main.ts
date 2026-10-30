import 'galmuri/dist/galmuri.css';
import scriptText from '../script.md?raw';
import { parseScript } from '@engine/script/parse';
import { startGame } from '@engine/boot';
import { dbg, installDebug } from '@engine/debug';
import { UiScene } from '@engine/UiScene';
import { BootScene } from './scenes/BootScene';
import { DebateScene } from './scenes/DebateScene';
import { EndingScene } from './scenes/EndingScene';
import { PuzzleScene } from './scenes/PuzzleScene';
import { TitleScene } from './scenes/TitleScene';
import { TownScene } from './scenes/TownScene';
import { SailScene } from './scenes/SailScene';
import { DigScene } from './scenes/DigScene';
import { ScratchScene } from './scenes/ScratchScene';
import { StrataScene } from './scenes/StrataScene';
import { SurveyScene } from './scenes/SurveyScene';
import { SummaryScene } from '@rpg/SummaryScene';

const { script, errors } = parseScript(scriptText);
if (errors.length) {
  // check:script blocks this before a build; in dev, show it plainly.
  console.error('script.md errors', errors);
}
const card = script.blocks.get('line-card-title');
if (card && card.kind === 'line') document.title = card.text;

installDebug();
const game = await startGame(
  [BootScene, TitleScene, TownScene, SailScene, DigScene, ScratchScene, StrataScene, SurveyScene, PuzzleScene, DebateScene, EndingScene, SummaryScene, UiScene],
  document.getElementById('game')!,
  { script },
);
dbg.game = game;

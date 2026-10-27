import 'galmuri/dist/galmuri.css';
import { startGame } from '../common/boot';
import { dbg, installDebug } from '../common/debug';
import { BootScene } from './scenes/BootScene';
import { PuzzleScene } from './scenes/PuzzleScene';

installDebug();
const game = await startGame([BootScene, PuzzleScene], document.getElementById('game')!);
game.registry.set('firstScene', 'Puzzle');
dbg.game = game;

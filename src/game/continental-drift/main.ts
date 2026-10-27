import 'galmuri/dist/galmuri.css';
import Phaser from 'phaser';
import { startGame } from '../common/boot';

class BlankScene extends Phaser.Scene {
  constructor() { super('Blank'); }
}

void startGame([BlankScene], document.getElementById('game')!);

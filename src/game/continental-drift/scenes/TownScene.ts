import Phaser from 'phaser';
import { bindActions } from '../../common/actions';
import { enterScene, dbg } from '../../common/debug';
import { gridFromRows, nearestOpen, type Cell, type Grid } from '../../common/grid';
import { artOr, drawPerson } from '../../common/greybox';
import { FONT, type Pt } from '../../common/layout';
import { VIEW_H, VIEW_W } from '../../common/screen';
import { UI_KEY, type UiScene } from '../../common/UiScene';
import { Walker, type Dir } from '../../common/Walker';
import type { Run, TownId } from '../run';
import { TILE, TOWN_ORIGIN, TOWNS, type Thing, type TownDef } from '../towns';

export interface TownData {
  town?: TownId;
  at?: string;
}

const TILE_COLORS: Record<string, number> = {
  T: 0x2f5a32,
  '~': 0x274660,
  '#': 0x8a6a4a,
  '=': 0xb89a66,
  p: 0x6b4f33,
};
const PERSON: Record<string, number> = { port: 0x3a5a8a, npc: 0x7a5aa0, aide: 0xd98a5b, folk: 0x8a7a5a };
/** Grey-box ground colour per town (used only when no tile art is loaded). */
const GROUND: Record<string, number> = { lab: 0x6f8f4e, india: 0xb59a5a, australia: 0xa85a3a, africa: 0x9a9a6a };
/** Townsfolk glance left and right now and then; each one on its own beat. */
const GLANCE_MS = 2600;
const MARK = 0xffd23f;

/**
 * A town on one screen: the lab town (the hub) or a region town. The player walks a 16px grid;
 * the goal from `Run` decides which thing does something when looked at.
 */
export class TownScene extends Phaser.Scene {
  private def!: TownDef;
  private run!: Run;
  private ui!: UiScene;
  private grid!: Grid;
  private walker!: Walker;
  private busy = false;
  private marker!: Phaser.GameObjects.Graphics;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super('Town');
  }

  create(data: TownData) {
    enterScene('Town', this);
    this.busy = false;
    this.folkImages = new Map();
    this.def = TOWNS[data.town ?? 'lab'];
    this.run = this.registry.get('run') as Run;
    this.ui = this.scene.get(UI_KEY) as UiScene;
    this.ui.bind(this);

    const thingCells = new Set(this.def.things.map((t) => `${t.cell[0]},${t.cell[1]}`));
    const base = gridFromRows(this.def.rows, this.def.walkable);
    this.grid = { w: base.w, h: base.h, open: (x, y) => base.open(x, y) && !thingCells.has(`${x},${y}`) };

    this.drawMap();
    for (const t of this.def.things) this.drawThing(t);
    this.marker = this.add.graphics().setDepth(500);

    const spawn = this.def.spawn[data.at ?? 'start'] ?? Object.values(this.def.spawn)[0];
    const sprite = this.add.image(0, 0, this.charTex('player', 'down', 0x3f7fbf)).setDepth(400);
    this.fitChar(sprite);
    this.walker = new Walker(this.grid, { x: spawn[0], y: spawn[1] }, TOWN_ORIGIN, TILE, sprite);
    this.walker.facing = data.at === 'port' && this.def.id === 'lab' ? 'left' : data.at === 'port' ? 'right' : 'up';
    const face = (d: Dir) => {
      sprite.setTexture(this.charTex('player', d, 0x3f7fbf));
      this.fitChar(sprite);
    };
    face(this.walker.facing);
    this.walker.events.on('face', face);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onTap(p.x, p.y));
    bindActions(this, (a) => {
      if (a === 'confirm') this.lookAhead();
      else if (a === 'up' || a === 'down' || a === 'left' || a === 'right') {
        // a quick tap is one step; holding the key keeps walking (update)
        if (!this.busy && !this.walker.moving) this.walker.step(a);
      }
    });
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.events.on('ui-opened', () => this.walker.stop());
    this.events.on('ui-closed', () => this.refresh());

    dbg.goalPoint = () => {
      const t = this.goalThing();
      return t ? this.center({ x: t.cell[0], y: t.cell[1] }) : null;
    };
    dbg.player = () => this.walker.cell;

    let blink = true;
    this.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => {
        blink = !blink;
        this.marker.setVisible(blink);
      },
    });
    this.refresh();
    void this.arrive(data);
  }

  update(_t: number, delta: number) {
    this.walker.update(delta);
    if (this.walker.moving || this.busy || !this.input.enabled) return;
    const c = this.cursors;
    const dir: Dir | null = c.up.isDown ? 'up' : c.down.isDown ? 'down' : c.left.isDown ? 'left' : c.right.isDown ? 'right' : null;
    if (dir) this.walker.step(dir);
  }

  // ---- goal and guide --------------------------------------------------

  private goalThing(): Thing | null {
    const g = this.run.goal;
    const kind =
      this.def.id === 'lab'
        ? g.kind === 'table'
          ? 'table'
          : g.kind === 'sail'
            ? 'port'
            : null
        : g.kind === 'talk' && g.town === this.def.id
          ? 'npc'
          : g.kind === 'field'
            ? 'field'
            : null;
    return this.def.things.find((t) => t.kind === kind) ?? null;
  }

  private guideAnchor(): string | null {
    const g = this.run.goal;
    if (g.kind === 'table') return 'line-goal-table';
    if (g.kind === 'sail') return `line-goal-sail-${g.port}`;
    if (g.kind === 'talk') return 'line-goal-talk';
    if (g.kind === 'field') return 'line-goal-field';
    return null;
  }

  private refresh() {
    this.ui.setGuide(this.guideAnchor(), { done: this.run.evidence() - 1, total: 3 });
    this.marker.clear();
    const t = this.goalThing();
    if (!t) return;
    const p = this.cellPx({ x: t.cell[0], y: t.cell[1] });
    this.marker.lineStyle(1, MARK).strokeRect(p.x - 1.5, p.y - 1.5, TILE + 3, TILE + 3);
    this.marker.fillStyle(MARK).fillTriangle(p.x + 4, p.y - 8, p.x + 12, p.y - 8, p.x + 8, p.y - 4);
  }

  private async arrive(data: TownData) {
    const key = `seen-${this.def.id}`;
    if (this.registry.get(key)) return;
    this.registry.set(key, true);
    if (this.def.id === 'lab' && (data.at ?? 'start') === 'start') await this.ui.say('lab-intro');
    else if (this.def.id !== 'lab') await this.ui.say(`${this.def.id}-arrive`);
  }

  // ---- input -------------------------------------------------------------

  private onTap(x: number, y: number) {
    if (this.busy || y < TOWN_ORIGIN.y) return;
    const cell = { x: Math.floor((x - TOWN_ORIGIN.x) / TILE), y: Math.floor((y - TOWN_ORIGIN.y) / TILE) };
    const thing = this.thingAt(cell);
    if (thing) {
      const stand = nearestOpen(this.grid, cell, this.walker.cell);
      if (!stand) return;
      this.walker.walkTo(stand, () => {
        this.walker.face(cell);
        void this.interact(thing);
      });
    } else if (this.grid.open(cell.x, cell.y)) {
      this.walker.walkTo(cell, () => {});
    }
  }

  private lookAhead() {
    if (this.busy || this.walker.moving) return;
    const t = this.thingAt(this.walker.facingCell());
    if (t) void this.interact(t);
  }

  private thingAt(c: Cell): Thing | null {
    return this.def.things.find((t) => t.cell[0] === c.x && t.cell[1] === c.y) ?? null;
  }

  private async interact(t: Thing) {
    if (this.busy) return;
    const g = this.run.goal;
    const isGoal = this.goalThing()?.id === t.id;
    if (t.kind === 'folk') {
      this.busy = true;
      this.greet(t);
      await this.ui.say(t.talk ?? 'town-not-yet');
      this.busy = false;
      return;
    }
    if (!isGoal) {
      this.busy = true;
      await this.ui.say(t.talk ?? (t.kind === 'aide' ? 'aide-chat' : 'town-not-yet'));
      this.busy = false;
      return;
    }
    this.busy = true;
    if (g.kind === 'table') {
      this.ui.sfx('page');
      this.scene.start('Puzzle', { phases: [g.phase], next: 'Town', nextData: { town: 'lab', at: 'table' } });
    } else if (g.kind === 'sail') {
      await this.ui.say('port-captain');
      this.scene.start('Sail', { to: g.port });
    } else if (g.kind === 'talk') {
      await this.ui.say(`${this.def.id}-scientist`);
      this.run.complete('talk');
      this.busy = false;
      this.refresh();
    } else if (g.kind === 'field') {
      this.ui.sfx('page');
      this.scene.start(g.game);
    } else {
      this.busy = false;
    }
  }

  // ---- townsfolk ----------------------------------------------------------

  private folkImages = new Map<string, Phaser.GameObjects.Image>();

  /** People glance left and right; animals stay put until spoken to. Timing is fixed per index. */
  private animateFolk(t: Thing, img: Phaser.GameObjects.Image) {
    this.folkImages.set(t.id, img);
    if (t.hop) return;
    const i = this.folkImages.size;
    this.time.addEvent({
      delay: GLANCE_MS + i * 370,
      loop: true,
      callback: () => {
        if (!this.busy) img.setFlipX(!img.flipX);
      },
    });
  }

  /** Turns toward the player; small animals give a hop. */
  private greet(t: Thing) {
    const img = this.folkImages.get(t.id);
    if (!img) return;
    img.setFlipX(this.walker.cell.x > t.cell[0]);
    if (t.hop) this.tweens.add({ targets: img, y: img.y - 4, duration: 90, yoyo: true, repeat: 1 });
  }

  // ---- drawing -----------------------------------------------------------

  /** Character art `chars/<who>-<dir>` (16x24) when present, else a 16x16 grey-box person. */
  private charTex(who: string, dir: Dir, body: number): string {
    const key = `chars/${who}-${dir}`;
    if (this.textures.exists(key)) return key;
    return artOr(this, `chars/${who}-down`, `gb-${who}`, 16, 16, (g) => drawPerson(g, body));
  }

  /** Taller character art stands on its cell: the extra height goes above. */
  private fitChar(img: Phaser.GameObjects.Image) {
    const h = img.height;
    img.setOrigin(0, h > TILE ? (h - TILE) / h : 0);
  }

  private tileName(ch: string, x: number, y: number): string | null {
    const legend = this.def.legend ?? {};
    if (ch === '#') {
      // the top row of a building is roof; a gable over a door counts as building too
      const above = y > 0 ? this.def.rows[y - 1][x] : '';
      return above === '#' || legend[above] === 'gable' ? 'wall' : 'roof';
    }
    if (legend[ch]) return legend[ch];
    return ({ '.': 'ground', ',': 'ground2', '=': 'road', '~': 'water', T: 'tree', p: 'pier' } as Record<string, string>)[ch] ?? null;
  }

  /** This town's own tile, else the shared one (with the old names), else null. */
  private tileTex(name: string): { key: string; shared: boolean } | null {
    const own = `town/${this.def.id}/${name}`;
    if (this.textures.exists(own)) return { key: own, shared: false };
    const old = ({ ground: 'grass', ground2: 'flowers' } as Record<string, string>)[name] ?? name;
    return this.textures.exists(`town/${old}`) ? { key: `town/${old}`, shared: true } : null;
  }

  private cellPx(c: Cell): Pt {
    return { x: TOWN_ORIGIN.x + c.x * TILE, y: TOWN_ORIGIN.y + c.y * TILE };
  }

  private center(c: Cell): Pt {
    const p = this.cellPx(c);
    return { x: p.x + TILE / 2, y: p.y + TILE / 2 };
  }

  private drawMap() {
    this.add.graphics().fillStyle(0x14161c).fillRect(0, 0, VIEW_W, VIEW_H);
    if (this.textures.exists('town/grass') || this.textures.exists(`town/${this.def.id}/ground`)) {
      // generated tiles; the shared set gets a drier tint in region towns that have no set of their own
      const dry = ({ lab: 0xffffff, india: 0xf2e2a8, australia: 0xffd8a8, africa: 0xe8e2a8 } as Record<string, number>)[this.def.id] ?? 0xffffff;
      this.def.rows.forEach((row, y) =>
        [...row].forEach((ch, x) => {
          const name = this.tileName(ch, x, y);
          const tex = name ? this.tileTex(name) : null;
          if (!name || !tex) return;
          const p = this.cellPx({ x, y });
          const img = this.add.image(p.x, p.y, tex.key).setOrigin(0);
          if (tex.shared && ['ground', 'ground2', 'tree'].includes(name)) img.setTint(dry);
        }),
      );
      return;
    }
    const g = this.add.graphics();
    const ground = GROUND[this.def.id] ?? 0x6f8f4e;
    this.def.rows.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        const p = this.cellPx({ x, y });
        const prop = !!this.def.legend?.[ch];
        g.fillStyle(prop ? 0x5a4a3a : (TILE_COLORS[ch] ?? ground)).fillRect(p.x, p.y, TILE, TILE);
        if (ch === ',') g.fillStyle(0xe8dfc6).fillRect(p.x + 4, p.y + 5, 2, 2).fillRect(p.x + 10, p.y + 10, 2, 2);
        if (ch === 'T') g.fillStyle(0x3f7a42).fillRect(p.x + 3, p.y + 2, 10, 9);
        if (ch === '#' && (y === 0 || row[x] !== this.def.rows[y - 1]?.[x])) g.fillStyle(0x6a3a2a).fillRect(p.x, p.y, TILE, 6);
        if (ch === '~') g.fillStyle(0x2d506c).fillRect(p.x + 2, p.y + 6, 6, 1);
        if (ch === 'p') g.fillStyle(0x4f3a26).fillRect(p.x, p.y + 7, TILE, 1);
      });
    });
  }

  private drawThing(t: Thing) {
    const p = this.cellPx({ x: t.cell[0], y: t.cell[1] });
    const g = this.add.graphics().setDepth(300);
    if (t.kind in PERSON) {
      const who = t.kind === 'npc' ? `${this.def.id}-scientist` : t.kind === 'folk' ? (t.sprite ?? 'folk') : t.kind;
      const img = this.add.image(p.x, p.y, this.charTex(who, 'down', PERSON[t.kind])).setDepth(300);
      this.fitChar(img);
      if (t.kind === 'folk') this.animateFolk(t, img);
    } else if (t.kind === 'table') {
      g.fillStyle(0x3a2a1c).fillRect(p.x + 2, p.y + 2, 12, 14);
      g.fillStyle(0xe8dfc6).fillRect(p.x + 4, p.y + 4, 8, 6);
    } else if (t.kind === 'field') {
      g.fillStyle(0x3a2a1c).fillRect(p.x + 1, p.y + 1, 14, 15);
      g.fillStyle(0xf4ecd8);
      for (let i = 0; i < 14; i += 4) g.fillRect(p.x + 1 + i, p.y + 1, 2, 1).fillRect(p.x + 1 + i, p.y + 15, 2, 1);
    } else if (t.kind === 'boat') {
      g.fillStyle(0x5a3a22).fillRect(p.x - 2, p.y + 6, 20, 8);
      g.fillStyle(0xe8dfc6).fillRect(p.x + 6, p.y - 6, 2, 12).fillRect(p.x + 8, p.y - 4, 7, 8);
    }
    if (t.label) {
      this.add
        .text(p.x + TILE / 2, p.y - (t.kind in PERSON ? 12 : 2), this.ui.line(t.label), {
          fontFamily: FONT.family,
          fontSize: `${FONT.sizePx}px`,
          color: '#f4ecd8',
          backgroundColor: '#121a28',
          padding: { x: 2, y: 1 },
        })
        .setOrigin(0.5, 1)
        .setDepth(450);
    }
  }
}

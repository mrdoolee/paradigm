// Fixed positions on the 480x360 virtual screen. Nothing here moves when a dialog opens.

export interface Rect { x: number; y: number; w: number; h: number }
export interface Pt { x: number; y: number }

export const TOPBAR: Rect = { x: 0, y: 0, w: 480, h: 22 };
export const TOPBAR_TEXT_W = 424;
export const PUZZLE_AREA: Rect = { x: 0, y: 22, w: 480, h: 218 };

export const DIALOG: Rect = { x: 8, y: 262, w: 464, h: 90 };
export const PORTRAIT: Rect = { x: 16, y: 270, w: 64, h: 64 };
export const NAME_POS: Pt = { x: 88, y: 268 };
export const BODY = { x: 88, y: 286, w: 368 };
export const LINE_H = 16;
export const LINES_PER_PAGE = 3;
/** Right-aligned page mark "▼ 1/2". */
export const PAGE_MARK_POS: Pt = { x: 462, y: 334 };

export const CHOICE = { right: 472, bottom: 258, w: 200, rowH: 16, pad: 6 };
/** Width a choice label may use: box minus padding minus the cursor column. */
export const CHOICE_TEXT_W = CHOICE.w - 2 * CHOICE.pad - 12;
export const LINE_W = 464;

export const FONT = { family: 'Galmuri11', sizePx: 12, lineSpacing: 4 };
export const SNAP_RADIUS = 10;
export const KEY_STEP = 4;

/** The summary window at the end: one fixed full-screen box under the top bar row, turned page by page. */
export const SUMMARY = {
  box: { x: 4, y: 24, w: 472, h: 332 } as Rect,
  titleY: 32,
  lineY: 50,
  textX: 18,
  textY: 56,
  textW: 444,
  rows: 16,
  rowH: 16,
  footY: 329,
  /** check:script and tests keep page-about within this many pages */
  maxPages: 8,
};

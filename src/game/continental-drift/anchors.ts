import type { BlockKind } from '../../script/parse';

/** Every script anchor the continental-drift code asks for. check:script fails if one is missing. */
export const ANCHORS: Record<string, BlockKind> = {
  intro: 'dialogue',
  'coast-after': 'dialogue',
  'fossil-before': 'dialogue',
  'fossil-after': 'dialogue',
  'glacier-before': 'dialogue',
  'glacier-after': 'dialogue',
  'mountain-before': 'dialogue',
  'mountain-after': 'dialogue',
  'merge-after': 'dialogue',
  'debate-arrive': 'dialogue',
  'debate-mechanism-q': 'dialogue',
  'choice-debate-mechanism': 'choices',
  'debate-landbridge': 'dialogue',
  'debate-note': 'dialogue',
  'seafloor-before': 'dialogue',
  'seafloor-after': 'dialogue',
  ending: 'dialogue',
  'line-title': 'line',
  'line-start': 'line',
  'line-guide-coast': 'line',
  'line-guide-fossil': 'line',
  'line-guide-glacier': 'line',
  'line-guide-mountain': 'line',
  'line-guide-stripes': 'line',
  'line-label-ridge': 'line',
  'line-card-title': 'line',
  'line-card-desc': 'line',
  'page-about': 'page',
};

export const MAX_PAGES = 45;

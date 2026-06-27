import type { LevelTier } from '../types';

/** Tailwind text-color class per level tier. `rainbow` uses the .rainbow-text CSS utility (see index.css). */
export const LEVEL_TIER_CLASS: Record<LevelTier, string> = {
  gray: 'text-white/55',
  green: 'text-mass',
  purple: 'text-genetics',
  red: 'text-strength',
  rainbow: 'rainbow-text',
};

/** Border/glow accent per tier, used for level-up modal & progress bars. */
export const LEVEL_TIER_BORDER: Record<LevelTier, string> = {
  gray: 'border-white/25',
  green: 'border-mass/40',
  purple: 'border-genetics/40',
  red: 'border-strength/40',
  rainbow: 'border-legend/40',
};

export const LEVEL_TIER_BG: Record<LevelTier, string> = {
  gray: 'bg-white/10',
  green: 'bg-mass/10',
  purple: 'bg-genetics/10',
  red: 'bg-strength/10',
  rainbow: 'bg-legend/10',
};

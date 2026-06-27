import type { GameState, LevelConfig } from '../types';
import {
  GEAR_ITEMS,
  MAX_CRIT_CHANCE,
  GENETICS_TO_CRIT,
  BASE_MINING_RATE_PER_HOUR,
  MASS_MINING_COEFFICIENT,
  LEVELS,
} from './constants';
import { getRarityConfig } from './rarity';
import { clamp } from './format';

export function getGearBonus(state: GameState, type: 'mining' | 'energyMax' | 'crit' | 'strength'): number {
  return GEAR_ITEMS.filter((g) => state.ownedGear[g.id] && g.effect.type === type).reduce(
    (sum, g) => sum + g.effect.value,
    0
  );
}

export function getActiveBoostBonus(state: GameState, type: string): number {
  const now = Date.now();
  return state.activeBoosts
    .filter((b) => b.type === type && b.expiresAt > now)
    .reduce((sum, b) => sum + b.value, 0);
}

export function getEnergyMax(state: GameState): number {
  if (!state.athlete) return 0;
  const bonus = getGearBonus(state, 'energyMax');
  return Math.round(state.athlete.stats.stamina * (1 + bonus / 100));
}

export function getCritChance(state: GameState): number {
  if (!state.athlete) return 0;
  const base = Math.min(MAX_CRIT_CHANCE, state.athlete.stats.genetics * GENETICS_TO_CRIT);
  const gearBonus = getGearBonus(state, 'crit') / 100;
  return Math.min(MAX_CRIT_CHANCE + 0.15, base + gearBonus);
}

export function getEffectiveStrength(state: GameState): number {
  if (!state.athlete) return 0;
  const gearBonus = getGearBonus(state, 'strength');
  const boostBonus = getActiveBoostBonus(state, 'strength');
  return Math.round(state.athlete.stats.strength * (1 + (gearBonus + boostBonus) / 100));
}

/** The Common/Rare/Epic/Legendary case-rarity multiplier (1 / 1.3 / 2 / 5). */
export function getRarityMultiplier(state: GameState): number {
  if (!state.athlete) return 1;
  return getRarityConfig(state.athlete.rarity).multiplier;
}

export function getMiningRatePerHour(state: GameState): number {
  if (!state.athlete) return 0;
  const base = BASE_MINING_RATE_PER_HOUR + state.athlete.stats.mass * MASS_MINING_COEFFICIENT;
  const gearBonus = getGearBonus(state, 'mining');
  const boostBonus = getActiveBoostBonus(state, 'mining') + getActiveBoostBonus(state, 'miningBoost');
  const rarityMult = getRarityMultiplier(state);
  return base * (1 + (gearBonus + boostBonus) / 100) * rarityMult;
}

export function getPower(state: GameState): number {
  if (!state.athlete) return 0;
  const s = state.athlete.stats;
  const strength = getEffectiveStrength(state);
  return Math.round(strength * 2 + s.mass * 1 + s.stamina * 0.5 + s.genetics * 0.5);
}

// ── Level / prestige titles ──────────────────────────────────────────────

/** Pure function: given a raw base-Strength number, find the highest level it qualifies for. */
export function getLevelForStrength(strength: number): LevelConfig {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (strength >= lvl.strengthRequired) current = lvl;
    else break;
  }
  return current;
}

export interface LevelInfo {
  current: LevelConfig;
  next: LevelConfig | null;
  strength: number;
  /** 0..1 progress towards `next` (1 = max level reached). */
  progress: number;
}

export function getLevelInfo(state: GameState): LevelInfo {
  const strength = state.athlete?.stats.strength ?? 0;
  const current = getLevelForStrength(strength);
  const currentIndex = LEVELS.findIndex((l) => l.level === current.level);
  const next = LEVELS[currentIndex + 1] ?? null;
  const progress = next
    ? clamp((strength - current.strengthRequired) / (next.strengthRequired - current.strengthRequired), 0, 1)
    : 1;
  return { current, next, strength, progress };
}

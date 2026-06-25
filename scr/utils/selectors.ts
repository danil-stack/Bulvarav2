import type { GameState } from '../types';
import {
  GEAR_ITEMS,
  MAX_CRIT_CHANCE,
  GENETICS_TO_CRIT,
  BASE_MINING_RATE_PER_HOUR,
  MASS_MINING_COEFFICIENT,
} from './constants';

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

export function getMiningRatePerHour(state: GameState): number {
  if (!state.athlete) return 0;
  const base = BASE_MINING_RATE_PER_HOUR + state.athlete.stats.mass * MASS_MINING_COEFFICIENT;
  const gearBonus = getGearBonus(state, 'mining');
  const boostBonus = getActiveBoostBonus(state, 'mining') + getActiveBoostBonus(state, 'miningBoost');
  return base * (1 + (gearBonus + boostBonus) / 100);
}

export function getPower(state: GameState): number {
  if (!state.athlete) return 0;
  const s = state.athlete.stats;
  const strength = getEffectiveStrength(state);
  return Math.round(strength * 2 + s.mass * 1 + s.stamina * 0.5 + s.genetics * 0.5);
}

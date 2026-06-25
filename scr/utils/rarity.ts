import type { Athlete, Rarity, Stats } from '../types';
import { RARITIES } from './constants';

export function getRarityConfig(rarity: Rarity) {
  const cfg = RARITIES.find((r) => r.id === rarity);
  if (!cfg) throw new Error(`Unknown rarity: ${rarity}`);
  return cfg;
}

/** Weighted random roll across all configured rarities. */
export function rollRarity(): Rarity {
  const totalWeight = RARITIES.reduce((sum, r) => sum + r.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const r of RARITIES) {
    if (roll < r.weight) return r.id;
    roll -= r.weight;
  }
  return RARITIES[0].id;
}

function baseStat(multiplier: number): number {
  const raw = 6 + Math.random() * 6; // 6..12 base roll
  return Math.round(raw * multiplier);
}

export function generateStats(rarity: Rarity): Stats {
  const { multiplier } = getRarityConfig(rarity);
  return {
    strength: baseStat(multiplier),
    mass: baseStat(multiplier),
    stamina: Math.max(40, Math.round(baseStat(multiplier) * 4)),
    genetics: baseStat(multiplier),
  };
}

export function createAthlete(rarity: Rarity): Athlete {
  const stats = generateStats(rarity);
  return {
    id: `athlete_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    rarity,
    level: 1,
    xp: 0,
    stats,
    energy: stats.stamina,
    createdAt: Date.now(),
  };
}

export function getPowerScore(stats: Stats): number {
  return Math.round(stats.strength * 2 + stats.mass * 1 + stats.stamina * 0.5 + stats.genetics * 0.5);
}

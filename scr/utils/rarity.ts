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

// Flat, rarity-independent base roll — fairness at mint time. The rarity's
// payoff comes from its training/mining multiplier (see utils/selectors.ts),
// not from bigger starting numbers.
function baseStat(): number {
  return Math.round(6 + Math.random() * 6); // 6..12
}

export function generateStats(): Stats {
  return {
    strength: baseStat(),
    mass: baseStat(),
    stamina: Math.max(40, baseStat() * 4),
    genetics: baseStat(),
  };
}

export function createAthlete(rarity: Rarity): Athlete {
  const stats = generateStats();
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

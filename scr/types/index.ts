// ── Core domain types for the Bulvara fitness RPG ──────────────────────────

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface RarityConfig {
  id: Rarity;
  nameKey: string;
  weight: number; // drop chance, % (all weights sum to 100)
  multiplier: number; // training-gain & mining-rate multiplier
  color: string; // hex accent
  icon: string; // emoji glyph used as avatar placeholder
}

export interface Stats {
  strength: number; // tournament reward power
  mass: number; // passive mining rate
  stamina: number; // max energy pool
  genetics: number; // crit / luck chance during training
}

export type StatKey = keyof Stats;

export interface Athlete {
  id: string;
  rarity: Rarity;
  level: number;
  xp: number;
  stats: Stats;
  energy: number; // current energy (capped at stats.stamina)
  createdAt: number;
}

export type MuscleGroup = 'chest' | 'back' | 'legs' | 'arms';

export interface MuscleGroupConfig {
  id: MuscleGroup;
  nameKey: string;
  icon: string;
  energyCost: number;
  gains: Partial<Stats>;
}

export type NutritionEffectType = 'energy' | 'miningBoost';

export interface NutritionItem {
  id: string;
  nameKey: string;
  descKey: string;
  icon: string;
  price: number; // cost in $BULV, 0 = free (e.g. Rest)
  cooldownMs: number;
  effect: {
    type: NutritionEffectType;
    energy?: number; // flat energy restored
    boostPercent?: number; // mining rate % boost
    boostDurationMs?: number;
  };
}

export type PharmaEffectType = 'strength' | 'mining' | 'mass' | 'genetics' | 'staminaMax';

export interface PharmaItem {
  id: string;
  nameKey: string;
  descKey: string;
  icon: string;
  price: number;
  durationMs: number; // 0 = instant/permanent effect
  cooldownMs: number;
  riskPercent: number; // chance of a negative outcome
  effect: { type: PharmaEffectType; value: number }; // value = % boost or flat stat delta
}

export interface GearEffect {
  type: 'mining' | 'energyMax' | 'crit' | 'strength';
  value: number; // percent boost
}

export interface GearItem {
  id: string;
  nameKey: string;
  descKey: string;
  icon: string;
  price: number;
  effect: GearEffect;
}

export interface League {
  id: string;
  nameKey: string;
  icon: string;
  minPower: number;
  entryFee: number;
  rewardMin: number;
  rewardMax: number;
  cooldownMs: number;
}

export interface ActiveBoost {
  sourceId: string;
  type: PharmaEffectType | NutritionEffectType;
  value: number;
  expiresAt: number;
}

export interface ArenaResult {
  leagueId: string;
  win: boolean;
  reward: number;
  power: number;
  opponentPower: number;
  timestamp: number;
}

// ── Inventory ────────────────────────────────────────────────────────────
// Everything bought in shops or dropped from cases lands here first. The
// player explicitly equips/uses or sells each item — nothing auto-applies.
export type InventoryItemKind = 'athlete' | 'gear' | 'pharma';

export interface InventoryItem {
  id: string; // unique instance id (not the same as the gear/pharma catalog id)
  kind: InventoryItemKind;
  refId: string; // gear/pharma catalog id; for athletes, the rolled rarity
  athlete?: Athlete; // present only when kind === 'athlete'
  acquiredAt: number;
}

export interface GameState {
  athlete: Athlete | null; // the currently EQUIPPED/active athlete only
  bulv: number;
  totalMined: number;
  lastTick: number; // ms timestamp of last processed tick (for offline calc)
  ownedGear: Record<string, boolean>; // currently EQUIPPED gear (drives passive bonuses)
  pharmaCooldowns: Record<string, number>; // itemId -> ready-again timestamp (gates USE, not purchase)
  nutritionCooldowns: Record<string, number>;
  arenaCooldowns: Record<string, number>; // leagueId -> ready-again timestamp
  activeBoosts: ActiveBoost[];
  arenaHistory: ArenaResult[];
  inventory: InventoryItem[];
  hasUsedFreeCase: boolean; // the very first Athlete Case is free, once ever
}

export type Lang = 'ru' | 'en';

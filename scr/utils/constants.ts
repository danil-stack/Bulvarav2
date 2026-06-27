import type {
  RarityConfig,
  MuscleGroupConfig,
  NutritionItem,
  PharmaItem,
  GearItem,
  League,
  Rarity,
  LevelConfig,
} from '../types';

// ── Cases / rarity ───────────────────────────────────────────────────────
// Weights are literal drop-chance percentages (they sum to exactly 100).
// `multiplier` drives BOTH training-tap gains and the passive mining rate.
export const RARITIES: RarityConfig[] = [
  { id: 'common', nameKey: 'rarity.common', weight: 60, multiplier: 1.0, color: '#9CA3AF', icon: '⚪' },
  { id: 'rare', nameKey: 'rarity.rare', weight: 30, multiplier: 1.3, color: '#3ED1FF', icon: '🔵' },
  { id: 'epic', nameKey: 'rarity.epic', weight: 8, multiplier: 2.0, color: '#B36BFF', icon: '🟣' },
  { id: 'legendary', nameKey: 'rarity.legendary', weight: 2, multiplier: 5.0, color: '#FFD23E', icon: '🟡' },
];

export const ATHLETE_CASE_PRICE = 5000; // every case after the first free one
export const PHARMA_CASE_PRICE = 400;
export const GEAR_CASE_PRICE = 1200;

// Reference value per rarity, used to compute the 50% sell-back refund for
// athletes sitting in the inventory (incl. the currently equipped one).
export const ATHLETE_VALUE: Record<Rarity, number> = {
  common: 600,
  rare: 1800,
  epic: 4500,
  legendary: 13000,
};

// ── Levels / prestige titles ─────────────────────────────────────────────
// Level is ALWAYS derived live from the equipped athlete's base Strength
// stat (see utils/selectors.ts). The curve is intentionally steep near the
// top — reaching level 10 is meant to take a very long grind.
export const LEVELS: LevelConfig[] = [
  { level: 1, nameKey: 'level.1', tier: 'gray', strengthRequired: 0 },
  { level: 2, nameKey: 'level.2', tier: 'gray', strengthRequired: 50 },
  { level: 3, nameKey: 'level.3', tier: 'gray', strengthRequired: 150 },
  { level: 4, nameKey: 'level.4', tier: 'green', strengthRequired: 400 },
  { level: 5, nameKey: 'level.5', tier: 'green', strengthRequired: 900 },
  { level: 6, nameKey: 'level.6', tier: 'purple', strengthRequired: 1800 },
  { level: 7, nameKey: 'level.7', tier: 'purple', strengthRequired: 3500 },
  { level: 8, nameKey: 'level.8', tier: 'red', strengthRequired: 6500 },
  { level: 9, nameKey: 'level.9', tier: 'red', strengthRequired: 12000 },
  { level: 10, nameKey: 'level.10', tier: 'rainbow', strengthRequired: 25000 },
];

export const ADMIN_TELEGRAM_ID = 7623928167;

// ── Training Camp ───────────────────────────────────────────────────────
export const MUSCLE_GROUPS: MuscleGroupConfig[] = [
  { id: 'chest', nameKey: 'training.chest', icon: '💪', energyCost: 8, gains: { strength: 2 } },
  { id: 'back', nameKey: 'training.back', icon: '🦾', energyCost: 8, gains: { mass: 2 } },
  { id: 'legs', nameKey: 'training.legs', icon: '🦵', energyCost: 10, gains: { stamina: 1 } },
  { id: 'arms', nameKey: 'training.arms', icon: '🤜', energyCost: 6, gains: { strength: 1, mass: 1 } },
];

export const ENERGY_REGEN_PER_TICK = 1; // energy points
export const ENERGY_REGEN_TICK_MS = 30_000; // every 30s
export const CRIT_MULTIPLIER = 2;
export const MAX_CRIT_CHANCE = 0.4; // 40%
export const GENETICS_TO_CRIT = 0.006; // 1 genetics ≈ 0.6% crit

// ── Mining (passive $BULV generation) ───────────────────────────────────
export const BASE_MINING_RATE_PER_HOUR = 10;
export const MASS_MINING_COEFFICIENT = 0.85;
export const MAX_OFFLINE_MS = 12 * 60 * 60 * 1000; // cap offline earnings at 12h

// ── Nutrition (burn mechanic) ───────────────────────────────────────────
export const NUTRITION_ITEMS: NutritionItem[] = [
  {
    id: 'water',
    nameKey: 'nutrition.water.name',
    descKey: 'nutrition.water.desc',
    icon: '💧',
    price: 15,
    cooldownMs: 60_000,
    effect: { type: 'energy', energy: 8 },
  },
  {
    id: 'protein',
    nameKey: 'nutrition.protein.name',
    descKey: 'nutrition.protein.desc',
    icon: '🥤',
    price: 60,
    cooldownMs: 5 * 60_000,
    effect: { type: 'energy', energy: 28 },
  },
  {
    id: 'carbs',
    nameKey: 'nutrition.carbs.name',
    descKey: 'nutrition.carbs.desc',
    icon: '🍝',
    price: 45,
    cooldownMs: 10 * 60_000,
    effect: { type: 'miningBoost', energy: 12, boostPercent: 15, boostDurationMs: 30 * 60_000 },
  },
  {
    id: 'rest',
    nameKey: 'nutrition.rest.name',
    descKey: 'nutrition.rest.desc',
    icon: '🛌',
    price: 0,
    cooldownMs: 30 * 60_000,
    effect: { type: 'energy', energy: 999 },
  },
];

// ── Cyber-Pharma (high-risk boosts) ─────────────────────────────────────
// Purchase (shop or case) only stocks your inventory — the risk roll
// happens when you actually USE the item from there.
export const PHARMA_ITEMS: PharmaItem[] = [
  {
    id: 'titan_serum',
    nameKey: 'pharma.titan.name',
    descKey: 'pharma.titan.desc',
    icon: '🧪',
    price: 500,
    durationMs: 60 * 60_000,
    cooldownMs: 6 * 60 * 60_000,
    riskPercent: 12,
    effect: { type: 'strength', value: 50 },
  },
  {
    id: 'adrenaline_shot',
    nameKey: 'pharma.adrenaline.name',
    descKey: 'pharma.adrenaline.desc',
    icon: '💉',
    price: 300,
    durationMs: 15 * 60_000,
    cooldownMs: 3 * 60 * 60_000,
    riskPercent: 8,
    effect: { type: 'mining', value: 100 },
  },
  {
    id: 'growth_hormone',
    nameKey: 'pharma.gh9.name',
    descKey: 'pharma.gh9.desc',
    icon: '🦠',
    price: 800,
    durationMs: 0,
    cooldownMs: 12 * 60 * 60_000,
    riskPercent: 25,
    effect: { type: 'mass', value: 6 },
  },
  {
    id: 'mutagen_x',
    nameKey: 'pharma.mutagen.name',
    descKey: 'pharma.mutagen.desc',
    icon: '☣️',
    price: 1200,
    durationMs: 0,
    cooldownMs: 24 * 60 * 60_000,
    riskPercent: 35,
    effect: { type: 'genetics', value: 8 },
  },
];

// ── Gear Shop (permanent passive items) ─────────────────────────────────
// Purchase/case-drop stocks your inventory; equipping sets the bonus live.
export const GEAR_ITEMS: GearItem[] = [
  {
    id: 'crypto_shaker',
    nameKey: 'gear.shaker.name',
    descKey: 'gear.shaker.desc',
    icon: '🥛',
    price: 1500,
    effect: { type: 'mining', value: 5 },
  },
  {
    id: 'gravity_sneakers',
    nameKey: 'gear.sneakers.name',
    descKey: 'gear.sneakers.desc',
    icon: '👟',
    price: 2200,
    effect: { type: 'energyMax', value: 10 },
  },
  {
    id: 'neuro_headband',
    nameKey: 'gear.headband.name',
    descKey: 'gear.headband.desc',
    icon: '🧠',
    price: 1800,
    effect: { type: 'crit', value: 5 },
  },
  {
    id: 'titanium_gloves',
    nameKey: 'gear.gloves.name',
    descKey: 'gear.gloves.desc',
    icon: '🧤',
    price: 2600,
    effect: { type: 'strength', value: 8 },
  },
];

// ── Arena (tournaments) ──────────────────────────────────────────────────
export const LEAGUES: League[] = [
  {
    id: 'bronze',
    nameKey: 'arena.bronze',
    icon: '🥉',
    minPower: 0,
    entryFee: 50,
    rewardMin: 60,
    rewardMax: 140,
    cooldownMs: 60 * 60_000,
  },
  {
    id: 'silver',
    nameKey: 'arena.silver',
    icon: '🥈',
    minPower: 60,
    entryFee: 150,
    rewardMin: 180,
    rewardMax: 420,
    cooldownMs: 4 * 60 * 60_000,
  },
  {
    id: 'gold',
    nameKey: 'arena.gold',
    icon: '🥇',
    minPower: 150,
    entryFee: 400,
    rewardMin: 500,
    rewardMax: 1100,
    cooldownMs: 8 * 60 * 60_000,
  },
  {
    id: 'diamond',
    nameKey: 'arena.diamond',
    icon: '💎',
    minPower: 300,
    entryFee: 900,
    rewardMin: 1200,
    rewardMax: 2600,
    cooldownMs: 24 * 60 * 60_000,
  },
];

export const STORAGE_KEY = 'bulvara_save_v1';
export const LANG_STORAGE_KEY = 'bulvara_lang_v1';

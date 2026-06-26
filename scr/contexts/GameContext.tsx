import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  Athlete,
  GameState,
  MuscleGroup,
  Stats,
  StatKey,
  Rarity,
  ArenaResult,
  ActiveBoost,
  PharmaItem,
  GearItem,
  InventoryItem,
} from '../types';
import {
  MUSCLE_GROUPS,
  NUTRITION_ITEMS,
  PHARMA_ITEMS,
  GEAR_ITEMS,
  LEAGUES,
  ATHLETE_CASE_PRICE,
  PHARMA_CASE_PRICE,
  GEAR_CASE_PRICE,
  ATHLETE_VALUE,
  ENERGY_REGEN_TICK_MS,
  ENERGY_REGEN_PER_TICK,
  STORAGE_KEY,
  MAX_OFFLINE_MS,
  CRIT_MULTIPLIER,
} from '../utils/constants';
import { rollRarity, createAthlete } from '../utils/rarity';
import {
  getEnergyMax,
  getCritChance,
  getEffectiveStrength,
  getMiningRatePerHour,
  getRarityMultiplier,
  getPower,
} from '../utils/selectors';
import { randomInRange } from '../utils/format';

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

const DEFAULT_STATE: GameState = {
  athlete: null,
  bulv: 150,
  totalMined: 0,
  lastTick: Date.now(),
  ownedGear: {},
  pharmaCooldowns: {},
  nutritionCooldowns: {},
  arenaCooldowns: {},
  activeBoosts: [],
  arenaHistory: [],
  inventory: [],
  hasUsedFreeCase: false,
};

function loadInitialState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE, lastTick: Date.now() };
    const saved = JSON.parse(raw) as GameState;
    const merged: GameState = { ...DEFAULT_STATE, ...saved };
    const now = Date.now();
    const elapsed = Math.min(now - (merged.lastTick ?? now), MAX_OFFLINE_MS);

    if (merged.athlete && elapsed > 1000) {
      const rate = getMiningRatePerHour(merged);
      const mined = (rate / 3_600_000) * elapsed;
      const energyMax = getEnergyMax(merged);
      const regen = (elapsed / ENERGY_REGEN_TICK_MS) * ENERGY_REGEN_PER_TICK;
      merged.bulv += mined;
      merged.totalMined += mined;
      merged.athlete = { ...merged.athlete, energy: Math.min(energyMax, merged.athlete.energy + regen) };
    }
    // Migration safety net: older saves didn't have this flag — if the
    // player already had an athlete, their free case was clearly used.
    if (merged.athlete && !saved.hasUsedFreeCase) merged.hasUsedFreeCase = true;
    merged.inventory = merged.inventory || [];
    merged.activeBoosts = (merged.activeBoosts || []).filter((b) => b.expiresAt > now);
    merged.lastTick = now;
    return merged;
  } catch {
    return { ...DEFAULT_STATE, lastTick: Date.now() };
  }
}

/**
 * Shared pharma-effect resolver used wherever a pharma item is actually
 * USED (never at purchase time — purchases only stock the inventory).
 */
function applyPharmaOutcome(
  athlete: Athlete,
  activeBoosts: ActiveBoost[],
  item: PharmaItem,
  failed: boolean
): { athlete: Athlete; activeBoosts: ActiveBoost[] } {
  if (item.durationMs > 0) {
    const value = failed ? -Math.round(item.effect.value * 0.5) : item.effect.value;
    return {
      athlete,
      activeBoosts: [
        ...activeBoosts,
        { sourceId: item.id, type: item.effect.type, value, expiresAt: Date.now() + item.durationMs },
      ],
    };
  }
  const statKey = item.effect.type as 'mass' | 'genetics';
  const delta = failed ? -Math.round(item.effect.value * 0.5) : item.effect.value;
  return {
    athlete: {
      ...athlete,
      stats: { ...athlete.stats, [statKey]: Math.max(1, athlete.stats[statKey] + delta) },
    },
    activeBoosts,
  };
}

export interface TrainResult {
  ok: boolean;
  reason?: 'no_athlete' | 'no_energy';
  crit?: boolean;
  gains?: Partial<Stats>;
  bulvBonus?: number;
}

export interface NutritionResult {
  ok: boolean;
  reason?: 'no_athlete' | 'cooldown' | 'no_bulv';
  energyRestored?: number;
}

export interface PharmaActionResult {
  ok: boolean;
  reason?: 'no_athlete' | 'no_bulv';
}

export interface GearActionResult {
  ok: boolean;
  reason?: 'no_bulv';
}

export interface ArenaActionResult {
  ok: boolean;
  reason?: 'no_athlete' | 'locked' | 'cooldown' | 'no_bulv';
  result?: ArenaResult;
}

export interface OpenAthleteCaseResult {
  ok: boolean;
  reason?: 'no_bulv';
  athlete?: Athlete;
  /** true if it became your equipped athlete; false if it went to the bench (inventory). */
  becameActive?: boolean;
}

export interface PharmaCaseResult {
  ok: boolean;
  reason?: 'no_athlete' | 'no_bulv';
  item?: PharmaItem;
}

export interface GearCaseResult {
  ok: boolean;
  reason?: 'no_athlete' | 'no_bulv';
  item?: GearItem;
}

export interface SellResult {
  ok: boolean;
  refund?: number;
}

export interface UsePharmaResult {
  ok: boolean;
  reason?: 'not_found' | 'no_athlete' | 'cooldown';
  failed?: boolean;
}

interface GameContextValue {
  state: GameState;
  energyMax: number;
  critChance: number;
  effectiveStrength: number;
  miningRatePerHour: number;
  rarityMultiplier: number;
  power: number;
  openAthleteCase: () => OpenAthleteCaseResult;
  trainMuscle: (group: MuscleGroup) => TrainResult;
  consumeNutrition: (itemId: string) => NutritionResult;
  buyPharma: (itemId: string) => PharmaActionResult;
  buyGear: (itemId: string) => GearActionResult;
  enterArena: (leagueId: string) => ArenaActionResult;
  openPharmaCase: () => PharmaCaseResult;
  openGearCase: () => GearCaseResult;
  equipAthlete: (inventoryItemId: string) => void;
  equipGear: (inventoryItemId: string) => void;
  sellInventoryItem: (inventoryItemId: string) => SellResult;
  sellActiveAthlete: () => SellResult;
  useInventoryPharma: (inventoryItemId: string) => UsePharmaResult;
  // ── Admin-only (gated in the UI, not here — see AdminPanel.tsx) ────────
  adminGiveBulv: (amount: number) => void;
  adminSetAthleteRarity: (rarity: Rarity) => void;
  adminMaxStats: () => void;
  adminFullEnergy: () => void;
  adminUnlockAllGear: () => void;
  adminResetCooldowns: () => void;
  adminResetSave: () => void;
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(loadInitialState);

  // Persist to localStorage (debounced) on every state change.
  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        /* storage unavailable — ignore */
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [state]);

  // Passive tick: mining, energy regen, boost expiry.
  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => {
        const now = Date.now();
        const activeBoosts = prev.activeBoosts.filter((b) => b.expiresAt > now);
        if (!prev.athlete) {
          return { ...prev, lastTick: now, activeBoosts };
        }
        const deltaMs = now - prev.lastTick;
        const rate = getMiningRatePerHour(prev);
        const mined = (rate / 3_600_000) * deltaMs;
        const energyMax = getEnergyMax(prev);
        const energyRegen = (deltaMs / ENERGY_REGEN_TICK_MS) * ENERGY_REGEN_PER_TICK;
        return {
          ...prev,
          bulv: prev.bulv + mined,
          totalMined: prev.totalMined + mined,
          lastTick: now,
          activeBoosts,
          athlete: { ...prev.athlete, energy: Math.min(energyMax, prev.athlete.energy + energyRegen) },
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const energyMax = useMemo(() => getEnergyMax(state), [state]);
  const critChance = useMemo(() => getCritChance(state), [state]);
  const effectiveStrength = useMemo(() => getEffectiveStrength(state), [state]);
  const miningRatePerHour = useMemo(() => getMiningRatePerHour(state), [state]);
  const rarityMultiplier = useMemo(() => getRarityMultiplier(state), [state]);
  const power = useMemo(() => getPower(state), [state]);

  /** The single entry point for the Athlete Case. First one ever is free. */
  function openAthleteCase(): OpenAthleteCaseResult {
    const isFree = !state.hasUsedFreeCase;
    if (!isFree && state.bulv < ATHLETE_CASE_PRICE) return { ok: false, reason: 'no_bulv' };

    const athlete = createAthlete(rollRarity());
    const cost = isFree ? 0 : ATHLETE_CASE_PRICE;
    const becameActive = !state.athlete;

    setState((prev) => {
      if (!prev.athlete) {
        return { ...prev, athlete, bulv: prev.bulv - cost, hasUsedFreeCase: true };
      }
      const benched: InventoryItem = {
        id: genId('inv'),
        kind: 'athlete',
        refId: athlete.rarity,
        athlete,
        acquiredAt: Date.now(),
      };
      return { ...prev, inventory: [benched, ...prev.inventory], bulv: prev.bulv - cost, hasUsedFreeCase: true };
    });

    return { ok: true, athlete, becameActive };
  }

  function trainMuscle(group: MuscleGroup): TrainResult {
    if (!state.athlete) return { ok: false, reason: 'no_athlete' };
    const config = MUSCLE_GROUPS.find((g) => g.id === group)!;
    if (state.athlete.energy < config.energyCost) return { ok: false, reason: 'no_energy' };

    const crit = Math.random() < critChance;
    const mult = (crit ? CRIT_MULTIPLIER : 1) * rarityMultiplier;
    const gains: Partial<Stats> = {};
    (Object.keys(config.gains) as StatKey[]).forEach((key) => {
      gains[key] = Math.round((config.gains[key] ?? 0) * mult);
    });
    const newStats: Stats = { ...state.athlete.stats };
    (Object.keys(gains) as StatKey[]).forEach((key) => {
      newStats[key] = newStats[key] + (gains[key] ?? 0);
    });
    const bulvBonus = crit ? 5 : 0;
    const prevEnergy = state.athlete.energy;

    setState((prev) => {
      if (!prev.athlete) return prev;
      const newEnergyMax = getEnergyMax({ ...prev, athlete: { ...prev.athlete, stats: newStats } });
      return {
        ...prev,
        bulv: prev.bulv + bulvBonus,
        athlete: {
          ...prev.athlete,
          stats: newStats,
          energy: Math.min(newEnergyMax, Math.max(0, prevEnergy - config.energyCost)),
        },
      };
    });
    return { ok: true, crit, gains, bulvBonus };
  }

  function consumeNutrition(itemId: string): NutritionResult {
    if (!state.athlete) return { ok: false, reason: 'no_athlete' };
    const item = NUTRITION_ITEMS.find((n) => n.id === itemId)!;
    const cooldownUntil = state.nutritionCooldowns[itemId] ?? 0;
    if (Date.now() < cooldownUntil) return { ok: false, reason: 'cooldown' };
    if (state.bulv < item.price) return { ok: false, reason: 'no_bulv' };

    const energyMax = getEnergyMax(state);
    const energyRestored = Math.min(energyMax, state.athlete.energy + (item.effect.energy ?? 0)) - state.athlete.energy;

    setState((prev) => {
      if (!prev.athlete) return prev;
      const max = getEnergyMax(prev);
      const newBoosts = [...prev.activeBoosts];
      if (item.effect.type === 'miningBoost' && item.effect.boostPercent) {
        newBoosts.push({
          sourceId: item.id,
          type: 'miningBoost',
          value: item.effect.boostPercent,
          expiresAt: Date.now() + (item.effect.boostDurationMs ?? 0),
        });
      }
      return {
        ...prev,
        bulv: prev.bulv - item.price,
        activeBoosts: newBoosts,
        nutritionCooldowns: { ...prev.nutritionCooldowns, [itemId]: Date.now() + item.cooldownMs },
        athlete: { ...prev.athlete, energy: Math.min(max, prev.athlete.energy + (item.effect.energy ?? 0)) },
      };
    });
    return { ok: true, energyRestored: Math.round(energyRestored) };
  }

  /** Shop purchase — only stocks the inventory. No effect applied yet. */
  function buyPharma(itemId: string): PharmaActionResult {
    if (!state.athlete) return { ok: false, reason: 'no_athlete' };
    const item = PHARMA_ITEMS.find((p) => p.id === itemId)!;
    if (state.bulv < item.price) return { ok: false, reason: 'no_bulv' };

    setState((prev) => ({
      ...prev,
      bulv: prev.bulv - item.price,
      inventory: [{ id: genId('inv'), kind: 'pharma', refId: item.id, acquiredAt: Date.now() }, ...prev.inventory],
    }));
    return { ok: true };
  }

  /** Shop purchase — only stocks the inventory. Equip later to get the bonus. */
  function buyGear(itemId: string): GearActionResult {
    const item = GEAR_ITEMS.find((g) => g.id === itemId)!;
    if (state.bulv < item.price) return { ok: false, reason: 'no_bulv' };

    setState((prev) => ({
      ...prev,
      bulv: prev.bulv - item.price,
      inventory: [{ id: genId('inv'), kind: 'gear', refId: item.id, acquiredAt: Date.now() }, ...prev.inventory],
    }));
    return { ok: true };
  }

  function enterArena(leagueId: string): ArenaActionResult {
    if (!state.athlete) return { ok: false, reason: 'no_athlete' };
    const league = LEAGUES.find((l) => l.id === leagueId)!;
    if (power < league.minPower) return { ok: false, reason: 'locked' };
    const cooldownUntil = state.arenaCooldowns[leagueId] ?? 0;
    if (Date.now() < cooldownUntil) return { ok: false, reason: 'cooldown' };
    if (state.bulv < league.entryFee) return { ok: false, reason: 'no_bulv' };

    const opponentPower = Math.round(league.minPower * (0.75 + Math.random() * 0.55) + 12);
    const win = power + randomInRange(-10, 10) >= opponentPower;
    const reward = win
      ? Math.round(randomInRange(league.rewardMin, league.rewardMax) * Math.min(1.4, power / Math.max(1, opponentPower)))
      : 0;
    const result: ArenaResult = { leagueId, win, reward, power, opponentPower, timestamp: Date.now() };

    setState((prev) => ({
      ...prev,
      bulv: prev.bulv - league.entryFee + reward,
      arenaCooldowns: { ...prev.arenaCooldowns, [leagueId]: Date.now() + league.cooldownMs },
      arenaHistory: [result, ...prev.arenaHistory].slice(0, 20),
    }));

    return { ok: true, result };
  }

  /** Cyber-Pharma case: any pharma item with equal odds, straight to inventory. */
  function openPharmaCase(): PharmaCaseResult {
    if (!state.athlete) return { ok: false, reason: 'no_athlete' };
    if (state.bulv < PHARMA_CASE_PRICE) return { ok: false, reason: 'no_bulv' };

    const item = PHARMA_ITEMS[Math.floor(Math.random() * PHARMA_ITEMS.length)];
    setState((prev) => ({
      ...prev,
      bulv: prev.bulv - PHARMA_CASE_PRICE,
      inventory: [{ id: genId('inv'), kind: 'pharma', refId: item.id, acquiredAt: Date.now() }, ...prev.inventory],
    }));
    return { ok: true, item };
  }

  /** Gear case: any gear piece with equal odds (duplicates are sellable). */
  function openGearCase(): GearCaseResult {
    if (!state.athlete) return { ok: false, reason: 'no_athlete' };
    if (state.bulv < GEAR_CASE_PRICE) return { ok: false, reason: 'no_bulv' };

    const item = GEAR_ITEMS[Math.floor(Math.random() * GEAR_ITEMS.length)];
    setState((prev) => ({
      ...prev,
      bulv: prev.bulv - GEAR_CASE_PRICE,
      inventory: [{ id: genId('inv'), kind: 'gear', refId: item.id, acquiredAt: Date.now() }, ...prev.inventory],
    }));
    return { ok: true, item };
  }

  /** Equip a benched athlete — swaps it with whatever is currently active. */
  function equipAthlete(inventoryItemId: string) {
    setState((prev) => {
      const item = prev.inventory.find((i) => i.id === inventoryItemId && i.kind === 'athlete');
      if (!item || !item.athlete) return prev;
      const remaining = prev.inventory.filter((i) => i.id !== inventoryItemId);
      if (prev.athlete) {
        remaining.push({
          id: genId('inv'),
          kind: 'athlete',
          refId: prev.athlete.rarity,
          athlete: prev.athlete,
          acquiredAt: Date.now(),
        });
      }
      return { ...prev, athlete: item.athlete, inventory: remaining };
    });
  }

  /** Equip a gear item from inventory — turns its passive bonus on. */
  function equipGear(inventoryItemId: string) {
    setState((prev) => {
      const item = prev.inventory.find((i) => i.id === inventoryItemId && i.kind === 'gear');
      if (!item) return prev;
      return {
        ...prev,
        ownedGear: { ...prev.ownedGear, [item.refId]: true },
        inventory: prev.inventory.filter((i) => i.id !== inventoryItemId),
      };
    });
  }

  /** Sell any inventory item (athlete / gear / pharma) for 50% of its value. */
  function sellInventoryItem(inventoryItemId: string): SellResult {
    const item = state.inventory.find((i) => i.id === inventoryItemId);
    if (!item) return { ok: false };

    let refund = 0;
    if (item.kind === 'athlete' && item.athlete) {
      refund = Math.round(ATHLETE_VALUE[item.athlete.rarity] * 0.5);
    } else if (item.kind === 'gear') {
      const def = GEAR_ITEMS.find((g) => g.id === item.refId);
      refund = def ? Math.round(def.price * 0.5) : 0;
    } else if (item.kind === 'pharma') {
      const def = PHARMA_ITEMS.find((p) => p.id === item.refId);
      refund = def ? Math.round(def.price * 0.5) : 0;
    }

    setState((prev) => ({
      ...prev,
      bulv: prev.bulv + refund,
      inventory: prev.inventory.filter((i) => i.id !== inventoryItemId),
    }));
    return { ok: true, refund };
  }

  /** Sell the currently equipped athlete directly (it isn't in the inventory array). */
  function sellActiveAthlete(): SellResult {
    if (!state.athlete) return { ok: false };
    const refund = Math.round(ATHLETE_VALUE[state.athlete.rarity] * 0.5);
    setState((prev) => ({ ...prev, bulv: prev.bulv + refund, athlete: null }));
    return { ok: true, refund };
  }

  /** Use a pharma item straight from the inventory — risk is rolled NOW. */
  function useInventoryPharma(inventoryItemId: string): UsePharmaResult {
    const item = state.inventory.find((i) => i.id === inventoryItemId && i.kind === 'pharma');
    if (!item) return { ok: false, reason: 'not_found' };
    if (!state.athlete) return { ok: false, reason: 'no_athlete' };
    const def = PHARMA_ITEMS.find((p) => p.id === item.refId);
    if (!def) return { ok: false, reason: 'not_found' };
    const cooldownUntil = state.pharmaCooldowns[def.id] ?? 0;
    if (Date.now() < cooldownUntil) return { ok: false, reason: 'cooldown' };

    const failed = Math.random() * 100 < def.riskPercent;

    setState((prev) => {
      if (!prev.athlete) return prev;
      const { athlete, activeBoosts } = applyPharmaOutcome(prev.athlete, prev.activeBoosts, def, failed);
      return {
        ...prev,
        athlete,
        activeBoosts,
        pharmaCooldowns: { ...prev.pharmaCooldowns, [def.id]: Date.now() + def.cooldownMs },
        inventory: prev.inventory.filter((i) => i.id !== inventoryItemId),
      };
    });

    return { ok: true, failed };
  }

  // ── Admin tools ──────────────────────────────────────────────────────
  function adminGiveBulv(amount: number) {
    setState((prev) => ({ ...prev, bulv: Math.max(0, prev.bulv + amount) }));
  }

  function adminSetAthleteRarity(rarity: Rarity) {
    setState((prev) => ({ ...prev, athlete: createAthlete(rarity) }));
  }

  function adminMaxStats() {
    setState((prev) =>
      prev.athlete
        ? { ...prev, athlete: { ...prev.athlete, stats: { strength: 999, mass: 999, stamina: 999, genetics: 999 } } }
        : prev
    );
  }

  function adminFullEnergy() {
    setState((prev) => {
      if (!prev.athlete) return prev;
      const max = getEnergyMax(prev);
      return { ...prev, athlete: { ...prev.athlete, energy: max } };
    });
  }

  function adminUnlockAllGear() {
    setState((prev) => {
      const ownedGear = { ...prev.ownedGear };
      GEAR_ITEMS.forEach((g) => (ownedGear[g.id] = true));
      return { ...prev, ownedGear };
    });
  }

  function adminResetCooldowns() {
    setState((prev) => ({ ...prev, pharmaCooldowns: {}, nutritionCooldowns: {}, arenaCooldowns: {} }));
  }

  function adminResetSave() {
    setState({ ...DEFAULT_STATE, lastTick: Date.now() });
  }

  const value: GameContextValue = {
    state,
    energyMax,
    critChance,
    effectiveStrength,
    miningRatePerHour,
    rarityMultiplier,
    power,
    openAthleteCase,
    trainMuscle,
    consumeNutrition,
    buyPharma,
    buyGear,
    enterArena,
    openPharmaCase,
    openGearCase,
    equipAthlete,
    equipGear,
    sellInventoryItem,
    sellActiveAthlete,
    useInventoryPharma,
    adminGiveBulv,
    adminSetAthleteRarity,
    adminMaxStats,
    adminFullEnergy,
    adminUnlockAllGear,
    adminResetCooldowns,
    adminResetSave,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

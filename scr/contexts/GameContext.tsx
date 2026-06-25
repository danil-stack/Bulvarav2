import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Athlete, GameState, MuscleGroup, Stats, StatKey, ArenaResult } from '../types';
import {
  MUSCLE_GROUPS,
  NUTRITION_ITEMS,
  PHARMA_ITEMS,
  GEAR_ITEMS,
  LEAGUES,
  CAPSULE_REROLL_COST,
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
  getPower,
} from '../utils/selectors';
import { randomInRange } from '../utils/format';

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
    merged.activeBoosts = (merged.activeBoosts || []).filter((b) => b.expiresAt > now);
    merged.lastTick = now;
    return merged;
  } catch {
    return { ...DEFAULT_STATE, lastTick: Date.now() };
  }
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
  reason?: 'no_athlete' | 'cooldown' | 'no_bulv';
  failed?: boolean;
}

export interface GearActionResult {
  ok: boolean;
  reason?: 'owned' | 'no_bulv';
}

export interface ArenaActionResult {
  ok: boolean;
  reason?: 'no_athlete' | 'locked' | 'cooldown' | 'no_bulv';
  result?: ArenaResult;
}

export interface RerollResult {
  ok: boolean;
  reason?: 'no_athlete' | 'no_bulv';
  athlete?: Athlete;
}

interface GameContextValue {
  state: GameState;
  energyMax: number;
  critChance: number;
  effectiveStrength: number;
  miningRatePerHour: number;
  power: number;
  mintCapsule: () => Athlete | null;
  rerollCapsule: () => RerollResult;
  trainMuscle: (group: MuscleGroup) => TrainResult;
  consumeNutrition: (itemId: string) => NutritionResult;
  buyPharma: (itemId: string) => PharmaActionResult;
  buyGear: (itemId: string) => GearActionResult;
  enterArena: (leagueId: string) => ArenaActionResult;
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
  const power = useMemo(() => getPower(state), [state]);

  function mintCapsule(): Athlete | null {
    if (state.athlete) return null;
    const athlete = createAthlete(rollRarity());
    setState((prev) => ({ ...prev, athlete }));
    return athlete;
  }

  function rerollCapsule(): RerollResult {
    if (!state.athlete) return { ok: false, reason: 'no_athlete' };
    if (state.bulv < CAPSULE_REROLL_COST) return { ok: false, reason: 'no_bulv' };
    const athlete = createAthlete(rollRarity());
    setState((prev) => ({ ...prev, athlete, bulv: prev.bulv - CAPSULE_REROLL_COST }));
    return { ok: true, athlete };
  }

  function trainMuscle(group: MuscleGroup): TrainResult {
    if (!state.athlete) return { ok: false, reason: 'no_athlete' };
    const config = MUSCLE_GROUPS.find((g) => g.id === group)!;
    if (state.athlete.energy < config.energyCost) return { ok: false, reason: 'no_energy' };

    const crit = Math.random() < critChance;
    const mult = crit ? CRIT_MULTIPLIER : 1;
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

  function buyPharma(itemId: string): PharmaActionResult {
    if (!state.athlete) return { ok: false, reason: 'no_athlete' };
    const item = PHARMA_ITEMS.find((p) => p.id === itemId)!;
    const cooldownUntil = state.pharmaCooldowns[itemId] ?? 0;
    if (Date.now() < cooldownUntil) return { ok: false, reason: 'cooldown' };
    if (state.bulv < item.price) return { ok: false, reason: 'no_bulv' };

    const failed = Math.random() * 100 < item.riskPercent;

    setState((prev) => {
      if (!prev.athlete) return prev;
      let newAthlete = prev.athlete;
      const newBoosts = [...prev.activeBoosts];

      if (item.durationMs > 0) {
        const value = failed ? -Math.round(item.effect.value * 0.5) : item.effect.value;
        newBoosts.push({
          sourceId: item.id,
          type: item.effect.type,
          value,
          expiresAt: Date.now() + item.durationMs,
        });
      } else {
        const statKey = item.effect.type as 'mass' | 'genetics';
        const delta = failed ? -Math.round(item.effect.value * 0.5) : item.effect.value;
        newAthlete = {
          ...prev.athlete,
          stats: { ...prev.athlete.stats, [statKey]: Math.max(1, prev.athlete.stats[statKey] + delta) },
        };
      }

      return {
        ...prev,
        bulv: prev.bulv - item.price,
        athlete: newAthlete,
        activeBoosts: newBoosts,
        pharmaCooldowns: { ...prev.pharmaCooldowns, [itemId]: Date.now() + item.cooldownMs },
      };
    });

    return { ok: true, failed };
  }

  function buyGear(itemId: string): GearActionResult {
    const item = GEAR_ITEMS.find((g) => g.id === itemId)!;
    if (state.ownedGear[itemId]) return { ok: false, reason: 'owned' };
    if (state.bulv < item.price) return { ok: false, reason: 'no_bulv' };
    setState((prev) => ({
      ...prev,
      bulv: prev.bulv - item.price,
      ownedGear: { ...prev.ownedGear, [itemId]: true },
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

  const value: GameContextValue = {
    state,
    energyMax,
    critChance,
    effectiveStrength,
    miningRatePerHour,
    power,
    mintCapsule,
    rerollCapsule,
    trainMuscle,
    consumeNutrition,
    buyPharma,
    buyGear,
    enterArena,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

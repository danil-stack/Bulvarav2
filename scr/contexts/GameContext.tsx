import { createContext, useContext, useEffect, useMemo, useState, useRef, type ReactNode } from 'react';
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
  ENERGY_REGEN_TICK_MS,
  ENERGY_REGEN_PER_TICK,
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

function getTelegramId(): number {
  try {
    // @ts-ignore
    const tg = window.Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user?.id) {
      return tg.initDataUnsafe.user.id;
    }
  } catch (e) {
    console.error("Не удалось получить Telegram ID:", e);
  }
  return 123456789; 
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

export interface PharmaCaseResult {
  ok: boolean;
  reason?: 'no_athlete' | 'no_bulv';
  item?: PharmaItem;
  failed?: boolean;
}

export interface GearCaseResult {
  ok: boolean;
  reason?: 'no_athlete' | 'no_bulv' | 'all_owned';
  item?: GearItem;
}

interface GameContextValue {
  state: GameState;
  isLoading: boolean;
  energyMax: number;
  critChance: number;
  effectiveStrength: number;
  miningRatePerHour: number;
  rarityMultiplier: number;
  power: number;
  mintCapsule: () => Athlete | null;
  rerollCapsule: () => RerollResult;
  trainMuscle: (group: MuscleGroup) => TrainResult;
  consumeNutrition: (itemId: string) => NutritionResult;
  buyPharma: (itemId: string) => PharmaActionResult;
  buyGear: (itemId: string) => GearActionResult;
  enterArena: (leagueId: string) => ArenaActionResult;
  openPharmaCase: () => PharmaCaseResult;
  openGearCase: () => GearCaseResult;
  adminGiveBulv: (amount: number) => void;
  adminSetAthleteRarity: (rarity: Rarity) => void;
  adminMaxStats: () => void;
  adminFullEnergy: () => void;
  adminUnlockAllGear: () => void;
  adminResetCooldowns: () => void;
  adminResetSave: () => void;
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

function applyPharmaOutcome(
  athlete: Athlete,
  activeBoosts: ActiveBoost[],
  item: PharmaItem,
  failed: boolean
) {
  if (item.durationMs > 0) {
    const value = failed ? -Math.round(item.effect.value * 0.5) : item.effect.value;
    const newBoost: ActiveBoost = {
      sourceId: item.id,
      type: item.effect.type,
      value,
      expiresAt: Date.now() + item.durationMs,
    };
    return {
      athlete,
      activeBoosts: [...activeBoosts, newBoost],
    };
  } else {
    const statKey = item.effect.type as 'mass' | 'genetics';
    const delta = failed ? -Math.round(item.effect.value * 0.5) : item.effect.value;
    const currentVal = athlete.stats[statKey];
    const newVal = Math.max(1, currentVal + delta);

    return {
      athlete: {
        ...athlete,
        stats: {
          ...athlete.stats,
          [statKey]: newVal,
        },
      },
      activeBoosts,
    };
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>({ ...DEFAULT_STATE, lastTick: Date.now() });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const telegramId = useMemo(() => getTelegramId(), []);

  // Ссылка на актуальный стейт для безопасного автосохранения без побочных эффектов в setState
  const stateRef = useRef<GameState>(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // 🔒 ЗАГРУЗКА ДАННЫХ ИЗ БАЗЫ ЧЕРЕЗ БЭКЕНД
  useEffect(() => {
    async function loadFromBackend() {
      // @ts-ignore
      const initData = window.Telegram?.WebApp?.initData || "";
      try {
        const res = await fetch('/api/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            initData, 
            telegramId: telegramId // Передаем ID в чистом виде напрямую
          })
        });

        const data = await res.json();
        
        if (res.ok && data.success) {
          const incomingPayload = data.opened_cases && typeof data.opened_cases === 'object' ? data.opened_cases : {};
          
          let loadedState: GameState = {
            ...DEFAULT_STATE,
            ...incomingPayload,
            bulv: data.balance !== undefined ? Number(data.balance) : DEFAULT_STATE.bulv,
          };
          
          // Защита старых игроков: если баланс есть, а атлета в jsonb не было, выдаем базового
          if (!loadedState.athlete && loadedState.bulv > 150) {
            loadedState.athlete = {
              id: "restored_" + Date.now(),
              name: "Атлет",
              rarity: "common",
              energy: 1000,
              stats: { strength: 10, mass: 10, stamina: 10, genetics: 10 }
            };
          }
          
          const now = Date.now();
          const elapsed = Math.min(now - (loadedState.lastTick ?? now), MAX_OFFLINE_MS);
          
          if (loadedState.athlete && elapsed > 1000) {
            const rate = getMiningRatePerHour(loadedState);
            const mined = (rate / 3_600_000) * elapsed;
            const energyMax = getEnergyMax(loadedState);
            const regen = (elapsed / ENERGY_REGEN_TICK_MS) * ENERGY_REGEN_PER_TICK;

            loadedState.bulv += mined;
            loadedState.totalMined += mined;
            loadedState.athlete = {
              ...loadedState.athlete,
              energy: Math.min(energyMax, loadedState.athlete.energy + regen),
            };
          }
          
          loadedState.activeBoosts = (loadedState.activeBoosts || []).filter((b) => b.expiresAt > now);
          loadedState.lastTick = now;
          setState(loadedState);
        } else {
          console.error("Ошибка загрузки данных бэкенда:", data.error);
        }
      } catch (e) {
        console.error("Ошибка сети с бэкендом Vercel:", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadFromBackend();
  }, [telegramId]);

  // 🔒 АВТОСОХРАНЕНИЕ ВСЕГО ИГРОВОГО СТЕТА НА БЭКЕНД
  useEffect(() => {
    if (isLoading) return;

    const interval = setInterval(() => {
      // @ts-ignore
      const initData = window.Telegram?.WebApp?.initData || "";
      const currentSnap = stateRef.current;
      const { bulv, ...metaState } = currentSnap;
      
      fetch('/api/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData,
          telegramId: telegramId, // Передаем ID в чистом виде напрямую
          isSaveRequest: true,
          balance: Math.round(currentSnap.bulv),
          opened_cases: metaState
        })
      })
      .then(async (res) => {
        const data = await res.json();
        if (!data.success) {
          console.error("Ошибка сохранения на бэкенд:", data.error);
        }
      })
      .catch(e => console.error("Ошибка отправки сохранения на бэкенд:", e));
    }, 5000);

    return () => clearInterval(interval);
  }, [isLoading, telegramId]);

  // ЕЖЕСЕКУНДНЫЙ ТИК ИГРЫ (МАЙНИНГ И РЕГЕНЕРАЦИЯ ЭНЕРГИИ)
  useEffect(() => {
    if (isLoading) return;
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
          athlete: {
            ...prev.athlete,
            energy: Math.min(energyMax, prev.athlete.energy + energyRegen),
          },
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoading]);

  const energyMax = useMemo(() => getEnergyMax(state), [state]);
  const critChance = useMemo(() => getCritChance(state), [state]);
  const effectiveStrength = useMemo(() => getEffectiveStrength(state), [state]);
  const miningRatePerHour = useMemo(() => getMiningRatePerHour(state), [state]);
  const rarityMultiplier = useMemo(() => getRarityMultiplier(state), [state]);
  const power = useMemo(() => getPower(state), [state]);

  function mintCapsule() {
    if (state.athlete) return null;
    const rarity = rollRarity();
    const athlete = createAthlete(rarity);
    setState((prev) => ({ ...prev, athlete }));
    return athlete;
  }

  function rerollCapsule(): RerollResult {
    if (!state.athlete) return { ok: false, reason: 'no_athlete' };
    if (state.bulv < ATHLETE_CASE_PRICE) return { ok: false, reason: 'no_bulv' };

    const rarity = rollRarity();
    const athlete = createAthlete(rarity);

    setState((prev) => ({
      ...prev,
      athlete,
      bulv: prev.bulv - ATHLETE_CASE_PRICE,
    }));

    return { ok: true, athlete };
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
    const cd = state.nutritionCooldowns[itemId] ?? 0;
    if (Date.now() < cd) return { ok: false, reason: 'cooldown' };
    if (state.bulv < item.price) return { ok: false, reason: 'no_bulv' };

    const currentEnergyMax = getEnergyMax(state);
    const energyRestored = Math.min(currentEnergyMax, state.athlete.energy + (item.effect.energy ?? 0)) - state.athlete.energy;

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
        nutritionCooldowns: {
          ...prev.nutritionCooldowns,
          [itemId]: Date.now() + item.cooldownMs,
        },
        athlete: {
          ...prev.athlete,
          energy: Math.min(max, prev.athlete.energy + (item.effect.energy ?? 0)),
        },
      };
    });

    return { ok: true, energyRestored: Math.round(energyRestored) };
  }

  function buyPharma(itemId: string): PharmaActionResult {
    if (!state.athlete) return { ok: false, reason: 'no_athlete' };

    const item = PHARMA_ITEMS.find((p) => p.id === itemId)!;
    const cd = state.pharmaCooldowns[itemId] ?? 0;
    if (Date.now() < cd) return { ok: false, reason: 'cooldown' };
    if (state.bulv < item.price) return { ok: false, reason: 'no_bulv' };

    const failed = Math.random() * 100 < item.riskPercent;

    setState((prev) => {
      if (!prev.athlete) return prev;
      const { athlete, activeBoosts } = applyPharmaOutcome(
        prev.athlete,
        prev.activeBoosts,
        item,
        failed
      );
      return {
        ...prev,
        bulv: prev.bulv - item.price,
        athlete,
        activeBoosts,
        pharmaCooldowns: {
          ...prev.pharmaCooldowns,
          [itemId]: Date.now() + item.cooldownMs,
        },
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
      ownedGear: {
        ...prev.ownedGear,
        [itemId]: true,
      },
    }));

    return { ok: true };
  }

  function enterArena(leagueId: string): ArenaActionResult {
    if (!state.athlete) return { ok: false, reason: 'no_athlete' };

    const league = LEAGUES.find((l) => l.id === leagueId)!;
    if (power < league.minPower) return { ok: false, reason: 'locked' };

    const cd = state.arenaCooldowns[leagueId] ?? 0;
    if (Date.now() < cd) return { ok: false, reason: 'cooldown' };
    if (state.bulv < league.entryFee) return { ok: false, reason: 'no_bulv' };

    const opponentPower = Math.round(league.minPower * (0.75 + Math.random() * 0.55) + 12);
    const win = power + randomInRange(-10, 10) >= opponentPower;

    let reward = 0;
    if (win) {
      const baseReward = randomInRange(league.rewardMin, league.rewardMax);
      const ratio = power / Math.max(1, opponentPower);
      reward = Math.round(baseReward * Math.min(1.4, ratio));
    }

    const result: ArenaResult = {
      leagueId,
      win,
      reward,
      power,
      opponentPower,
      timestamp: Date.now(),
    };

    setState((prev) => ({
      ...prev,
      bulv: prev.bulv - league.entryFee + reward,
      arenaCooldowns: {
        ...prev.arenaCooldowns,
        [leagueId]: Date.now() + league.cooldownMs,
      },
      arenaHistory: [result, ...prev.arenaHistory].slice(0, 20),
    }));

    return { ok: true, result };
  }

  function openPharmaCase(): PharmaCaseResult {
    if (!state.athlete) return { ok: false, reason: 'no_athlete' };
    if (state.bulv < PHARMA_CASE_PRICE) return { ok: false, reason: 'no_bulv' };

    const item = PHARMA_ITEMS[Math.floor(Math.random() * PHARMA_ITEMS.length)];
    const failed = Math.random() * 100 < item.riskPercent;

    setState((prev) => {
      if (!prev.athlete) return prev;
      const { athlete, activeBoosts } = applyPharmaOutcome(
        prev.athlete,
        prev.activeBoosts,
        item,
        failed
      );
      return {
        ...prev,
        bulv: prev.bulv - PHARMA_CASE_PRICE,
        athlete,
        activeBoosts,
        pharmaCooldowns: {
          ...prev.pharmaCooldowns,
          [item.id]: Date.now() + item.cooldownMs,
        },
      };
    });

    return { ok: true, item, failed };
  }

  // @ts-ignore
  function openGearCase(): GearCaseResult {
    if (!state.athlete) return { ok: false, reason: 'no_athlete' };

    const available = GEAR_ITEMS.filter((g) => !state.ownedGear[g.id]);
    if (available.length === 0) return { ok: false, reason: 'all_owned' };
    if (state.bulv < GEAR_CASE_PRICE) return { ok: false, reason: 'no_bulv' };

    const item = available[Math.floor(Math.random() * available.length)];

    setState((prev) => ({
      ...prev,
      bulv: prev.bulv - GEAR_CASE_PRICE,
      ownedGear: {
        ...prev.ownedGear,
        [item.id]: true,
      },
    }));

    return { ok: true, item };
  }

  function adminGiveBulv(amount: number) {
    setState((prev) => ({ ...prev, bulv: Math.max(0, prev.bulv + amount) }));
  }

  function adminSetAthleteRarity(rarity: Rarity) {
    setState((prev) => ({ ...prev, athlete: createAthlete(rarity) }));
  }

  function adminMaxStats() {
    setState((prev) => {
      if (!prev.athlete) return prev;
      return {
        ...prev,
        athlete: {
          ...prev.athlete,
          stats: { strength: 999, mass: 999, stamina: 999, genetics: 999 },
        },
      };
    });
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
      GEAR_ITEMS.forEach((g) => { ownedGear[g.id] = true; });
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
    isLoading,
    energyMax,
    critChance,
    effectiveStrength,
    miningRatePerHour,
    rarityMultiplier,
    power,
    mintCapsule,
    rerollCapsule,
    trainMuscle,
    consumeNutrition,
    buyPharma,
    buyGear,
    enterArena,
    openPharmaCase,
    openGearCase,
    adminGiveBulv,
    adminSetAthleteRarity,
    adminMaxStats,
    adminFullEnergy,
    adminUnlockAllGear,
    adminResetCooldowns,
    adminResetSave,
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000', color: '#fff', fontFamily: 'sans-serif', fontSize: '18px', fontWeight: 'bold' }}>
        Загрузка профиля игрока...
      </div>
    );
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

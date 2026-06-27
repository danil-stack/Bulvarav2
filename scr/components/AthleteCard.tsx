import type { Athlete } from '../types';
import RarityBadge from './RarityBadge';
import StatBar from './StatBar';
import { useLanguage } from '../contexts/LanguageContext';
import { useGame } from '../contexts/GameContext';
import { getRarityConfig } from '../utils/rarity';
import { LEVEL_TIER_CLASS, LEVEL_TIER_BG, LEVEL_TIER_BORDER } from '../utils/levelStyle';
import { formatNumber } from '../utils/format';

interface AthleteCardProps {
  athlete: Athlete;
  power: number;
  energyMax: number;
}

export default function AthleteCard({ athlete, power, energyMax }: AthleteCardProps) {
  const { t } = useLanguage();
  const { levelInfo } = useGame();
  const rarityCfg = getRarityConfig(athlete.rarity);
  const energyPct = Math.min(100, (athlete.energy / Math.max(1, energyMax)) * 100);

  const tierClass = LEVEL_TIER_CLASS[levelInfo.current.tier];
  const tierBg = LEVEL_TIER_BG[levelInfo.current.tier];
  const tierBorder = LEVEL_TIER_BORDER[levelInfo.current.tier];
  const isMaxLevel = !levelInfo.next;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-surface-line bg-surface p-5 shadow-card">
      <div
        className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: rarityCfg.color }}
      />
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
            style={{ backgroundColor: `${rarityCfg.color}22`, border: `1px solid ${rarityCfg.color}55` }}
          >
            🏆
          </div>
          <div>
            <RarityBadge rarity={athlete.rarity} />
            <p className="mt-1 text-xs text-white/50">
              {t('home.athletePower')} <span className="font-mono font-bold text-white/80">{power}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Level / prestige title ───────────────────────────────────── */}
      <div className={`relative mt-4 rounded-2xl border px-3 py-2.5 ${tierBg} ${tierBorder}`}>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="rounded-full bg-black/30 px-2 py-0.5 font-mono text-[10px] font-bold text-white/70">
              LV {levelInfo.current.level}
            </span>
            <span className={`font-display text-sm font-bold ${tierClass}`}>{t(levelInfo.current.nameKey)}</span>
          </span>
          {!isMaxLevel && (
            <span className="font-mono text-[10px] text-white/40">
              {formatNumber(levelInfo.strength)} / {formatNumber(levelInfo.next!.strengthRequired)}
            </span>
          )}
        </div>
        {!isMaxLevel ? (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/30">
            <div
              className="h-full rounded-full bg-gradient-to-r from-white/40 to-white/80 transition-all duration-500"
              style={{ width: `${levelInfo.progress * 100}%` }}
            />
          </div>
        ) : (
          <p className="mt-1 text-[10px] text-white/40">{t('level.maxReached')}</p>
        )}
      </div>

      <div className="relative mt-4 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 font-semibold text-stamina">
            <span>⚡</span>
            {t('home.energy')}
          </span>
          <span className="font-mono font-bold text-white/90">
            {Math.floor(athlete.energy)}/{energyMax}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-line">
          <div
            className="h-full rounded-full bg-stamina shadow-neon-stamina transition-all duration-500"
            style={{ width: `${energyPct}%` }}
          />
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        <StatBar stat="strength" value={athlete.stats.strength} scale={Math.max(140, levelInfo.next?.strengthRequired ?? 140)} />
        <StatBar stat="mass" value={athlete.stats.mass} />
        <StatBar stat="stamina" value={athlete.stats.stamina} />
        <StatBar stat="genetics" value={athlete.stats.genetics} />
      </div>
    </div>
  );
}

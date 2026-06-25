import type { Athlete } from '../types';
import RarityBadge from './RarityBadge';
import StatBar from './StatBar';
import { useLanguage } from '../contexts/LanguageContext';
import { getRarityConfig } from '../utils/rarity';

interface AthleteCardProps {
  athlete: Athlete;
  power: number;
  energyMax: number;
}

export default function AthleteCard({ athlete, power, energyMax }: AthleteCardProps) {
  const { t } = useLanguage();
  const rarityCfg = getRarityConfig(athlete.rarity);
  const energyPct = Math.min(100, (athlete.energy / Math.max(1, energyMax)) * 100);

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
              {t('common.level')} {athlete.level} · {t('home.athletePower')}{' '}
              <span className="font-mono font-bold text-white/80">{power}</span>
            </p>
          </div>
        </div>
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
        <StatBar stat="strength" value={athlete.stats.strength} />
        <StatBar stat="mass" value={athlete.stats.mass} />
        <StatBar stat="stamina" value={athlete.stats.stamina} />
        <StatBar stat="genetics" value={athlete.stats.genetics} />
      </div>
    </div>
  );
}

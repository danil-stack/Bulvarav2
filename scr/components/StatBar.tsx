import { useLanguage } from '../contexts/LanguageContext';
import type { StatKey } from '../types';
import { clamp } from '../utils/format';

const STAT_META: Record<StatKey, { icon: string; color: string; bar: string; glow: string }> = {
  strength: { icon: '🔥', color: 'text-strength', bar: 'bg-strength', glow: 'shadow-neon-strength' },
  mass: { icon: '⚙️', color: 'text-mass', bar: 'bg-mass', glow: 'shadow-neon-mass' },
  stamina: { icon: '⚡', color: 'text-stamina', bar: 'bg-stamina', glow: 'shadow-neon-stamina' },
  genetics: { icon: '🧬', color: 'text-genetics', bar: 'bg-genetics', glow: 'shadow-neon-genetics' },
};

interface StatBarProps {
  stat: StatKey;
  value: number;
  scale?: number;
  compact?: boolean;
}

export default function StatBar({ stat, value, scale = 140, compact = false }: StatBarProps) {
  const { t } = useLanguage();
  const meta = STAT_META[stat];
  const pct = clamp((value / scale) * 100, 4, 100);

  return (
    <div className={compact ? 'flex items-center gap-2' : 'space-y-1'}>
      <div className="flex items-center justify-between text-xs">
        <span className={`flex items-center gap-1 font-semibold ${meta.color}`}>
          <span>{meta.icon}</span>
          {!compact && t(`stats.${stat}`)}
        </span>
        <span className="font-mono font-bold text-white/90">{Math.round(value)}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-line">
        <div
          className={`h-full rounded-full ${meta.bar} ${meta.glow} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export { STAT_META };

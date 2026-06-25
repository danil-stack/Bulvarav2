import { useLanguage } from '../contexts/LanguageContext';
import type { Rarity } from '../types';
import { getRarityConfig } from '../utils/rarity';

export default function RarityBadge({ rarity, size = 'md' }: { rarity: Rarity; size?: 'sm' | 'md' | 'lg' }) {
  const { t } = useLanguage();
  const cfg = getRarityConfig(rarity);
  const sizeClasses = size === 'sm' ? 'text-[10px] px-2 py-0.5' : size === 'lg' ? 'text-sm px-4 py-1.5' : 'text-xs px-3 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-display font-bold uppercase tracking-wide ${sizeClasses}`}
      style={{
        color: cfg.color,
        backgroundColor: `${cfg.color}1A`,
        border: `1px solid ${cfg.color}55`,
        boxShadow: rarity === 'legendary' ? `0 0 14px ${cfg.color}55` : undefined,
      }}
    >
      <span>{cfg.icon}</span>
      {t(cfg.nameKey)}
    </span>
  );
}

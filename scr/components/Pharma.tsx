import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useGame } from '../contexts/GameContext';
import { useTelegram } from '../hooks/useTelegram';
import { PHARMA_ITEMS } from '../utils/constants';
import { formatBulv, formatDuration } from '../utils/format';

export default function Pharma() {
  const { t, lang } = useLanguage();
  const { state, buyPharma } = useGame();
  const { hapticNotify } = useTelegram();
  const [flash, setFlash] = useState<string | null>(null);

  function handleBuy(itemId: string, nameKey: string) {
    const result = buyPharma(itemId);
    if (!result.ok) {
      hapticNotify('error');
      return;
    }
    hapticNotify('success');
    setFlash(t('shop.addedToInventory', { name: t(nameKey) }));
    window.setTimeout(() => setFlash(null), 1800);
  }

  return (
    <div className="mt-5">
      <p className="mb-3 text-sm text-white/50">{t('pharma.subtitle')}</p>

      {flash && (
        <div className="mb-3 rounded-xl border border-mass/40 bg-mass/10 px-3 py-2 text-center text-xs font-bold text-mass">
          {flash}
        </div>
      )}

      <div className="space-y-3">
        {PHARMA_ITEMS.map((item) => {
          const canAfford = state.bulv >= item.price;
          const disabled = !state.athlete || !canAfford;

          return (
            <div key={item.id} className="rounded-3xl border border-surface-line bg-surface p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-surface-raised text-2xl">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <p className="font-display text-sm text-white">{t(item.nameKey)}</p>
                  <p className="mt-0.5 text-xs text-white/45">{t(item.descKey)}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px]">
                <span className="text-white/40">
                  {t('pharma.duration')}: {item.durationMs > 0 ? formatDuration(item.durationMs, lang) : t('pharma.instant')}
                </span>
                <span className="font-mono font-bold text-strength">
                  ⚠ {t('pharma.risk')} {item.riskPercent}%
                </span>
              </div>

              <button
                onClick={() => handleBuy(item.id, item.nameKey)}
                disabled={disabled}
                className="mt-3 w-full rounded-xl bg-genetics py-2.5 text-center text-xs font-bold text-white active:scale-95 disabled:opacity-30"
              >
                {t('common.buy')} · {formatBulv(item.price)} 💎
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-[11px] text-white/35">{t('shop.pharmaNote')}</p>
    </div>
  );
}

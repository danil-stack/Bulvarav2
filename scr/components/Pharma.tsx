import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useGame } from '../contexts/GameContext';
import { useTelegram } from '../hooks/useTelegram';
import Modal from './Modal';
import { PHARMA_ITEMS } from '../utils/constants';
import { formatBulv, formatDuration } from '../utils/format';
import type { PharmaItem } from '../types';

export default function Pharma() {
  const { t, lang } = useLanguage();
  const { state, buyPharma } = useGame();
  const { hapticNotify } = useTelegram();
  const [outcome, setOutcome] = useState<{ item: PharmaItem; failed: boolean } | null>(null);

  function handleBuy(item: PharmaItem) {
    const result = buyPharma(item.id);
    if (!result.ok) {
      hapticNotify('error');
      return;
    }
    hapticNotify(result.failed ? 'error' : 'success');
    setOutcome({ item, failed: !!result.failed });
  }

  return (
    <div className="mt-5">
      <p className="mb-3 text-sm text-white/50">{t('pharma.subtitle')}</p>
      <div className="space-y-3">
        {PHARMA_ITEMS.map((item) => {
          const cooldownUntil = state.pharmaCooldowns[item.id] ?? 0;
          const remaining = cooldownUntil - Date.now();
          const onCooldown = remaining > 0;
          const canAfford = state.bulv >= item.price;
          const disabled = !state.athlete || onCooldown || !canAfford;

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

              {onCooldown && (
                <p className="mt-1 text-[10px] font-mono text-white/40">
                  {t('common.cooldown')}: {formatDuration(remaining, lang)}
                </p>
              )}

              <button
                onClick={() => handleBuy(item)}
                disabled={disabled}
                className="mt-3 w-full rounded-xl bg-genetics py-2.5 text-center text-xs font-bold text-white active:scale-95 disabled:opacity-30"
              >
                {t('pharma.buy')} · {formatBulv(item.price)} 💎
              </button>
            </div>
          );
        })}
      </div>

      <Modal open={!!outcome} onClose={() => setOutcome(null)}>
        {outcome && (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-raised text-3xl">
              {outcome.item.icon}
            </div>
            <p className={`mt-4 font-display text-base ${outcome.failed ? 'text-strength' : 'text-mass'}`}>
              {outcome.failed ? t('pharma.fail') : t('pharma.success')}
            </p>
            <p className="mt-1 text-xs text-white/50">{t(outcome.item.nameKey)}</p>
            <button
              onClick={() => setOutcome(null)}
              className="mt-5 w-full rounded-2xl bg-surface-raised py-2.5 text-sm text-white/80 active:scale-95"
            >
              {t('common.close')}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

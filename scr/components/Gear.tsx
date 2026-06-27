import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useGame } from '../contexts/GameContext';
import { useTelegram } from '../hooks/useTelegram';
import { GEAR_ITEMS } from '../utils/constants';
import { formatBulv } from '../utils/format';

const EFFECT_LABEL: Record<string, string> = {
  mining: '⛏ BULV/h',
  energyMax: '⚡ Max',
  crit: '🧬 Crit',
  strength: '🔥 STR',
};

export default function Gear() {
  const { t } = useLanguage();
  const { state, buyGear } = useGame();
  const { hapticNotify } = useTelegram();
  const [flash, setFlash] = useState<string | null>(null);

  function handleBuy(itemId: string, nameKey: string) {
    const result = buyGear(itemId);
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
      <p className="mb-3 text-sm text-white/50">{t('gear.subtitle')}</p>

      {flash && (
        <div className="mb-3 rounded-xl border border-mass/40 bg-mass/10 px-3 py-2 text-center text-xs font-bold text-mass">
          {flash}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {GEAR_ITEMS.map((item) => {
          const equipped = !!state.ownedGear[item.id];
          const canAfford = state.bulv >= item.price;

          return (
            <div key={item.id} className="flex flex-col rounded-3xl border border-surface-line bg-surface p-4">
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-raised text-2xl">
                  {item.icon}
                </div>
                {equipped && (
                  <span className="rounded-full bg-mass/15 px-2 py-0.5 text-[9px] font-bold text-mass">
                    {t('gear.equippedBadge')}
                  </span>
                )}
              </div>
              <p className="mt-2 font-display text-xs text-white">{t(item.nameKey)}</p>
              <p className="mt-1 flex-1 text-[11px] leading-snug text-white/45">{t(item.descKey)}</p>
              <span className="mt-2 inline-block rounded-full bg-bulv/10 px-2 py-0.5 text-[10px] font-mono font-bold text-bulv">
                +{item.effect.value}% {EFFECT_LABEL[item.effect.type]}
              </span>
              <button
                onClick={() => handleBuy(item.id, item.nameKey)}
                disabled={!canAfford}
                className="mt-3 rounded-xl bg-mass py-2 text-center text-xs font-bold text-void active:scale-95 disabled:opacity-40"
              >
                {t('common.buy')} · {formatBulv(item.price)}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-[11px] text-white/35">{t('shop.gearNote')}</p>
    </div>
  );
}

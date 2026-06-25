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

  function handleBuy(itemId: string) {
    const result = buyGear(itemId);
    hapticNotify(result.ok ? 'success' : 'error');
  }

  return (
    <div className="mt-5">
      <p className="mb-3 text-sm text-white/50">{t('gear.subtitle')}</p>
      <div className="grid grid-cols-2 gap-3">
        {GEAR_ITEMS.map((item) => {
          const owned = !!state.ownedGear[item.id];
          const canAfford = state.bulv >= item.price;

          return (
            <div key={item.id} className="flex flex-col rounded-3xl border border-surface-line bg-surface p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-raised text-2xl">
                {item.icon}
              </div>
              <p className="mt-2 font-display text-xs text-white">{t(item.nameKey)}</p>
              <p className="mt-1 flex-1 text-[11px] leading-snug text-white/45">{t(item.descKey)}</p>
              <span className="mt-2 inline-block rounded-full bg-bulv/10 px-2 py-0.5 text-[10px] font-mono font-bold text-bulv">
                +{item.effect.value}% {EFFECT_LABEL[item.effect.type]}
              </span>
              <button
                onClick={() => handleBuy(item.id)}
                disabled={owned || !canAfford}
                className={`mt-3 rounded-xl py-2 text-center text-xs font-bold active:scale-95 disabled:opacity-40 ${
                  owned ? 'bg-surface-raised text-white/40' : 'bg-mass text-void'
                }`}
              >
                {owned ? t('common.owned') : `${t('common.buy')} · ${formatBulv(item.price)}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

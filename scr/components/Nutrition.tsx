import { useLanguage } from '../contexts/LanguageContext';
import { useGame } from '../contexts/GameContext';
import { useTelegram } from '../hooks/useTelegram';
import { NUTRITION_ITEMS } from '../utils/constants';
import { formatBulv, formatDuration } from '../utils/format';

export default function Nutrition() {
  const { t, lang } = useLanguage();
  const { state, consumeNutrition } = useGame();
  const { hapticNotify } = useTelegram();

  function handleConsume(itemId: string) {
    const result = consumeNutrition(itemId);
    if (result.ok) hapticNotify('success');
    else hapticNotify('error');
  }

  return (
    <div className="mt-5">
      <p className="mb-3 text-sm text-white/50">{t('nutrition.subtitle')}</p>
      <div className="space-y-3">
        {NUTRITION_ITEMS.map((item) => {
          const cooldownUntil = state.nutritionCooldowns[item.id] ?? 0;
          const remaining = cooldownUntil - Date.now();
          const onCooldown = remaining > 0;
          const canAfford = state.bulv >= item.price;
          const disabled = !state.athlete || onCooldown || !canAfford;

          return (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-3xl border border-surface-line bg-surface p-4"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-surface-raised text-2xl">
                {item.icon}
              </div>
              <div className="flex-1">
                <p className="font-display text-sm text-white">{t(item.nameKey)}</p>
                <p className="mt-0.5 text-xs text-white/45">{t(item.descKey)}</p>
                {onCooldown && (
                  <p className="mt-1 text-[10px] font-mono text-strength">
                    {t('common.cooldown')}: {formatDuration(remaining, lang)}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleConsume(item.id)}
                disabled={disabled}
                className="flex flex-col items-center gap-0.5 rounded-2xl bg-stamina px-3.5 py-2.5 text-void active:scale-95 disabled:opacity-30"
              >
                <span className="text-[11px] font-bold">{t('nutrition.consume')}</span>
                <span className="font-mono text-[10px]">
                  {item.price === 0 ? t('nutrition.free') : `${formatBulv(item.price)} 💎`}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

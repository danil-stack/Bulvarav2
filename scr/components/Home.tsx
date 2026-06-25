import { useLanguage } from '../contexts/LanguageContext';
import { useGame } from '../contexts/GameContext';
import { useTelegram } from '../hooks/useTelegram';
import AthleteCard from './AthleteCard';
import { formatBulv } from '../utils/format';
import { PHARMA_ITEMS, NUTRITION_ITEMS } from '../utils/constants';
import type { Screen } from '../App';

interface HomeProps {
  onNavigate: (screen: Screen) => void;
}

function findBoostLabel(sourceId: string): { icon: string; nameKey: string } {
  const pharma = PHARMA_ITEMS.find((p) => p.id === sourceId);
  if (pharma) return { icon: pharma.icon, nameKey: pharma.nameKey };
  const nutrition = NUTRITION_ITEMS.find((n) => n.id === sourceId);
  if (nutrition) return { icon: nutrition.icon, nameKey: nutrition.nameKey };
  return { icon: '✨', nameKey: 'common.comingSoon' };
}

export default function Home({ onNavigate }: HomeProps) {
  const { t, lang } = useLanguage();
  const { state, energyMax, power, miningRatePerHour } = useGame();
  const { user } = useTelegram();
  const name = user?.first_name ?? (lang === 'ru' ? 'Чемпион' : 'Champion');

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-4">
      <p className="font-display text-lg text-white">{t('home.greeting', { name })}</p>

      {!state.athlete ? (
        <div className="mt-6 rounded-3xl border border-bulv/30 bg-gradient-to-br from-surface to-surface-raised p-6 text-center shadow-card">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-bulv/10 text-4xl">
            🧬
          </div>
          <h2 className="mt-4 font-display text-base text-white">{t('home.noAthleteTitle')}</h2>
          <p className="mt-2 text-sm text-white/55">{t('home.noAthleteDesc')}</p>
          <button
            onClick={() => onNavigate('incubator')}
            className="mt-5 w-full rounded-2xl bg-bulv py-3.5 font-display text-sm text-void shadow-neon-bulv active:scale-95"
          >
            {t('home.openIncubator')}
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4">
            <AthleteCard athlete={state.athlete} power={power} energyMax={energyMax} />
          </div>

          {/* Mining ticker */}
          <div className="mt-4 rounded-3xl border border-surface-line bg-surface p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/50">{t('home.miningRate')}</p>
                <p className="font-mono text-xl font-bold text-bulv">
                  +{formatBulv(miningRatePerHour)} <span className="text-xs text-white/40">{t('common.perHour')}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/50">{t('home.totalMined')}</p>
                <p className="font-mono text-sm font-bold text-white/80">{formatBulv(state.totalMined)}</p>
              </div>
            </div>
          </div>

          {/* Active boosts */}
          <div className="mt-4 rounded-3xl border border-surface-line bg-surface p-5">
            <p className="text-xs font-semibold text-white/60">{t('home.activeBoosts')}</p>
            {state.activeBoosts.length === 0 ? (
              <p className="mt-2 text-xs text-white/35">{t('home.noBoosts')}</p>
            ) : (
              <div className="mt-3 space-y-2">
                {state.activeBoosts.map((boost, idx) => {
                  const label = findBoostLabel(boost.sourceId);
                  const remaining = Math.max(0, boost.expiresAt - Date.now());
                  return (
                    <div
                      key={`${boost.sourceId}-${idx}`}
                      className="flex items-center justify-between rounded-xl bg-surface-raised px-3 py-2 text-xs"
                    >
                      <span className="flex items-center gap-2 text-white/75">
                        <span>{label.icon}</span>
                        {t(label.nameKey)}
                      </span>
                      <span className="font-mono text-genetics">
                        +{boost.value}% · {Math.ceil(remaining / 60000)}m
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Always-visible entry points — Cases never disappears after minting */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              onClick={() => onNavigate('incubator')}
              className="rounded-2xl border border-bulv/40 bg-bulv/10 py-3 text-center font-display text-sm text-bulv active:scale-95"
            >
              📦 {t('nav.cases')}
            </button>
            <button
              onClick={() => onNavigate('training')}
              className="rounded-2xl border border-strength/40 bg-strength/10 py-3 text-center font-display text-sm text-strength active:scale-95"
            >
              {t('home.quickTrain')} →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

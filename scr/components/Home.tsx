import { useRef, useMemo, type MouseEvent } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useGame } from '../contexts/GameContext';
import { useTelegram } from '../hooks/useTelegram';
import { useFloatingText } from '../hooks/useFloatingText';
import FloatingTextLayer from './FloatingTextLayer';
import AthleteCard from './AthleteCard';
import { formatBulv } from '../utils/format';
import { PHARMA_ITEMS, NUTRITION_ITEMS } from '../utils/constants';
import { LEVEL_TIER_CLASS } from '../utils/levelStyle';
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
  const { state, energyMax, power, miningRatePerHour, levelInfo, tapClicker } = useGame();
  const { user, haptic, hapticNotify } = useTelegram();
  const { items, push } = useFloatingText();
  const containerRef = useRef<HTMLDivElement>(null);

  const name = user?.first_name ?? (lang === 'ru' ? 'Чемпион' : 'Champion');

  // 🧮 Динамический расчет ценности одного тапа на основе уровня и редкости атлета
  const clickValue = useMemo(() => {
    if (!state.athlete) return 0.5;
    const currentLevel = levelInfo.current.level;
    const rarityMultipliers: Record<string, number> = {
      common: 1.0,
      rare: 1.2,
      epic: 1.4,
      legendary: 1.8,
    };
    const multiplier = rarityMultipliers[state.athlete.rarity] || 1.0;
    const baseGain = 0.5 + (currentLevel - 1) * 0.3;
    return Math.round(baseGain * multiplier * 100) / 100;
  }, [state.athlete, levelInfo]);

  // Функция обработки тапа по блину
  function handleBumperTap(e: MouseEvent<HTMLButtonElement>) {
    const result = tapClicker();
    
    const container = containerRef.current?.getBoundingClientRect();
    const btn = e.currentTarget.getBoundingClientRect();
    const x = container ? ((btn.left + btn.width / 2 - container.left) / container.width) * 100 : 50;
    const y = container ? ((btn.top - container.top) / container.height) * 100 : 50;

    if (!result.ok) {
      if (result.reason === 'no_energy') {
        push(lang === 'ru' ? 'Нет энергии! ⚡' : 'No energy!', '#FF5252', x, y);
        hapticNotify('error');
      }
      return;
    }

    haptic('light');
    push(`+${clickValue} BULV 💎`, '#36C5F0', x + randomInRange(-5, 5), y - 10);
  }

  function randomInRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  return (
    <div 
      ref={containerRef}
      className="mx-auto max-w-md px-4 pb-28 pt-4 max-h-[calc(100vh-80px)] overflow-y-auto scrollbar-thin select-none"
    >
      <div className="flex items-center justify-between">
        <p className="font-display text-lg text-white">{t('home.greeting', { name })}</p>
        {state.athlete && (
          <span className={`font-display text-xs font-bold ${LEVEL_TIER_CLASS[levelInfo.current.tier]}`}>
            LV{levelInfo.current.level} · {t(levelInfo.current.nameKey)}
          </span>
        )}
      </div>

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

          {/* 🏋️ ТЯЖЁЛЫЙ КЛИКЕР-БЛИН С ЭФФЕКТОМ ПРОДАВЛИВАНИЯ */}
          <div className="mt-4 rounded-3xl border border-surface-line bg-surface p-5 flex flex-col items-center text-center">
            <p className="font-display text-sm text-white">
              {lang === 'ru' ? 'СИЛОВОЙ КЛИКЕР' : 'POWER CLICKER'}
            </p>
            <p className="text-[11px] text-white/45 mt-1 leading-snug">
              {lang === 'ru' 
                ? 'Тапай по тяжелому блину штанги, чтобы пережигать ⚡ энергию в $BULV токены!' 
                : 'Tap the heavy barbell plate to burn ⚡ energy directly into $BULV!'}
            </p>

            <div className="relative mt-5 flex justify-center items-center w-full h-44">
              <button
                onClick={handleBumperTap}
                disabled={state.athlete.energy < 1}
                className="w-40 h-44 rounded-full bg-gradient-to-br from-[#1E2530] to-[#0D1017] border-[10px] border-surface-line flex flex-col items-center justify-center transition-all duration-75 active:scale-95 active:brightness-90 select-none shadow-[0_0_20px_rgba(54,197,240,0.15)] active:shadow-inner border-bulv/20 active:border-bulv/40 focus:outline-none touch-none cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-surface-line to-void flex items-center justify-center border-2 border-white/20 shadow-inner">
                  <div className="w-3 h-3 rounded-full bg-void shadow-[inset_0_0_4px_#000]" />
                </div>
                
                <p className="font-display text-[10px] tracking-widest text-bulv/70 mt-1 uppercase">
                  BULVARA
                </p>
                <p className="font-mono text-xs font-black text-white/80 mt-0.5">
                  20 KG
                </p>
              </button>
            </div>
            
            <p className="text-[10px] font-mono text-white/30 mt-2">
              {lang === 'ru' 
                ? `1 Клик = ${clickValue} 💎 · -1 ⚡ Энергия` 
                : `1 Click = ${clickValue} 💎 · -1 ⚡ Energy`}
            </p>
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

          {/* Always-visible entry points */}
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

      <FloatingTextLayer items={items} />
    </div>
  );
}

import { useRef, useState, type MouseEvent } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useGame } from '../contexts/GameContext';
import { useTelegram } from '../hooks/useTelegram';
import { useFloatingText } from '../hooks/useFloatingText';
import FloatingTextLayer from './FloatingTextLayer';
import Nutrition from './Nutrition';
import Modal from './Modal';
import { MUSCLE_GROUPS } from '../utils/constants';
import { STAT_META } from './StatBar';
import { LEVEL_TIER_CLASS, LEVEL_TIER_BORDER } from '../utils/levelStyle';
import type { MuscleGroup, StatKey, LevelConfig } from '../types';

const STAT_COLOR_HEX: Record<StatKey, string> = {
  strength: '#FF5252',
  mass: '#7CFF5C',
  stamina: '#FFC53D',
  genetics: '#C26BFF',
};

export default function Training() {
  const { t } = useLanguage();
  const { state, critChance, trainMuscle } = useGame();
  const { haptic, hapticNotify } = useTelegram();
  const [tab, setTab] = useState<'camp' | 'nutrition'>('camp');
  const containerRef = useRef<HTMLDivElement>(null);
  const { items, push } = useFloatingText();
  const [levelUp, setLevelUp] = useState<LevelConfig | null>(null);

  function handleTap(group: MuscleGroup, e: MouseEvent<HTMLButtonElement>) {
    const result = trainMuscle(group);
    const container = containerRef.current?.getBoundingClientRect();
    const btn = e.currentTarget.getBoundingClientRect();
    const x = container ? ((btn.left + btn.width / 2 - container.left) / container.width) * 100 : 50;
    const y = container ? ((btn.top - container.top) / container.height) * 100 : 50;

    if (!result.ok) {
      if (result.reason === 'no_energy') {
        push(t('training.noEnergy'), '#FF5252', x, y);
        hapticNotify('error');
      }
      return;
    }

    haptic(result.crit ? 'heavy' : 'light');
    if (result.crit) hapticNotify('success');

    const gains = result.gains ?? {};
    (Object.keys(gains) as StatKey[]).forEach((key, i) => {
      push(`+${gains[key]} ${t(`stats.${key}`)}`, STAT_COLOR_HEX[key], x + i * 6, y - i * 8);
    });
    if (result.crit) {
      push(t('training.crit'), '#FFD23E', x, y - 18);
    }
    if (result.bulvBonus) {
      push(`+${result.bulvBonus} BULV`, '#36C5F0', x, y - 28);
    }

    if (result.leveledUp && result.newLevelConfig) {
      window.setTimeout(() => {
        hapticNotify('success');
        setLevelUp(result.newLevelConfig!);
      }, 250);
    }
  }

  if (!state.athlete) {
    return (
      <div className="mx-auto max-w-md px-4 pb-28 pt-10 text-center text-sm text-white/50">
        {t('home.noAthleteDesc')}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-4">
      <h1 className="font-display text-xl text-white">{t('training.title')}</h1>
      <p className="mt-1 text-sm text-white/50">{t('training.subtitle')}</p>

      <div className="mt-4 flex gap-2 rounded-2xl bg-surface p-1">
        {(['camp', 'nutrition'] as const).map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-colors ${
              tab === id ? 'bg-strength text-white shadow-neon-strength' : 'text-white/45'
            }`}
          >
            {t(`training.tab${id === 'camp' ? 'Camp' : 'Nutrition'}`)}
          </button>
        ))}
      </div>

      {tab === 'camp' ? (
        <div ref={containerRef} className="relative mt-5">
          <div className="mb-3 flex items-center justify-between rounded-2xl border border-genetics/30 bg-genetics/10 px-4 py-2.5 text-xs">
            <span className="text-genetics font-semibold">{t('training.critChance')}</span>
            <span className="font-mono font-bold text-genetics">{Math.round(critChance * 100)}%</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {MUSCLE_GROUPS.map((group) => {
              const disabled = state.athlete!.energy < group.energyCost;
              const gainEntries = Object.entries(group.gains) as [StatKey, number][];
              return (
                <button
                  key={group.id}
                  onClick={(e) => handleTap(group.id, e)}
                  disabled={disabled}
                  className="relative flex flex-col items-center gap-2 rounded-3xl border border-surface-line bg-surface p-5 text-center transition-transform active:scale-95 disabled:opacity-40"
                >
                  <span className="text-3xl">{group.icon}</span>
                  <span className="font-display text-sm text-white">{t(group.nameKey)}</span>
                  <div className="flex flex-wrap items-center justify-center gap-1">
                    {gainEntries.map(([key, val]) => (
                      <span key={key} className="text-[10px]" style={{ color: STAT_COLOR_HEX[key] }}>
                        {STAT_META[key].icon}+{val}
                      </span>
                    ))}
                  </div>
                  <span className="mt-1 rounded-full bg-surface-raised px-2.5 py-0.5 text-[10px] font-mono text-stamina">
                    -{group.energyCost} ⚡
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-center text-xs text-white/35">{t('training.tapToTrain')}</p>
          <FloatingTextLayer items={items} />
        </div>
      ) : (
        <Nutrition />
      )}

      {/* ── Level-up celebration ─────────────────────────────────────── */}
      <Modal open={!!levelUp} onClose={() => setLevelUp(null)}>
        {levelUp && (
          <div className="text-center">
            <p className="text-4xl">🎉</p>
            <p className="mt-2 text-xs text-white/50">{t('level.upTitle')}</p>
            <div className={`mx-auto mt-3 inline-flex items-center gap-2 rounded-2xl border px-4 py-2 ${LEVEL_TIER_BORDER[levelUp.tier]}`}>
              <span className="rounded-full bg-black/30 px-2 py-0.5 font-mono text-[10px] font-bold text-white/70">
                LV {levelUp.level}
              </span>
              <span className={`font-display text-lg font-bold ${LEVEL_TIER_CLASS[levelUp.tier]}`}>
                {t(levelUp.nameKey)}
              </span>
            </div>
            <p className="mt-3 text-xs text-white/40">{t('level.upDesc')}</p>
            <button
              onClick={() => setLevelUp(null)}
              className="mt-5 w-full rounded-2xl bg-bulv py-3 text-center font-display text-sm text-void active:scale-95"
            >
              {t('common.close')}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

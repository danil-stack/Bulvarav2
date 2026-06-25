import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useGame } from '../contexts/GameContext';
import type { Athlete } from '../types';
import RarityBadge from './RarityBadge';
import StatBar from './StatBar';
import Modal from './Modal';
import { CAPSULE_REROLL_COST } from '../utils/constants';
import { formatBulv } from '../utils/format';
import { useTelegram } from '../hooks/useTelegram';

interface IncubatorProps {
  onBack: () => void;
}

export default function Incubator({ onBack }: IncubatorProps) {
  const { t } = useLanguage();
  const { state, mintCapsule, rerollCapsule } = useGame();
  const { hapticNotify } = useTelegram();
  const [opening, setOpening] = useState(false);
  const [revealed, setRevealed] = useState<Athlete | null>(null);
  const [confirmReroll, setConfirmReroll] = useState(false);

  function handleOpen() {
    if (opening) return;
    setOpening(true);
    window.setTimeout(() => {
      const athlete = mintCapsule();
      setOpening(false);
      if (athlete) {
        hapticNotify('success');
        setRevealed(athlete);
      }
    }, 1400);
  }

  function handleReroll() {
    const result = rerollCapsule();
    setConfirmReroll(false);
    if (result.ok && result.athlete) {
      hapticNotify('success');
      setRevealed(result.athlete);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-4">
      <button onClick={onBack} className="mb-4 flex items-center gap-1.5 text-sm text-white/60 active:scale-95">
        <ArrowLeft size={16} /> {t('common.close')}
      </button>

      <h1 className="font-display text-xl text-white">{t('incubator.title')}</h1>
      <p className="mt-1 text-sm text-white/50">{t('incubator.subtitle')}</p>

      {!state.athlete && (
        <div className="mt-8 flex flex-col items-center">
          <div
            className={`flex h-44 w-44 items-center justify-center rounded-full border-2 border-bulv/40 bg-gradient-to-br from-surface-raised to-surface text-6xl shadow-neon-bulv ${
              opening ? 'animate-pulse-glow' : 'animate-spin-slow'
            }`}
          >
            🧬
          </div>
          <p className="mt-5 font-display text-sm text-white/80">{t('incubator.capsule')}</p>
          <button
            onClick={handleOpen}
            disabled={opening}
            className="mt-6 w-full rounded-2xl bg-bulv py-3.5 text-center font-display text-sm text-void shadow-neon-bulv active:scale-95 disabled:opacity-60"
          >
            {opening ? t('incubator.opening') : t('incubator.open')}
          </button>
        </div>
      )}

      {state.athlete && (
        <div className="mt-6 rounded-3xl border border-surface-line bg-surface p-5">
          <p className="text-sm text-white/70">{t('incubator.alreadyHave')}</p>
          <div className="mt-3">
            <RarityBadge rarity={state.athlete.rarity} />
          </div>

          <div className="mt-6 border-t border-surface-line pt-5">
            <h2 className="font-display text-sm text-white">{t('incubator.rerollTitle')}</h2>
            <p className="mt-1 text-xs text-white/50">{t('incubator.rerollDesc')}</p>
            <button
              onClick={() => setConfirmReroll(true)}
              disabled={state.bulv < CAPSULE_REROLL_COST}
              className="mt-4 w-full rounded-2xl border border-genetics/40 bg-genetics/10 py-3 text-center font-display text-xs text-genetics active:scale-95 disabled:opacity-40"
            >
              {t('incubator.rerollButton', { cost: formatBulv(CAPSULE_REROLL_COST) })}
            </button>
          </div>
        </div>
      )}

      {/* Reroll confirmation */}
      <Modal open={confirmReroll} onClose={() => setConfirmReroll(false)}>
        <h3 className="font-display text-base text-white">{t('incubator.rerollConfirmTitle')}</h3>
        <p className="mt-2 text-sm text-white/60">{t('incubator.rerollConfirmDesc')}</p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={() => setConfirmReroll(false)}
            className="flex-1 rounded-xl border border-surface-line py-2.5 text-sm text-white/70 active:scale-95"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleReroll}
            className="flex-1 rounded-xl bg-strength py-2.5 text-sm font-bold text-white active:scale-95"
          >
            {t('incubator.rerollConfirmButton')}
          </button>
        </div>
      </Modal>

      {/* Result reveal */}
      <Modal open={!!revealed} dismissible={false}>
        {revealed && (
          <div className="text-center">
            <p className="font-display text-lg text-white">{t('incubator.resultTitle')}</p>
            <p className="mt-1 text-xs text-white/50">{t('incubator.resultCongrats')}</p>
            <div className="mx-auto mt-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-raised text-4xl">
              🏆
            </div>
            <div className="mt-3 flex justify-center">
              <RarityBadge rarity={revealed.rarity} size="lg" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-left">
              <StatBar stat="strength" value={revealed.stats.strength} />
              <StatBar stat="mass" value={revealed.stats.mass} />
              <StatBar stat="stamina" value={revealed.stats.stamina} />
              <StatBar stat="genetics" value={revealed.stats.genetics} />
            </div>
            <button
              onClick={() => {
                setRevealed(null);
                onBack();
              }}
              className="mt-6 w-full rounded-2xl bg-bulv py-3 text-center font-display text-sm text-void active:scale-95"
            >
              {t('incubator.continue')}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

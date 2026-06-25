import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useGame } from '../contexts/GameContext';
import { useTelegram } from '../hooks/useTelegram';
import type { Athlete, GearItem, PharmaItem } from '../types';
import RarityBadge from './RarityBadge';
import StatBar from './StatBar';
import Modal from './Modal';
import CaseReel, { type ReelItem } from './CaseReel';
import {
  RARITIES,
  PHARMA_ITEMS,
  GEAR_ITEMS,
  ATHLETE_CASE_PRICE,
  PHARMA_CASE_PRICE,
  GEAR_CASE_PRICE,
} from '../utils/constants';
import { formatBulv } from '../utils/format';

interface IncubatorProps {
  onBack: () => void;
}

type CaseTab = 'athlete' | 'pharma' | 'gear';

const PHARMA_REEL_COLOR = '#C26BFF';
const GEAR_REEL_COLOR = '#7CFF5C';

export default function Incubator({ onBack }: IncubatorProps) {
  const { t } = useLanguage();
  const { state, mintCapsule, rerollCapsule, openPharmaCase, openGearCase } = useGame();
  const { haptic, hapticNotify } = useTelegram();

  const [tab, setTab] = useState<CaseTab>('athlete');
  const [spinning, setSpinning] = useState(false);

  // Athlete case
  const [athleteTrigger, setAthleteTrigger] = useState(0);
  const [athleteReelResult, setAthleteReelResult] = useState<ReelItem | null>(null);
  const [pendingAthlete, setPendingAthlete] = useState<Athlete | null>(null);
  const [revealedAthlete, setRevealedAthlete] = useState<Athlete | null>(null);

  // Pharma case
  const [pharmaTrigger, setPharmaTrigger] = useState(0);
  const [pharmaReelResult, setPharmaReelResult] = useState<ReelItem | null>(null);
  const [pendingPharma, setPendingPharma] = useState<{ item: PharmaItem; failed: boolean } | null>(null);
  const [revealedPharma, setRevealedPharma] = useState<{ item: PharmaItem; failed: boolean } | null>(null);

  // Gear case
  const [gearTrigger, setGearTrigger] = useState(0);
  const [gearReelResult, setGearReelResult] = useState<ReelItem | null>(null);
  const [pendingGear, setPendingGear] = useState<GearItem | null>(null);
  const [revealedGear, setRevealedGear] = useState<GearItem | null>(null);

  const rarityPool = useMemo<ReelItem[]>(
    () => RARITIES.map((r) => ({ key: r.id, icon: r.icon, label: t(r.nameKey), color: r.color })),
    [t]
  );
  const pharmaPool = useMemo<ReelItem[]>(
    () => PHARMA_ITEMS.map((p) => ({ key: p.id, icon: p.icon, label: t(p.nameKey), color: PHARMA_REEL_COLOR })),
    [t]
  );
  const gearPool = useMemo<ReelItem[]>(
    () => GEAR_ITEMS.map((g) => ({ key: g.id, icon: g.icon, label: t(g.nameKey), color: GEAR_REEL_COLOR })),
    [t]
  );

  const allGearOwned = GEAR_ITEMS.every((g) => state.ownedGear[g.id]);

  function handleOpenAthleteCase() {
    if (spinning) return;
    if (!state.athlete) {
      const athlete = mintCapsule();
      if (!athlete) return;
      const matched = rarityPool.find((r) => r.key === athlete.rarity) ?? rarityPool[0];
      setPendingAthlete(athlete);
      setAthleteReelResult(matched);
      setSpinning(true);
      setAthleteTrigger((n) => n + 1);
      haptic('light');
      return;
    }
    const result = rerollCapsule();
    if (!result.ok || !result.athlete) {
      hapticNotify('error');
      return;
    }
    const matched = rarityPool.find((r) => r.key === result.athlete!.rarity) ?? rarityPool[0];
    setPendingAthlete(result.athlete);
    setAthleteReelResult(matched);
    setSpinning(true);
    setAthleteTrigger((n) => n + 1);
    haptic('light');
  }

  function handleOpenPharmaCase() {
    if (spinning) return;
    const result = openPharmaCase();
    if (!result.ok || !result.item) {
      hapticNotify('error');
      return;
    }
    const matched = pharmaPool.find((p) => p.key === result.item!.id) ?? pharmaPool[0];
    setPendingPharma({ item: result.item, failed: !!result.failed });
    setPharmaReelResult(matched);
    setSpinning(true);
    setPharmaTrigger((n) => n + 1);
    haptic('light');
  }

  function handleOpenGearCase() {
    if (spinning) return;
    const result = openGearCase();
    if (!result.ok || !result.item) {
      hapticNotify('error');
      return;
    }
    const matched = gearPool.find((g) => g.key === result.item!.id) ?? gearPool[0];
    setPendingGear(result.item);
    setGearReelResult(matched);
    setSpinning(true);
    setGearTrigger((n) => n + 1);
    haptic('light');
  }

  const athleteIsFree = !state.athlete;
  const athleteDisabled = spinning || (!athleteIsFree && state.bulv < ATHLETE_CASE_PRICE);
  const pharmaDisabled = spinning || !state.athlete || state.bulv < PHARMA_CASE_PRICE;
  const gearDisabled = spinning || !state.athlete || allGearOwned || state.bulv < GEAR_CASE_PRICE;

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-4">
      <button onClick={onBack} className="mb-4 flex items-center gap-1.5 text-sm text-white/60 active:scale-95">
        <ArrowLeft size={16} /> {t('common.close')}
      </button>

      <h1 className="font-display text-xl text-white">{t('cases.title')}</h1>
      <p className="mt-1 text-sm text-white/50">{t('cases.subtitle')}</p>

      <div className="mt-4 flex gap-2 rounded-2xl bg-surface p-1">
        {(['athlete', 'pharma', 'gear'] as const).map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-colors ${
              tab === id ? 'bg-bulv text-void shadow-neon-bulv' : 'text-white/45'
            }`}
          >
            {id === 'athlete' ? '🧬' : id === 'pharma' ? '🧪' : '📦'} {t(`cases.tab${id === 'athlete' ? 'Athlete' : id === 'pharma' ? 'Pharma' : 'Gear'}`)}
          </button>
        ))}
      </div>

      {/* ── Athlete case ──────────────────────────────────────────────── */}
      {tab === 'athlete' && (
        <div className="mt-5">
          <CaseReel pool={rarityPool} result={athleteReelResult} trigger={athleteTrigger} onSettled={() => {
            setSpinning(false);
            setRevealedAthlete(pendingAthlete);
            setPendingAthlete(null);
            hapticNotify('success');
          }} />

          <div className="mt-3 grid grid-cols-2 gap-2">
            {RARITIES.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl px-3 py-2 text-[11px]"
                style={{ backgroundColor: `${r.color}14`, border: `1px solid ${r.color}33` }}
              >
                <span className="flex items-center gap-1 font-semibold" style={{ color: r.color }}>
                  {r.icon} {t(r.nameKey)}
                </span>
                <span className="font-mono text-white/60">
                  {r.weight}% · ×{r.multiplier}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-[11px] text-white/35">{t('cases.rarityNote')}</p>

          <button
            onClick={handleOpenAthleteCase}
            disabled={athleteDisabled}
            className="mt-4 w-full rounded-2xl bg-bulv py-3.5 text-center font-display text-sm text-void shadow-neon-bulv active:scale-95 disabled:opacity-40"
          >
            {athleteIsFree ? t('cases.openFree') : `${t('cases.open')} · ${formatBulv(ATHLETE_CASE_PRICE)} 💎`}
          </button>
          {state.athlete && (
            <p className="mt-2 text-center text-[11px] text-white/35">{t('cases.rerollWarning')}</p>
          )}
        </div>
      )}

      {/* ── Pharma case ───────────────────────────────────────────────── */}
      {tab === 'pharma' && (
        <div className="mt-5">
          {!state.athlete ? (
            <p className="rounded-2xl border border-surface-line bg-surface p-4 text-center text-sm text-white/45">
              {t('cases.needAthlete')}
            </p>
          ) : (
            <>
              <CaseReel pool={pharmaPool} result={pharmaReelResult} trigger={pharmaTrigger} onSettled={() => {
                setSpinning(false);
                setRevealedPharma(pendingPharma);
                setPendingPharma(null);
                hapticNotify(pendingPharma?.failed ? 'error' : 'success');
              }} />
              <p className="mt-3 text-center text-[11px] text-white/35">
                {t('cases.equalOdds', { count: PHARMA_ITEMS.length })}
              </p>
              <button
                onClick={handleOpenPharmaCase}
                disabled={pharmaDisabled}
                className="mt-4 w-full rounded-2xl bg-genetics py-3.5 text-center font-display text-sm text-white active:scale-95 disabled:opacity-40"
              >
                {t('cases.open')} · {formatBulv(PHARMA_CASE_PRICE)} 💎
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Gear case ─────────────────────────────────────────────────── */}
      {tab === 'gear' && (
        <div className="mt-5">
          {!state.athlete ? (
            <p className="rounded-2xl border border-surface-line bg-surface p-4 text-center text-sm text-white/45">
              {t('cases.needAthlete')}
            </p>
          ) : allGearOwned ? (
            <p className="rounded-2xl border border-mass/30 bg-mass/10 p-4 text-center text-sm text-mass">
              {t('cases.allOwned')}
            </p>
          ) : (
            <>
              <CaseReel pool={gearPool} result={gearReelResult} trigger={gearTrigger} onSettled={() => {
                setSpinning(false);
                setRevealedGear(pendingGear);
                setPendingGear(null);
                hapticNotify('success');
              }} />
              <p className="mt-3 text-center text-[11px] text-white/35">
                {t('cases.gearProgress', {
                  owned: GEAR_ITEMS.filter((g) => state.ownedGear[g.id]).length,
                  total: GEAR_ITEMS.length,
                })}
              </p>
              <button
                onClick={handleOpenGearCase}
                disabled={gearDisabled}
                className="mt-4 w-full rounded-2xl bg-mass py-3.5 text-center font-display text-sm text-void active:scale-95 disabled:opacity-40"
              >
                {t('cases.open')} · {formatBulv(GEAR_CASE_PRICE)} 💎
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Reveal modals ─────────────────────────────────────────────── */}
      <Modal open={!!revealedAthlete} dismissible={false}>
        {revealedAthlete && (
          <div className="text-center">
            <p className="font-display text-lg text-white">{t('cases.athleteResultTitle')}</p>
            <div className="mx-auto mt-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-raised text-4xl">
              🏆
            </div>
            <div className="mt-3 flex justify-center">
              <RarityBadge rarity={revealedAthlete.rarity} size="lg" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-left">
              <StatBar stat="strength" value={revealedAthlete.stats.strength} />
              <StatBar stat="mass" value={revealedAthlete.stats.mass} />
              <StatBar stat="stamina" value={revealedAthlete.stats.stamina} />
              <StatBar stat="genetics" value={revealedAthlete.stats.genetics} />
            </div>
            <button
              onClick={() => {
                setRevealedAthlete(null);
                onBack();
              }}
              className="mt-6 w-full rounded-2xl bg-bulv py-3 text-center font-display text-sm text-void active:scale-95"
            >
              {t('incubator.continue')}
            </button>
          </div>
        )}
      </Modal>

      <Modal open={!!revealedPharma} onClose={() => setRevealedPharma(null)}>
        {revealedPharma && (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-raised text-3xl">
              {revealedPharma.item.icon}
            </div>
            <p className="mt-3 text-xs text-white/50">{t('cases.pharmaResultTitle')}</p>
            <p className="mt-1 font-display text-base text-white">{t(revealedPharma.item.nameKey)}</p>
            <p className={`mt-3 font-display text-sm ${revealedPharma.failed ? 'text-strength' : 'text-mass'}`}>
              {revealedPharma.failed ? t('pharma.fail') : t('pharma.success')}
            </p>
            <button
              onClick={() => setRevealedPharma(null)}
              className="mt-5 w-full rounded-2xl bg-surface-raised py-2.5 text-sm text-white/80 active:scale-95"
            >
              {t('common.close')}
            </button>
          </div>
        )}
      </Modal>

      <Modal open={!!revealedGear} onClose={() => setRevealedGear(null)}>
        {revealedGear && (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-raised text-3xl">
              {revealedGear.icon}
            </div>
            <p className="mt-3 text-xs text-white/50">{t('cases.gearResultTitle')}</p>
            <p className="mt-1 font-display text-base text-white">{t(revealedGear.nameKey)}</p>
            <p className="mt-1 text-xs text-white/45">{t(revealedGear.descKey)}</p>
            <button
              onClick={() => setRevealedGear(null)}
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

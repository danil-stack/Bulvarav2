import { useState } from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useGame } from '../contexts/GameContext';
import { useTelegram } from '../hooks/useTelegram';
import Modal from './Modal';
import { RARITIES } from '../utils/constants';
import { formatBulv } from '../utils/format';
import type { Rarity } from '../types';

interface AdminPanelProps {
  onBack: () => void;
}

const QUICK_AMOUNTS = [1000, 10000, 100000, 1000000];

export default function AdminPanel({ onBack }: AdminPanelProps) {
  const { t } = useLanguage();
  const { isAdmin, user } = useTelegram();
  const {
    state,
    adminGiveBulv,
    adminSetAthleteRarity,
    adminMaxStats,
    adminFullEnergy,
    adminUnlockAllGear,
    adminResetCooldowns,
    adminResetSave,
  } = useGame();
  const [customAmount, setCustomAmount] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  function notify(msg: string) {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 1600);
  }

  // Defense in depth: even if someone reaches this screen by guessing the
  // route, the actual controls stay hidden unless the Telegram ID matches.
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 pb-28 pt-10 text-center">
        <p className="text-sm text-white/50">{t('admin.denied')}</p>
        <button onClick={onBack} className="mt-4 text-sm text-bulv underline">
          {t('common.close')}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-4">
      <button onClick={onBack} className="mb-4 flex items-center gap-1.5 text-sm text-white/60 active:scale-95">
        <ArrowLeft size={16} /> {t('common.close')}
      </button>

      <div className="flex items-center gap-2">
        <ShieldCheck size={20} className="text-bulv" />
        <h1 className="font-display text-xl text-white">{t('admin.title')}</h1>
      </div>
      <p className="mt-1 text-sm text-white/50">
        {t('admin.subtitle')} · ID {user?.id ?? '—'}
      </p>

      {flash && (
        <div className="mt-3 rounded-xl border border-mass/40 bg-mass/10 px-3 py-2 text-center text-xs font-bold text-mass">
          {flash}
        </div>
      )}

      {/* BULV */}
      <div className="mt-4 rounded-3xl border border-bulv/30 bg-surface p-5">
        <p className="font-display text-sm text-white">{t('admin.giveBulv')}</p>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {QUICK_AMOUNTS.map((amt) => (
            <button
              key={amt}
              onClick={() => {
                adminGiveBulv(amt);
                notify(`+${formatBulv(amt)} BULV`);
              }}
              className="rounded-xl bg-bulv/15 py-2 text-[11px] font-bold text-bulv active:scale-95"
            >
              +{formatBulv(amt)}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value.replace(/[^0-9-]/g, ''))}
            placeholder={t('admin.amountPlaceholder')}
            inputMode="numeric"
            className="flex-1 rounded-xl border border-surface-line bg-surface-raised px-3 py-2 text-sm text-white outline-none"
          />
          <button
            onClick={() => {
              const amt = parseInt(customAmount, 10);
              if (!Number.isFinite(amt) || amt === 0) return;
              adminGiveBulv(amt);
              notify(`${amt > 0 ? '+' : ''}${formatBulv(amt)} BULV`);
              setCustomAmount('');
            }}
            className="rounded-xl bg-bulv px-4 text-sm font-bold text-void active:scale-95"
          >
            {t('admin.give')}
          </button>
        </div>
      </div>

      {/* Athlete rarity */}
      <div className="mt-4 rounded-3xl border border-surface-line bg-surface p-5">
        <p className="font-display text-sm text-white">{t('admin.setAthlete')}</p>
        <p className="mt-1 text-xs text-white/45">{t('admin.pickRarity')}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {RARITIES.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                adminSetAthleteRarity(r.id as Rarity);
                notify(`${r.icon} ${t(r.nameKey)}`);
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold active:scale-95"
              style={{ backgroundColor: `${r.color}22`, border: `1px solid ${r.color}55`, color: r.color }}
            >
              {r.icon} {t(r.nameKey)}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              adminMaxStats();
              notify(t('admin.maxStats'));
            }}
            disabled={!state.athlete}
            className="rounded-xl bg-strength/15 py-2.5 text-xs font-bold text-strength active:scale-95 disabled:opacity-30"
          >
            {t('admin.maxStats')}
          </button>
          <button
            onClick={() => {
              adminFullEnergy();
              notify(t('admin.fullEnergy'));
            }}
            disabled={!state.athlete}
            className="rounded-xl bg-stamina/15 py-2.5 text-xs font-bold text-stamina active:scale-95 disabled:opacity-30"
          >
            {t('admin.fullEnergy')}
          </button>
        </div>
      </div>

      {/* Gear / cooldowns */}
      <div className="mt-4 rounded-3xl border border-surface-line bg-surface p-5">
        <button
          onClick={() => {
            adminUnlockAllGear();
            notify(t('admin.unlockGear'));
          }}
          className="w-full rounded-xl bg-mass/15 py-2.5 text-xs font-bold text-mass active:scale-95"
        >
          {t('admin.unlockGear')}
        </button>
        <button
          onClick={() => {
            adminResetCooldowns();
            notify(t('admin.resetCooldowns'));
          }}
          className="mt-2 w-full rounded-xl bg-genetics/15 py-2.5 text-xs font-bold text-genetics active:scale-95"
        >
          {t('admin.resetCooldowns')}
        </button>
      </div>

      {/* Danger zone */}
      <div className="mt-4 rounded-3xl border border-strength/30 bg-strength/5 p-5">
        <p className="font-display text-sm text-strength">{t('admin.dangerZone')}</p>
        <button
          onClick={() => setConfirmReset(true)}
          className="mt-3 w-full rounded-xl border border-strength/40 py-2.5 text-xs font-bold text-strength active:scale-95"
        >
          {t('admin.resetSave')}
        </button>
      </div>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)}>
        <h3 className="font-display text-base text-white">{t('admin.resetConfirmTitle')}</h3>
        <p className="mt-2 text-sm text-white/60">{t('admin.resetConfirmDesc')}</p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={() => setConfirmReset(false)}
            className="flex-1 rounded-xl border border-surface-line py-2.5 text-sm text-white/70 active:scale-95"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={() => {
              adminResetSave();
              setConfirmReset(false);
              notify(t('admin.resetSave'));
            }}
            className="flex-1 rounded-xl bg-strength py-2.5 text-sm font-bold text-white active:scale-95"
          >
            {t('common.confirm')}
          </button>
        </div>
      </Modal>
    </div>
  );
}

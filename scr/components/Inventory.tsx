import { useMemo, useState } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useGame } from '../contexts/GameContext';
import { useTelegram } from '../hooks/useTelegram';
import RarityBadge from './RarityBadge';
import Modal from './Modal';
import { GEAR_ITEMS, PHARMA_ITEMS, ATHLETE_VALUE } from '../utils/constants';
import { formatBulv } from '../utils/format';
import type { InventoryItem } from '../types';

interface InventoryProps {
  onBack: () => void;
}

type SellTarget =
  | { kind: 'active-athlete'; refund: number; label: string }
  | { kind: 'inventory'; id: string; refund: number; label: string };

export default function Inventory({ onBack }: InventoryProps) {
  const { t } = useLanguage();
  const { state, equipAthlete, equipGear, sellInventoryItem, sellActiveAthlete, useInventoryPharma } = useGame();
  const { hapticNotify } = useTelegram();

  const [flash, setFlash] = useState<string | null>(null);
  const [sellTarget, setSellTarget] = useState<SellTarget | null>(null);
  const [pharmaResult, setPharmaResult] = useState<{ name: string; failed: boolean } | null>(null);

  function notify(msg: string) {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 1800);
  }

  const athletes = useMemo(() => state.inventory.filter((i) => i.kind === 'athlete'), [state.inventory]);
  const gear = useMemo(() => state.inventory.filter((i) => i.kind === 'gear'), [state.inventory]);
  const pharma = useMemo(() => state.inventory.filter((i) => i.kind === 'pharma'), [state.inventory]);

  const isEmpty = !state.athlete && state.inventory.length === 0;

  function handleEquipAthlete(item: InventoryItem) {
    equipAthlete(item.id);
    hapticNotify('success');
    notify(t('inventory.equippedAthlete'));
  }

  function handleEquipGear(item: InventoryItem) {
    equipGear(item.id);
    hapticNotify('success');
    const def = GEAR_ITEMS.find((g) => g.id === item.refId);
    notify(t('inventory.equippedGear', { name: def ? t(def.nameKey) : item.refId }));
  }

  function handleUsePharma(item: InventoryItem) {
    const result = useInventoryPharma(item.id);
    const def = PHARMA_ITEMS.find((p) => p.id === item.refId);
    if (!result.ok) {
      hapticNotify('error');
      if (result.reason === 'cooldown') notify(t('inventory.onCooldown'));
      return;
    }
    hapticNotify(result.failed ? 'error' : 'success');
    setPharmaResult({ name: def ? t(def.nameKey) : item.refId, failed: !!result.failed });
  }

  function confirmSell() {
    if (!sellTarget) return;
    if (sellTarget.kind === 'active-athlete') {
      const result = sellActiveAthlete();
      if (result.ok) notify(t('inventory.sold', { amount: formatBulv(result.refund ?? 0) }));
    } else {
      const result = sellInventoryItem(sellTarget.id);
      if (result.ok) notify(t('inventory.sold', { amount: formatBulv(result.refund ?? 0) }));
    }
    hapticNotify('success');
    setSellTarget(null);
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-4">
      <button onClick={onBack} className="mb-4 flex items-center gap-1.5 text-sm text-white/60 active:scale-95">
        <ArrowLeft size={16} /> {t('common.close')}
      </button>

      <h1 className="font-display text-xl text-white">{t('inventory.title')}</h1>
      <p className="mt-1 text-sm text-white/50">{t('inventory.subtitle')}</p>

      {flash && (
        <div className="mt-3 rounded-xl border border-mass/40 bg-mass/10 px-3 py-2 text-center text-xs font-bold text-mass">
          {flash}
        </div>
      )}

      {isEmpty && (
        <div className="mt-8 flex flex-col items-center text-center">
          <Sparkles className="text-white/20" size={32} />
          <p className="mt-3 text-sm text-white/40">{t('inventory.empty')}</p>
        </div>
      )}

      {/* ── Currently equipped athlete ──────────────────────────────────── */}
      {state.athlete && (
        <div className="mt-5">
          <p className="text-xs font-semibold text-white/50">{t('inventory.sectionActive')}</p>
          <div className="mt-2 rounded-3xl border border-bulv/30 bg-surface p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-raised text-2xl">
                  🏆
                </div>
                <div>
                  <RarityBadge rarity={state.athlete.rarity} size="sm" />
                  <p className="mt-1 text-[11px] text-white/40">{t('inventory.activeLabel')}</p>
                </div>
              </div>
              <button
                onClick={() =>
                  setSellTarget({
                    kind: 'active-athlete',
                    refund: Math.round(ATHLETE_VALUE[state.athlete!.rarity] * 0.5),
                    label: t(`rarity.${state.athlete!.rarity}`),
                  })
                }
                className="rounded-xl border border-strength/40 bg-strength/10 px-3 py-2 text-[11px] font-bold text-strength active:scale-95"
              >
                {t('inventory.sell')} · {formatBulv(Math.round(ATHLETE_VALUE[state.athlete.rarity] * 0.5))}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bench: athletes in inventory ────────────────────────────────── */}
      {athletes.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold text-white/50">{t('inventory.sectionAthletes')}</p>
          <div className="mt-2 space-y-2">
            {athletes.map((item) => {
              const refund = Math.round(ATHLETE_VALUE[item.athlete!.rarity] * 0.5);
              return (
                <div key={item.id} className="flex items-center gap-3 rounded-3xl border border-surface-line bg-surface p-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-surface-raised text-2xl">
                    🏆
                  </div>
                  <div className="flex-1">
                    <RarityBadge rarity={item.athlete!.rarity} size="sm" />
                    <p className="mt-1 text-[10px] text-white/35">
                      STR {item.athlete!.stats.strength} · MASS {item.athlete!.stats.mass}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => handleEquipAthlete(item)}
                      className="rounded-lg bg-bulv px-3 py-1.5 text-[10px] font-bold text-void active:scale-95"
                    >
                      {t('inventory.equip')}
                    </button>
                    <button
                      onClick={() =>
                        setSellTarget({ kind: 'inventory', id: item.id, refund, label: t(`rarity.${item.athlete!.rarity}`) })
                      }
                      className="rounded-lg border border-strength/40 px-3 py-1.5 text-[10px] font-bold text-strength active:scale-95"
                    >
                      {t('inventory.sell')} · {formatBulv(refund)}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Gear in inventory ───────────────────────────────────────────── */}
      {gear.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold text-white/50">{t('inventory.sectionGear')}</p>
          <div className="mt-2 space-y-2">
            {gear.map((item) => {
              const def = GEAR_ITEMS.find((g) => g.id === item.refId);
              if (!def) return null;
              const refund = Math.round(def.price * 0.5);
              const alreadyEquipped = !!state.ownedGear[def.id];
              return (
                <div key={item.id} className="flex items-center gap-3 rounded-3xl border border-surface-line bg-surface p-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-surface-raised text-2xl">
                    {def.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-display text-xs text-white">{t(def.nameKey)}</p>
                    <p className="mt-0.5 text-[10px] text-white/40">{t(def.descKey)}</p>
                    {alreadyEquipped && (
                      <p className="mt-1 text-[10px] font-bold text-mass">{t('inventory.duplicateNote')}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => handleEquipGear(item)}
                      className="rounded-lg bg-mass px-3 py-1.5 text-[10px] font-bold text-void active:scale-95"
                    >
                      {t('inventory.equip')}
                    </button>
                    <button
                      onClick={() => setSellTarget({ kind: 'inventory', id: item.id, refund, label: t(def.nameKey) })}
                      className="rounded-lg border border-strength/40 px-3 py-1.5 text-[10px] font-bold text-strength active:scale-95"
                    >
                      {t('inventory.sell')} · {formatBulv(refund)}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Pharma in inventory ─────────────────────────────────────────── */}
      {pharma.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold text-white/50">{t('inventory.sectionPharma')}</p>
          <div className="mt-2 space-y-2">
            {pharma.map((item) => {
              const def = PHARMA_ITEMS.find((p) => p.id === item.refId);
              if (!def) return null;
              const refund = Math.round(def.price * 0.5);
              const cooldownUntil = state.pharmaCooldowns[def.id] ?? 0;
              const onCooldown = cooldownUntil > Date.now();
              return (
                <div key={item.id} className="flex items-center gap-3 rounded-3xl border border-surface-line bg-surface p-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-surface-raised text-2xl">
                    {def.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-display text-xs text-white">{t(def.nameKey)}</p>
                    <p className="mt-0.5 text-[10px] text-white/40">
                      ⚠ {t('pharma.risk')} {def.riskPercent}%
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => handleUsePharma(item)}
                      disabled={onCooldown}
                      className="rounded-lg bg-genetics px-3 py-1.5 text-[10px] font-bold text-white active:scale-95 disabled:opacity-40"
                    >
                      {onCooldown ? t('common.cooldown') : t('inventory.apply')}
                    </button>
                    <button
                      onClick={() => setSellTarget({ kind: 'inventory', id: item.id, refund, label: t(def.nameKey) })}
                      className="rounded-lg border border-strength/40 px-3 py-1.5 text-[10px] font-bold text-strength active:scale-95"
                    >
                      {t('inventory.sell')} · {formatBulv(refund)}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Sell confirmation ───────────────────────────────────────────── */}
      <Modal open={!!sellTarget} onClose={() => setSellTarget(null)}>
        {sellTarget && (
          <div className="text-center">
            <h3 className="font-display text-base text-white">{t('inventory.sellConfirmTitle')}</h3>
            <p className="mt-2 text-sm text-white/60">
              {t('inventory.sellConfirmDesc', { item: sellTarget.label, amount: formatBulv(sellTarget.refund) })}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setSellTarget(null)}
                className="flex-1 rounded-xl border border-surface-line py-2.5 text-sm text-white/70 active:scale-95"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmSell}
                className="flex-1 rounded-xl bg-strength py-2.5 text-sm font-bold text-white active:scale-95"
              >
                {t('inventory.sell')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Pharma apply result ─────────────────────────────────────────── */}
      <Modal open={!!pharmaResult} onClose={() => setPharmaResult(null)}>
        {pharmaResult && (
          <div className="text-center">
            <p className={`font-display text-base ${pharmaResult.failed ? 'text-strength' : 'text-mass'}`}>
              {pharmaResult.failed ? t('pharma.fail') : t('pharma.success')}
            </p>
            <p className="mt-1 text-xs text-white/50">{pharmaResult.name}</p>
            <button
              onClick={() => setPharmaResult(null)}
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

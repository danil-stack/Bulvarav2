import { useState, useEffect } from 'react';
import { TonConnectButton, useTonAddress, useTonWallet } from '@tonconnect/ui-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useGame } from '../contexts/GameContext';
import { formatBulv } from '../utils/format';

function shortenAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getTelegramId(): number {
  try {
    // @ts-ignore
    const tg = window.Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user?.id) {
      return tg.initDataUnsafe.user.id;
    }
  } catch (e) {
    console.error("Не удалось получить Telegram ID:", e);
  }
  return 123456789; 
}

export default function Wallet() {
  const { t, lang } = useLanguage();
  const { state } = useGame();
  const wallet = useTonWallet();
  const address = useTonAddress();

  const [referrals, setReferrals] = useState<any[]>([]);
  const [loadingRefs, setLoadingLeaders] = useState(false);
  const [copied, setCopied] = useState(false);

  const telegramId = getTelegramId();
  
  // Уникальная реферальная ссылка (замените bulvara_bot на реальный юзернейм вашего бота!)
  const refLink = `https://t.me/bulvara_bot/app?startapp=ref_${telegramId}`;

  // Загружаем список рефералов
  useEffect(() => {
    setLoadingLeaders(true);
    fetch('/api/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'referrals',
        telegramId: telegramId
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.referrals) {
        setReferrals(data.referrals);
      }
    })
    .catch(err => console.error("Ошибка загрузки рефералов:", err))
    .finally(() => setLoadingLeaders(false));
  }, [telegramId]);

  function handleCopy() {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-4">
      <h1 className="font-display text-xl text-white">{t('wallet.title')}</h1>
      <p className="mt-1 text-sm text-white/50">{t('wallet.subtitle')}</p>

      {/* ── Тон Коннект ── */}
      <div className="mt-4 rounded-3xl border border-ton/30 bg-gradient-to-br from-ton/10 to-surface p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-ton/15 text-3xl">
          💎
        </div>

        {wallet ? (
          <>
            <p className="mt-4 text-xs font-semibold text-mass">{t('wallet.connected')}</p>
            <p className="mt-1 font-mono text-sm text-white/80">{shortenAddress(address)}</p>
          </>
        ) : (
          <p className="mt-4 text-xs text-white/45">{t('wallet.notConnected')}</p>
        )}

        <div className="mt-5 flex justify-center">
          <TonConnectButton />
        </div>
      </div>

      {/* ── Реферальная система 👥 ── */}
      <div className="mt-4 rounded-3xl border border-surface-line bg-surface p-5">
        <p className="font-display text-sm text-white">
          {lang === 'ru' ? 'Пригласи друга и зарабатывай!' : 'Invite Friends & Earn!'}
        </p>
        <p className="text-[11px] text-white/45 mt-1 leading-snug">
          {lang === 'ru' 
            ? 'Получай прогрессивный бонус за каждого друга (до 5 человек) и пассивный доход от активности первых 3 друзей!' 
            : 'Get progressive invites bonus (up to 5 friends) and earn passive income from your first 3 friends!'}
        </p>

        {/* Шкала бонусов */}
        <div className="mt-4 grid grid-cols-5 gap-1.5 text-center text-[10px]">
          {[150, 200, 250, 300, 350].map((bonus, i) => {
            const reached = referrals.length > i;
            return (
              <div 
                key={i} 
                className={`p-2 rounded-xl border flex flex-col items-center justify-center ${
                  reached 
                    ? 'border-mass bg-mass/15 text-mass' 
                    : 'border-surface-line bg-surface-raised text-white/40'
                }`}
              >
                <span className="font-bold">#{i + 1}</span>
                <span className="font-mono mt-0.5 font-bold">+{bonus}</span>
              </div>
            );
          })}
        </div>

        {/* Реферальная Ссылка */}
        <div className="mt-4 flex gap-2">
          <input
            readOnly
            value={refLink}
            className="flex-1 rounded-xl border border-surface-line bg-surface-raised px-3 py-2.5 text-xs text-white/70 outline-none select-all"
          />
          <button
            onClick={handleCopy}
            className={`rounded-xl px-4 text-xs font-bold font-display active:scale-95 transition-all ${
              copied ? 'bg-mass text-void' : 'bg-bulv text-void shadow-neon-bulv'
            }`}
          >
            {copied ? (lang === 'ru' ? 'Копия!' : 'Copied!') : (lang === 'ru' ? 'Копировать' : 'Copy')}
          </button>
        </div>

        {/* Список приглашенных рефералов */}
        <div className="mt-5 border-t border-surface-line pt-4">
          <div className="flex items-center justify-between text-xs font-semibold text-white/60 mb-3">
            <span>{lang === 'ru' ? 'Ваши рефералы' : 'Your Referrals'}</span>
            <span className="font-mono text-bulv">{referrals.length} / 5</span>
          </div>

          {loadingRefs ? (
            <p className="text-center font-mono text-[10px] text-white/30 py-4 animate-pulse-glow">
              {lang === 'ru' ? 'Загрузка списка друзей...' : 'Loading friends list...'}
            </p>
          ) : referrals.length === 0 ? (
            <p className="text-center text-[10px] text-white/30 py-4">
              {lang === 'ru' ? 'Вы пока не пригласили друзей' : 'No friends invited yet'}
            </p>
          ) : (
            <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
              {referrals.map((ref, idx) => (
                <div 
                  key={ref.telegram_id} 
                  className="flex items-center justify-between rounded-xl bg-surface-raised px-3 py-2 text-[11px]"
                >
                  <div>
                    <span className="text-white/80 font-medium">{ref.name}</span>
                    <span className="text-white/30 text-[9px] block">ID {ref.telegram_id}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-bulv block">{formatBulv(ref.balance)} 💎</span>
                    {ref.rate > 0 ? (
                      <span className="text-[9px] text-mass font-bold">+{ref.rate}% пассив</span>
                    ) : (
                      <span className="text-[9px] text-white/35">без пассива</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-surface-line bg-surface p-5">
        <p className="text-xs text-white/50">{t('wallet.gameBalance')}</p>
        <p className="mt-1 font-mono text-2xl font-bold text-bulv">{formatBulv(state.bulv)} BULV</p>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-white/35">
          <span className="h-1.5 w-1.5 rounded-full bg-ton" />
          {t('wallet.network')}
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-surface-line bg-surface p-5">
        <p className="font-display text-sm text-white">{t('wallet.withdraw')}</p>
        <p className="mt-2 text-xs leading-relaxed text-white/45">{t('wallet.withdrawDesc')}</p>
        <button
          disabled
          className="mt-4 w-full rounded-2xl bg-surface-raised py-3 text-center text-xs font-bold text-white/35"
        >
          {t('wallet.withdrawDisabled')}
        </button>
      </div>
    </div>
  );
}

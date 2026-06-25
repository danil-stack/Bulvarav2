import { TonConnectButton, useTonAddress, useTonWallet } from '@tonconnect/ui-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useGame } from '../contexts/GameContext';
import { formatBulv } from '../utils/format';

function shortenAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function Wallet() {
  const { t } = useLanguage();
  const { state } = useGame();
  const wallet = useTonWallet();
  const address = useTonAddress();

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-4">
      <h1 className="font-display text-xl text-white">{t('wallet.title')}</h1>
      <p className="mt-1 text-sm text-white/50">{t('wallet.subtitle')}</p>

      <div className="mt-6 rounded-3xl border border-ton/30 bg-gradient-to-br from-ton/10 to-surface p-6 text-center">
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

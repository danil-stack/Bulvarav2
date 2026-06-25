import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import Pharma from './Pharma';
import Gear from './Gear';

export default function Shop() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<'pharma' | 'gear'>('pharma');

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-4">
      <h1 className="font-display text-xl text-white">{t('shop.title')}</h1>

      <div className="mt-4 flex gap-2 rounded-2xl bg-surface p-1">
        {(['pharma', 'gear'] as const).map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-colors ${
              tab === id ? 'bg-genetics text-white shadow-neon-genetics' : 'text-white/45'
            }`}
          >
            {t(id === 'pharma' ? 'shop.tabPharma' : 'shop.tabGear')}
          </button>
        ))}
      </div>

      {tab === 'pharma' ? <Pharma /> : <Gear />}
    </div>
  );
}

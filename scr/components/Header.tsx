import { useLanguage } from '../contexts/LanguageContext';
import { useGame } from '../contexts/GameContext';
import { formatBulv } from '../utils/format';

export default function Header() {
  const { t, lang, toggleLang } = useLanguage();
  const { state } = useGame();

  return (
    <header className="safe-top sticky top-0 z-30 border-b border-surface-line bg-void/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-mass to-bulv text-base shadow-neon-mass">
            🏋️
          </div>
          <div className="leading-tight">
            <p className="font-display text-sm text-white">{t('app.name')}</p>
            <p className="text-[10px] text-white/40">{t('app.tagline')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-bulv/30 bg-bulv/10 px-3 py-1.5">
            <span className="text-sm">💎</span>
            <span className="font-mono text-sm font-bold text-bulv">{formatBulv(state.bulv)}</span>
          </div>
          <button
            onClick={toggleLang}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-surface-line bg-surface text-[11px] font-bold text-white/70 active:scale-95"
            aria-label="toggle language"
          >
            {lang.toUpperCase()}
          </button>
        </div>
      </div>
    </header>
  );
}

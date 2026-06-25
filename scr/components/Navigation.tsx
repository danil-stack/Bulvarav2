import { Home, Dumbbell, Swords, ShoppingBag, Wallet } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import type { Screen } from '../App';

interface NavItem {
  id: Screen;
  icon: typeof Home;
  labelKey: string;
}

const ITEMS: NavItem[] = [
  { id: 'home', icon: Home, labelKey: 'nav.home' },
  { id: 'training', icon: Dumbbell, labelKey: 'nav.training' },
  { id: 'arena', icon: Swords, labelKey: 'nav.arena' },
  { id: 'shop', icon: ShoppingBag, labelKey: 'nav.shop' },
  { id: 'wallet', icon: Wallet, labelKey: 'nav.wallet' },
];

interface NavigationProps {
  active: Screen;
  onChange: (screen: Screen) => void;
}

export default function Navigation({ active, onChange }: NavigationProps) {
  const { t } = useLanguage();

  return (
    <nav className="safe-bottom glass fixed inset-x-0 bottom-0 z-40 border-t border-surface-line">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2 py-1.5">
        {ITEMS.map((item) => {
          const isActive = active === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className="relative flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 transition-colors"
            >
              {isActive && (
                <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-bulv shadow-neon-bulv" />
              )}
              <Icon
                size={22}
                strokeWidth={isActive ? 2.4 : 1.8}
                className={isActive ? 'text-bulv' : 'text-white/45'}
              />
              <span className={`text-[10px] font-medium ${isActive ? 'text-bulv' : 'text-white/45'}`}>
                {t(item.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

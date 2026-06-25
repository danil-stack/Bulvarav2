import { useEffect, useState } from 'react';
import { ADMIN_TELEGRAM_ID } from '../utils/constants';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  enableClosingConfirmation?: () => void;
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  };
  initDataUnsafe?: { user?: TelegramUser };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function useTelegram() {
  const [user, setUser] = useState<TelegramUser | null>(null);

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) return;
    try {
      webApp.ready();
      webApp.expand();
      webApp.setHeaderColor?.('#0A0D12');
      webApp.setBackgroundColor?.('#0A0D12');
      setUser(webApp.initDataUnsafe?.user ?? null);
    } catch {
      /* not running inside Telegram — ignore */
    }
  }, []);

  function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
  }

  function hapticNotify(type: 'success' | 'error' | 'warning') {
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type);
  }

  // Real Telegram ID match → admin. The `import.meta.env.DEV && !user` part
  // is just a local-dev convenience (true only in `npm run dev`, never in a
  // production build) so you can see the admin panel while testing outside
  // Telegram. It has zero effect once you `npm run build`.
  const isAdmin = user?.id === ADMIN_TELEGRAM_ID || (import.meta.env.DEV && !user);

  return { user, haptic, hapticNotify, isAdmin };
}

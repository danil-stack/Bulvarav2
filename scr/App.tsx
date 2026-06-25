import { useState } from 'react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { LanguageProvider } from './contexts/LanguageContext';
import { GameProvider } from './contexts/GameContext';
import Header from './components/Header';
import Navigation from './components/Navigation';
import Home from './components/Home';
import Incubator from './components/Incubator';
import Training from './components/Training';
import Arena from './components/Arena';
import Shop from './components/Shop';
import Wallet from './components/Wallet';

export type Screen = 'home' | 'incubator' | 'training' | 'arena' | 'shop' | 'wallet';

// Bottom-nav tabs (Incubator is reached from Home, not from the tab bar).
const TAB_SCREENS: Screen[] = ['home', 'training', 'arena', 'shop', 'wallet'];

const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`;

function Shell() {
  const [screen, setScreen] = useState<Screen>('home');

  function renderScreen() {
    switch (screen) {
      case 'home':
        return <Home onNavigate={setScreen} />;
      case 'incubator':
        return <Incubator onBack={() => setScreen('home')} />;
      case 'training':
        return <Training />;
      case 'arena':
        return <Arena />;
      case 'shop':
        return <Shop />;
      case 'wallet':
        return <Wallet />;
      default:
        return null;
    }
  }

  const showNav = TAB_SCREENS.includes(screen);

  return (
    <div className="min-h-screen bg-void bg-grid text-white">
      <Header />
      <main>{renderScreen()}</main>
      {showNav && (
        <Navigation
          active={screen}
          onChange={(next) => setScreen(next)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <LanguageProvider>
        <GameProvider>
          <Shell />
        </GameProvider>
      </LanguageProvider>
    </TonConnectUIProvider>
  );
}

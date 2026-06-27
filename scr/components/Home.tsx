import { useLanguage } from '../contexts/LanguageContext';
import { useGame } from '../contexts/GameContext';
import { useTelegram } from '../hooks/useTelegram';
import AthleteCard from './AthleteCard';
import { formatBulv } from '../utils/format';
import { PHARMA_ITEMS, NUTRITION_ITEMS } from '../utils/constants';
import { LEVEL_TIER_CLASS } from '../utils/levelStyle';
import type { Screen } from '../App';

interface HomeProps {
  onNavigate: (screen: Screen) => void;
}

function findBoostLabel(sourceId: string): { icon: string; nameKey: string } {
  const pharma = PHARMA_ITEMS.find((p) => p.id === sourceId);
  if (pharma) return { icon: pharma.icon, nameKey: pharma.nameKey };
  const nutrition = NUTRITION_ITEMS.find((n) => n.id === sourceId);
  if (nutrition) return { icon: nutrition.icon, nameKey: nutrition.nameKey };
  return { icon: '✨', nameKey: 'common.comingSoon' };
}

export default function Home({ onNavigate }: HomeProps) {
  const { t, lang } = useLanguage();
  const { state, energyMax, power, miningRatePerHour, levelInfo } = useGame();
  const { user } = useTelegram();
  const name = user?.first_name ?? (lang === 'ru' ? 'Чемпион' : 'Champion');

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-4">
      <div className="flex items-center justify-between">
        <p className="font-display text-lg text-white">{t('home.greeting', { name })}</p>
        {state.athlete && (
          <span className={`font-display text-xs font-bold ${LEVEL_TIER_CLASS[levelInfo.current.tier]}`}>
            LV{levelInfo.current.level} · {t(levelInfo.current.nameKey)}
          </span>
        )}
      </div>

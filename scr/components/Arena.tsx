import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useGame } from '../contexts/GameContext';
import { useTelegram } from '../hooks/useTelegram';
import Modal from './Modal';
import { LEAGUES } from '../utils/constants';
import { formatBulv, formatDuration } from '../utils/format';
import type { ArenaResult } from '../types';

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

export default function Arena() {
  const { t, lang } = useLanguage();
  const { state, power, enterArena } = useGame();
  const { hapticNotify } = useTelegram();
  
  const [result, setResult] = useState<ArenaResult | null>(null);
  
  // Вкладки: 'leagues' (Лиги) или 'leaderboard' (Лидерборд)
  const [arenaTab, setArenaTab] = useState<'leagues' | 'leaderboard'>('leagues');
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loadingLeaders, setLoadingLeaders] = useState(false);

  const currentUserId = getTelegramId();

  // Запрос таблицы лидеров при переключении на соответствующую вкладку
  useEffect(() => {
    if (arenaTab === 'leaderboard') {
      setLoadingLeaders(true);
      fetch('/api/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'leaderboard',
          telegramId: currentUserId
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.leaderboard) {
          setLeaders(data.leaderboard);
        }
      })
      .catch(err => console.error("Ошибка загрузки лидерборда:", err))
      .finally(() => setLoadingLeaders(false));
    }
  }, [arenaTab, currentUserId]);

  function handleEnter(leagueId: string) {
    const res = enterArena(leagueId);
    if (!res.ok || !res.result) {
      hapticNotify('error');
      return;
    }
    hapticNotify(res.result.win ? 'success' : 'error');
    setResult(res.result);
  }

  if (!state.athlete) {
    return (
      <div className="mx-auto max-w-md px-4 pb-28 pt-10 text-center text-sm text-white/50">
        {t('home.noAthleteDesc')}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-4">
      <h1 className="font-display text-xl text-white">{t('arena.title')}</h1>
      <p className="mt-1 text-sm text-white/50">{t('arena.subtitle')}</p>

      {/* Переключатель вкладок Арены */}
      <div className="mt-4 flex gap-2 rounded-2xl bg-surface p-1">
        <button
          onClick={() => setArenaTab('leagues')}
          className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-colors ${
            arenaTab === 'leagues' ? 'bg-bulv text-void shadow-neon-bulv' : 'text-white/45'
          }`}
        >
          🏆 {lang === 'ru' ? 'Лиги' : 'Leagues'}
        </button>
        <button
          onClick={() => setArenaTab('leaderboard')}
          className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-colors ${
            arenaTab === 'leaderboard' ? 'bg-bulv text-void shadow-neon-bulv' : 'text-white/45'
          }`}
        >
          🔥 {lang === 'ru' ? 'Лидеры' : 'Leaderboard'}
        </button>
      </div>

      {arenaTab === 'leagues' ? (
        <>
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-strength/30 bg-strength/10 px-4 py-2.5 text-xs">
            <span className="font-semibold text-strength">{t('common.power')}</span>
            <span className="font-mono font-bold text-strength">{power}</span>
          </div>

          <div className="mt-4 space-y-3">
            {LEAGUES.map((league) => {
              const locked = power < league.minPower;
              const cooldownUntil = state.arenaCooldowns[league.id] ?? 0;
              const remaining = cooldownUntil - Date.now();
              const onCooldown = remaining > 0;
              const canAfford = state.bulv >= league.entryFee;
              const disabled = locked || onCooldown || !canAfford;

              return (
                <div key={league.id} className="rounded-3xl border border-surface-line bg-surface p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{league.icon}</span>
                    <div className="flex-1">
                      <p className="font-display text-sm text-white">{t(league.nameKey)}</p>
                      <p className="text-[11px] text-white/40">
                        {t('arena.minPower')}: {league.minPower}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-xl bg-surface-raised px-3 py-2">
                      <p className="text-white/40">{t('arena.entryFee')}</p>
                      <p className="font-mono font-bold text-strength">{formatBulv(league.entryFee)}</p>
                    </div>
                    <div className="rounded-xl bg-surface-raised px-3 py-2">
                      <p className="text-white/40">{t('arena.reward')}</p>
                      <p className="font-mono font-bold text-mass">
                        {formatBulv(league.rewardMin)}–{formatBulv(league.rewardMax)}
                      </p>
                    </div>
                  </div>

                  {locked && (
                    <p className="mt-2 text-[10px] font-mono text-white/35">
                      {t('arena.locked', { power: league.minPower })}
                    </p>
                  )}
                  {onCooldown && !locked && (
                    <p className="mt-2 text-[10px] font-mono text-white/35">
                      {t('common.cooldown')}: {formatDuration(remaining, lang)}
                    </p>
                  )}

                  <button
                    onClick={() => handleEnter(league.id)}
                    disabled={disabled}
                    className="mt-3 w-full rounded-xl bg-bulv py-2.5 text-center text-xs font-bold text-void active:scale-95 disabled:opacity-30"
                  >
                    {t('arena.enter')}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-6">
            <p className="text-xs font-semibold text-white/50">{t('arena.history')}</p>
            {state.arenaHistory.length === 0 ? (
              <p className="mt-2 text-xs text-white/30">{t('arena.noHistory')}</p>
            ) : (
              <div className="mt-2 space-y-1.5">
                {state.arenaHistory.slice(0, 8).map((h, i) => {
                  const league = LEAGUES.find((l) => l.id === h.leagueId);
                  return (
                    <div
                      key={`${h.timestamp}-${i}`}
                      className="flex items-center justify-between rounded-xl bg-surface px-3 py-2 text-[11px]"
                    >
                      <span className="text-white/60">
                        {league?.icon} {league ? t(league.nameKey) : h.leagueId}
                      </span>
                      <span className={`font-mono font-bold ${h.win ? 'text-mass' : 'text-strength'}`}>
                        {h.win ? `+${formatBulv(h.reward)}` : t('common.lose')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        /* 🏆 КРАСИВЫЙ ЛИДЕРБОРД */
        <div className="mt-4">
          {loadingLeaders ? (
            <div className="mt-10 text-center font-mono text-xs text-white/55 animate-pulse-glow">
              {lang === 'ru' ? 'Получение списка чемпионов...' : 'Fetching champions list...'}
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {leaders.length === 0 ? (
                <p className="text-center text-xs text-white/30 py-10">
                  {lang === 'ru' ? 'Лидеров пока нет' : 'No leaders found'}
                </p>
              ) : (
                leaders.map((item, idx) => {
                  const rank = idx + 1;
                  const isSelf = item.telegram_id === currentUserId;
                  const displayName = item.username ? `@${item.username}` : item.first_name;

                  // Цветовое выделение топ-3
                  const rankColor = 
                    rank === 1 ? 'text-[#FFD23E]' : // Золото
                    rank === 2 ? 'text-[#C0C0C0]' : // Серебро
                    rank === 3 ? 'text-[#CD7F32]' : // Бронза
                    'text-white/45';

                  const rowBorder = isSelf ? 'border-bulv/40 bg-bulv/5' : 'border-surface-line bg-surface';

                  return (
                    <div 
                      key={item.telegram_id} 
                      className={`flex items-center justify-between rounded-2xl border p-3.5 transition-all ${rowBorder}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`font-display text-sm font-bold w-6 text-center ${rankColor}`}>
                          #{rank}
                        </span>
                        <div>
                          <p className={`text-xs font-semibold ${isSelf ? 'text-bulv font-bold' : 'text-white'}`}>
                            {displayName} {isSelf && `(${lang === 'ru' ? 'Вы' : 'You'})`}
                          </p>
                          <p className="text-[9px] text-white/30 font-mono">ID {item.telegram_id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono font-bold text-strength">
                          {item.power} 🔥
                        </p>
                        <p className="text-[10px] font-mono font-semibold text-bulv">
                          {formatBulv(item.balance)} 💎
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      <Modal open={!!result} onClose={() => setResult(null)}>
        {result && (
          <div className="text-center">
            <p className="text-4xl">{result.win ? '🏆' : '💥'}</p>
            <p className={`mt-3 font-display text-lg ${result.win ? 'text-mass' : 'text-strength'}`}>
              {result.win ? t('arena.resultWinTitle') : t('arena.resultLoseTitle')}
            </p>
            <p className="mt-1 text-xs text-white/50">
              {result.win ? t('arena.resultWinDesc') : t('arena.resultLoseDesc')}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-surface-raised px-3 py-2">
                <p className="text-white/40">{t('arena.yourPower')}</p>
                <p className="font-mono font-bold text-white">{result.power}</p>
              </div>
              <div className="rounded-xl bg-surface-raised px-3 py-2">
                <p className="text-white/40">{t('arena.opponentPower')}</p>
                <p className="font-mono font-bold text-white">{result.opponentPower}</p>
              </div>
            </div>
            {result.win && (
              <p className="mt-3 font-mono text-xl font-bold text-bulv">+{formatBulv(result.reward)} 💎</p>
            )}
            <button
              onClick={() => setResult(null)}
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

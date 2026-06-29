// @ts-nocheck
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(200).json({ 
        success: false, 
        error: 'ОШИБКА НАСТРОЙКИ: Vercel не видит переменную "SUPABASE_SERVICE_ROLE_KEY". Проверьте настройки Environment Variables и ОБЯЗАТЕЛЬНО сделайте Redeploy!' 
      });
    }

    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = req.body || {};
    const { initData, isSaveRequest, balance, opened_cases } = body;

    let telegramId = body.telegramId ? parseInt(body.telegramId, 10) : null;

    // Парсим никнейм, имя и реферальный код (start_param)
    let username = '';
    let firstName = 'Игрок';
    let referredById: number | null = null;
    
    if (initData) {
      try {
        const urlParams = new URLSearchParams(initData);
        const userRaw = urlParams.get('user');
        if (userRaw) {
          const parsed = JSON.parse(userRaw);
          username = parsed.username || '';
          firstName = parsed.first_name || 'Игрок';
        }
        
        // Извлекаем start_param для реферальной системы
        const startParam = urlParams.get('start_param');
        if (startParam) {
          const match = startParam.match(/^ref_(\d+)$/);
          if (match) {
            referredById = parseInt(match[1], 10);
          }
        }
      } catch (e) {
        console.error("Ошибка парсинга:", e);
      }
    }

    if (!telegramId && initData) {
      try {
        const urlParams = new URLSearchParams(initData);
        const userRaw = urlParams.get('user');
        if (userRaw) {
          telegramId = parseInt(JSON.parse(userRaw).id, 10);
        }
      } catch (e) {}
    }

    if (!telegramId) {
      return res.status(200).json({ success: false, error: 'Не удалось определить Telegram ID' });
    }

    // 🏆 ТАБЛИЦА ЛИДЕРОВ
    if (body.action === 'leaderboard') {
      const { data: allPlayers, error: fetchErr } = await supabase
        .from('players')
        .select('telegram_id, balance, opened_cases');

      if (fetchErr) {
        return res.status(200).json({ success: false, error: fetchErr.message });
      }

      const leaderboard = (allPlayers || []).map(p => {
        const opened = p.opened_cases || {};
        const athlete = opened.athlete || null;
        
        const uName = opened.username || '';
        const fName = opened.first_name || 'Игрок';

        let power = 0;
        if (athlete && athlete.stats) {
          const s = athlete.stats;
          power = Math.round(
            (s.strength || 0) * 2 + 
            (s.mass || 0) * 1 + 
            (s.stamina || 0) * 0.5 + 
            (s.genetics || 0) * 0.5
          );
        }

        return {
          telegram_id: p.telegram_id,
          username: uName,
          first_name: fName,
          power: power,
          balance: p.balance
        };
      })
      .sort((a, b) => b.power - a.power)
      .slice(0, 50);

      return res.status(200).json({ success: true, leaderboard });
    }

    // 👥 РЕФЕРАЛЫ: ПОЛУЧЕНИЕ СПИСКА (action === 'referrals')
    if (body.action === 'referrals') {
      const { data: refs, error: fetchErr } = await supabase
        .from('players')
        .select('telegram_id, balance, opened_cases')
        .eq('referred_by', telegramId)
        .order('created_at', { ascending: true }); // По порядку приглашения

      if (fetchErr) {
        return res.status(200).json({ success: false, error: fetchErr.message });
      }

      const referralList = (refs || []).map((r, idx) => {
        const opened = r.opened_cases || {};
        const uName = opened.username || '';
        const fName = opened.first_name || 'Игрок';
        
        // Пассивные проценты только для первых трёх рефералов
        const rates = [15, 10, 5];
        const rate = rates[idx] || 0;

        return {
          telegram_id: r.telegram_id,
          name: uName ? `@${uName}` : fName,
          balance: r.balance,
          rate
        };
      });

      return res.status(200).json({ success: true, referrals: referralList });
    }

    // 1. СОХРАНЕНИЕ ПРОГРЕССА С УЧЕТОМ ПАССИВНОГО ДОХОДА
    if (isSaveRequest) {
      const finalBalance = balance !== undefined ? Math.round(Number(balance)) : 150;
      const gameStatePayload = opened_cases && typeof opened_cases === 'object' ? opened_cases : {};
      
      gameStatePayload.username = username || gameStatePayload.username || '';
      gameStatePayload.first_name = firstName || gameStatePayload.first_name || 'Игрок';

      // 📈 РАСЧЁТ ПАССИВНОГО ДОХОДА ДЛЯ ПРИГЛАСИВШЕГО
      // Достаем предыдущий баланс игрока из базы, чтобы найти дельту (сколько он заработал)
      const { data: oldData } = await supabase
        .from('players')
        .select('balance, referred_by')
        .eq('telegram_id', telegramId)
        .maybeSingle();

      if (oldData && oldData.referred_by) {
        const oldBalance = oldData.balance || 0;
        const delta = finalBalance - oldBalance;

        // Если реферал заработал BULV (через майнинг, кликер или арену)
        if (delta > 0) {
          const parentId = oldData.referred_by;

          // Определяем порядковый номер (индекс) текущего реферала у его родителя
          const { data: siblings } = await supabase
            .from('players')
            .select('telegram_id')
            .eq('referred_by', parentId)
            .order('created_at', { ascending: true });

          if (siblings) {
            const myIndex = siblings.findIndex(s => s.telegram_id === telegramId);
            
            // Пассивный доход начисляется только первым трём приглашённым рефералам
            const rates = [0.15, 0.10, 0.05]; // 15%, 10%, 5%
            const myRate = rates[myIndex];

            if (myRate !== undefined) {
              const passiveEarned = delta * myRate;

              if (passiveEarned > 0) {
                // Начисляем пассивный доход на баланс родителя
                const { data: parentData } = await supabase
                  .from('players')
                  .select('balance')
                  .eq('telegram_id', parentId)
                  .maybeSingle();

                if (parentData) {
                  const newParentBalance = (parentData.balance || 0) + passiveEarned;
                  await supabase
                    .from('players')
                    .update({ balance: newParentBalance })
                    .eq('telegram_id', parentId);
                }
              }
            }
          }
        }
      }
      
      const { error: upsertError } = await supabase
        .from('players')
        .upsert({ 
          telegram_id: telegramId, 
          balance: finalBalance, 
          opened_cases: gameStatePayload,
          updated_at: new Date().toISOString()
        }, { onConflict: 'telegram_id' });

      if (upsertError) {
        return res.status(200).json({ success: false, error: upsertError.message });
      }
      return res.status(200).json({ success: true });
    }

    // 2. ЗАГРУЗКА ДАННЫХ ИГРОКА (И РЕГИСТРАЦИЯ)
    let { data: player, error: selectError } = await supabase
      .from('players')
      .select('balance, opened_cases, referred_by')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (selectError) {
      return res.status(200).json({ success: false, error: selectError.message });
    }

    // Если игрока ещё нет в базе — регистрируем его
    if (!player) {
      let finalReferredBy: number | null = null;

      // Проверяем, не пытается ли игрок пригласить сам себя
      if (referredById && referredById !== telegramId) {
        // Проверяем, сколько рефералов уже есть у пригласившего (лимит 5 человек)
        const { count } = await supabase
          .from('players')
          .select('telegram_id', { count: 'exact', head: true })
          .eq('referred_by', referredById);

        if (count !== null && count < 5) {
          finalReferredBy = referredById;

          // Начисляем прогрессивный бонус пригласившему за нового реферала
          const referralBonuses = [150, 200, 250, 300, 350];
          const inviteBonus = referralBonuses[count] || 350;

          const { data: parentData } = await supabase
            .from('players')
            .select('balance')
            .eq('telegram_id', referredById)
            .maybeSingle();

          if (parentData) {
            const newParentBalance = (parentData.balance || 0) + inviteBonus;
            await supabase
              .from('players')
              .update({ balance: newParentBalance })
              .eq('telegram_id', referredById);
          }
        }
      }

      const { data: newPlayer, error: insertError } = await supabase
        .from('players')
        .insert([{ 
          telegram_id: telegramId, 
          balance: 150, 
          opened_cases: {
            username: username,
            first_name: firstName
          },
          referred_by: finalReferredBy
        }])
        .select()
        .maybeSingle();

      if (insertError) {
        return res.status(200).json({ success: false, error: insertError.message });
      }
      player = newPlayer;
    } else {
      // Если игрок уже зарегистрирован, но у него в JSON еще нет имени — обновим его
      const opened = player.opened_cases || {};
      if (!opened.username || !opened.first_name) {
        opened.username = username || opened.username || '';
        opened.first_name = firstName || opened.first_name || 'Игрок';
        await supabase
          .from('players')
          .update({ opened_cases: opened })
          .eq('telegram_id', telegramId);
      }
    }

    return res.status(200).json({
      success: true,
      balance: player ? player.balance : 150,
      opened_cases: player && player.opened_cases ? player.opened_cases : {}
    });

  } catch (err: any) {
    return res.status(200).json({ success: false, error: 'Исключение бэкенда: ' + err.message });
  }
}

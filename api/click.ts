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

    // Парсим никнейм и имя из Telegram WebApp initData
    let username = '';
    let firstName = 'Игрок';
    
    if (initData) {
      try {
        const urlParams = new URLSearchParams(initData);
        const userRaw = urlParams.get('user');
        if (userRaw) {
          const parsed = JSON.parse(userRaw);
          username = parsed.username || '';
          firstName = parsed.first_name || 'Игрок';
        }
      } catch (e) {
        console.error("Ошибка парсинга Telegram ID/Имени:", e);
      }
    }

    // Резервный парсинг ID, если telegramId не передан в body напрямую
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

    // 🏆 НОВАЯ ЛОГИКА: ТАБЛИЦА ЛИДЕРОВ (action === 'leaderboard')
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

        // Вычисляем базовую мощность атлета на основе статов в JSON
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
      .sort((a, b) => b.power - a.power) // Сортировка строго по мощности атлета
      .slice(0, 50); // Берем топ-50 игроков

      return res.status(200).json({ success: true, leaderboard });
    }

    // 1. СОХРАНЕНИЕ ПРОГРЕССА
    if (isSaveRequest) {
      const finalBalance = balance !== undefined ? Math.round(Number(balance)) : 150;
      const gameStatePayload = opened_cases && typeof opened_cases === 'object' ? opened_cases : {};
      
      // Автоматически сохраняем актуальное имя/никнейм игрока в JSON
      gameStatePayload.username = username || gameStatePayload.username || '';
      gameStatePayload.first_name = firstName || gameStatePayload.first_name || 'Игрок';
      
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

    // 2. ЗАГРУЗКА ДАННЫХ ИГРОКА
    let { data: player, error: selectError } = await supabase
      .from('players')
      .select('balance, opened_cases')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (selectError) {
      return res.status(200).json({ success: false, error: selectError.message });
    }

    // Создание нового профиля
    if (!player) {
      const { data: newPlayer, error: insertError } = await supabase
        .from('players')
        .insert([{ 
          telegram_id: telegramId, 
          balance: 150, 
          opened_cases: {
            username: username,
            first_name: firstName
          } 
        }])
        .select()
        .maybeSingle();

      if (insertError) {
        return res.status(200).json({ success: false, error: insertError.message });
      }
      player = newPlayer;
    } else {
      // Если игрок есть, но никнейма в JSON еще нет, обновляем его
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

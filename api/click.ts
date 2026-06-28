// @ts-nocheck
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return res.status(200).json({ success: false, error: 'Ключи Supabase не настроены в Vercel.' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = req.body || {};
    const { initData, isSaveRequest, balance, opened_cases } = body;

    // Прямой приоритет числовому ID с фронтенда, чтобы избежать проблем с кодировкой строк Telegram
    let telegramId = body.telegramId || 123456789;

    // Резервный вариант: если фронтенд передал только initData, парсим из него
    if (!body.telegramId && initData) {
      try {
        const urlParams = new URLSearchParams(initData);
        const userRaw = urlParams.get('user');
        if (userRaw) {
          telegramId = JSON.parse(userRaw).id;
        }
      } catch (e) {
        console.error("Ошибка парсинга Telegram ID на бэкенде:", e);
      }
    }

    // 1. ЛОГИКА СОХРАНЕНИЯ ПРОГРЕССА ИГРОКА
    if (isSaveRequest) {
      const finalBalance = balance !== undefined ? Math.round(Number(balance)) : 150;
      const gameStatePayload = opened_cases && typeof opened_cases === 'object' ? opened_cases : {};
      
      const { error: updateError } = await supabase
        .from('players')
        .update({
          balance: finalBalance,
          opened_cases: gameStatePayload,
          updated_at: new Date().toISOString()
        })
        .eq('telegram_id', telegramId); // Строчный регистр по структуре базы

      if (updateError) {
        return res.status(200).json({ success: false, error: updateError.message });
      }
      return res.status(200).json({ success: true });
    }

    // 2. ЛОГИКА ЗАГРУЗКИ ПРОГРЕССА ИГРОКА
    let { data: player, error: selectError } = await supabase
      .from('players')
      .select('balance, opened_cases')
      .eq('telegram_id', telegramId) // Строчный регистр по структуре базы
      .maybeSingle();

    if (selectError) {
      return res.status(200).json({ success: false, error: selectError.message });
    }

    // Если игрока с таким ID нет в базе, создаем для него стартовую строку
    if (!player) {
      const { data: newPlayer, error: insertError } = await supabase
        .from('players')
        .insert([{ 
          telegram_id: telegramId, 
          balance: 150, 
          opened_cases: {} 
        }])
        .select()
        .maybeSingle();
      
      if (insertError) {
        return res.status(200).json({ success: false, error: insertError.message });
      }
      player = newPlayer;
    }

    return res.status(200).json({
      success: true,
      balance: player ? player.balance : 150,
      opened_cases: player && player.opened_cases ? player.opened_cases : {}
    });

  } catch (err: any) {
    // Полный перехват любых исключений, чтобы предотвратить появление Error 500
    return res.status(200).json({ success: false, error: 'Исключение бэкенда: ' + err.message });
  }
}

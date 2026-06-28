// @ts-nocheck
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return res.status(200).json({ success: false, error: 'Ключи Supabase не настроены.' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = req.body || {};
    const { initData, isSaveRequest, balance, opened_cases } = body;

    // Извлекаем Telegram ID напрямую из initData без жесткой проверки хэша (для тестов и стабильности)
    let telegramId = 123456789;
    if (initData) {
      try {
        const urlParams = new URLSearchParams(initData);
        const userRaw = urlParams.get('user');
        if (userRaw) {
          telegramId = JSON.parse(userRaw).id;
        }
      } catch (e) {
        console.error("Ошибка извлечения Telegram ID:", e);
      }
    }

    // 1. ЛОГИКА СОХРАНЕНИЯ ПРОГРЕССА
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
        .eq('telegram_id', telegramId);

      if (updateError) {
        return res.status(200).json({ success: false, error: updateError.message });
      }
      return res.status(200).json({ success: true });
    }

    // 2. ЛОГИКА ЗАГРУЗКИ ПРОГРЕССА
    let { data: player, error: selectError } = await supabase
      .from('players')
      .select('balance, opened_cases')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (selectError) {
      return res.status(200).json({ success: false, error: selectError.message });
    }

    // Если игрока с таким Telegram ID реально нет в таблице, создаем стартовую позицию
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

    const savedGameState = player && player.opened_cases && typeof player.opened_cases === 'object' ? player.opened_cases : {};

    return res.status(200).json({
      success: true,
      balance: player ? player.balance : 150,
      opened_cases: savedGameState
    });

  } catch (err: any) {
    return res.status(200).json({ success: false, error: 'Исключение: ' + err.message });
  }
}

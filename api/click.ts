// @ts-nocheck
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function verifyTelegramData(initData: string, botToken: string): boolean {
  if (!initData) return false;
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');

    const dataCheckString = Array.from(urlParams.entries())
      .map(([key, value]) => `${key}=${value}`)
      .sort()
      .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    return calculatedHash === hash;
  } catch (e) {
    return false;
  }
}

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
    const botToken = process.env.BOT_TOKEN || '';

    // Дефолтный ID для тестов в браузере
    let telegramId = 123456789;

    // Проверяем Telegram-сессию
    if (initData && botToken && verifyTelegramData(initData, botToken)) {
      try {
        const urlParams = new URLSearchParams(initData);
        const userRaw = urlParams.get('user');
        if (userRaw) {
          telegramId = JSON.parse(userRaw).id;
        }
      } catch (e) {
        console.error("Ошибка парсинга TG user:", e);
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
        .eq('telegram_id', telegramId); // Исправлен регистр колонки!

      if (updateError) {
        return res.status(200).json({ success: false, error: updateError.message });
      }
      return res.status(200).json({ success: true });
    }

    // 2. ЛОГИКА ЗАГРУЗКИ ПРОГРЕССА
    let { data: player, error: selectError } = await supabase
      .from('players')
      .select('balance, opened_cases')
      .eq('telegram_id', telegramId) // Исправлен регистр колонки!
      .maybeSingle();

    if (selectError) {
      return res.status(200).json({ success: false, error: selectError.message });
    }

    // Если игрока нет, создаем его
    if (!player) {
      const { data: newPlayer, error: insertError } = await supabase
        .from('players')
        .insert([{ 
          telegram_id: telegramId, // Исправлен регистр колонки!
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
    // Перехватываем абсолютно любые падения, чтобы Vercel выдал статус 200, а не 500
    return res.status(200).json({ success: false, error: 'Внутреннее исключение: ' + err.message });
  }
}

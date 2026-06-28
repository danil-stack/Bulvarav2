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
  // Инициализируем Supabase строго внутри хэндлера, чтобы Vercel гарантированно подтянул переменные
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({ 
      success: false, 
      error: 'Ключи Supabase не найдены в переменных окружения Vercel.' 
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const body = req.method === 'POST' ? req.body : req.query;
  const { initData, isSaveRequest, balance, opened_cases } = body;
  const botToken = process.env.BOT_TOKEN!;

  let telegramId = 123456789;

  if (initData && verifyTelegramData(initData, botToken)) {
    try {
      const urlParams = new URLSearchParams(initData);
      const userRaw = urlParams.get('user');
      if (userRaw) {
        telegramId = JSON.parse(userRaw).id;
      }
    } catch (e) {
      console.error("Ошибка парсинга пользователя Telegram:", e);
    }
  }

  try {
    if (isSaveRequest) {
      const finalBalance = balance !== undefined ? Math.round(Number(balance)) : 150;
      const finalCases = typeof opened_cases === 'object' ? opened_cases : {};

      const { error } = await supabase
        .from('players')
        .update({
          balance: finalBalance,
          opened_cases: finalCases,
          updated_at: new Date().toISOString()
        })
        .eq('telegram_id', telegramId);

      if (error) {
        return res.status(200).json({ success: false, error: error.message });
      }
      return res.status(200).json({ success: true });
    }

    let { data: player, error: selectError } = await supabase
      .from('players')
      .select('balance, opened_cases')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (selectError) {
      return res.status(200).json({ success: false, error: selectError.message });
    }

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
      opened_cases: player ? player.opened_cases : {}
    });

  } catch (err: any) {
    return res.status(200).json({ success: false, error: err.message });
  }
}

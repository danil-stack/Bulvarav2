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
    
    // 🔍 ДИАГНОСТИКА: Проверяем, видит ли Vercel наш секретный ключ
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

    if (!telegramId && initData) {
      try {
        const urlParams = new URLSearchParams(initData);
        const userRaw = urlParams.get('user');
        if (userRaw) {
          telegramId = parseInt(JSON.parse(userRaw).id, 10);
        }
      } catch (e) {
        console.error("Ошибка парсинга Telegram ID:", e);
      }
    }

    if (!telegramId) {
      return res.status(200).json({ success: false, error: 'Не удалось определить Telegram ID' });
    }

    // 1. СОХРАНЕНИЕ ПРОГРЕССА
    if (isSaveRequest) {
      const finalBalance = balance !== undefined ? Math.round(Number(balance)) : 150;
      const gameStatePayload = opened_cases && typeof opened_cases === 'object' ? opened_cases : {};
      
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
    return res.status(200).json({ success: false, error: 'Исключение бэкенда: ' + err.message });
  }
}

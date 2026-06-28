import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function verifyTelegramData(initData: string, botToken: string): boolean {
  if (!initData) return false;
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
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { initData, isSaveRequest, balance, opened_cases } = req.body;
  const botToken = process.env.BOT_TOKEN!;

  if (!verifyTelegramData(initData, botToken)) {
    return res.status(401).json({ error: 'Попытка взлома! Подпись Telegram не совпадает.' });
  }

  const urlParams = new URLSearchParams(initData);
  const telegramId = JSON.parse(urlParams.get('user')!).id;

  try {
    // 1. ЕСЛИ ЭТО ЗАПРОС НА СОХРАНЕНИЕ
    if (isSaveRequest) {
      const { error } = await supabase
        .from('players')
        .update({
          balance: balance,
          opened_cases: opened_cases,
          updated_at: new Date().toISOString()
        })
        .eq('Telegram_id', telegramId);

      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    // 2. ЕСЛИ ЭТО ЗАПРОС НА ЗАГРУЗКУ (ИЛИ СТАНДАРТНЫЙ КЛИК)
    let { data: player } = await supabase
      .from('players')
      .select('balance, opened_cases')
      .eq('Telegram_id', telegramId)
      .single();

    if (!player) {
      // Регистрируем нового игрока
      const { data: newPlayer, error: insertError } = await supabase
        .from('players')
        .insert([{ Telegram_id: telegramId, balance: 150, opened_cases: {} }])
        .select()
        .single();
      
      if (insertError) throw insertError;
      player = newPlayer;
    }

    return res.status(200).json({
      success: true,
      balance: player.balance,
      opened_cases: player.opened_cases
    });

  } catch (err: any) {
    return res.status(500).json({ error: 'Ошибка базы данных', details: err.message });
  }
}

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
    console.error("Ошибка верификации данных Telegram");
    return res.status(401).json({ error: 'Подпись Telegram не совпадает.' });
  }

  const urlParams = new URLSearchParams(initData);
  const userRaw = urlParams.get('user');
  if (!userRaw) return res.status(400).json({ error: 'Данные пользователя пусты' });
  
  const telegramId = JSON.parse(userRaw).id;

  try {
    // 1. ЗАПРОС НА СОХРАНЕНИЕ
    if (isSaveRequest) {
      const finalBalance = Math.round(Number(balance));
      const finalCases = typeof opened_cases === 'object' ? opened_cases : {};

      const { error } = await supabase
        .from('players')
        .update({
          balance: finalBalance,
          opened_cases: finalCases
        })
        .eq('Telegram_id', telegramId); // Строго с большой буквы T, как в базе

      if (error) {
        console.error("Ошибка Supabase при сохранении:", error.message);
        return res.status(400).json({ error: error.message });
      }
      return res.status(200).json({ success: true });
    }

    // 2. ЗАПРОС НА ЗАГРУЗКУ
    let { data: player, error: selectError } = await supabase
      .from('players')
      .select('balance, opened_cases')
      .eq('Telegram_id', telegramId) // Строго с большой буквы T
      .maybeSingle();

    if (selectError) {
      console.error("Ошибка Supabase при выборе игрока:", selectError.message);
      return res.status(400).json({ error: selectError.message });
    }

    if (!player) {
      // Регистрируем нового игрока, если его нет в базе
      const { data: newPlayer, error: insertError } = await supabase
        .from('players')
        .insert([{ 
          Telegram_id: telegramId, // Строго с большой буквы T
          balance: 150, 
          opened_cases: {} 
        }])
        .select()
        .maybeSingle();
      
      if (insertError) {
        console.error("Ошибка Supabase при создании игрока:", insertError.message);
        return res.status(400).json({ error: insertError.message });
      }
      player = newPlayer;
    }

    return res.status(200).json({
      success: true,
      balance: player ? player.balance : 150,
      opened_cases: player ? player.opened_cases : {}
    });

  } catch (err: any) {
    console.error("Глобальная ошибка бэкенда:", err.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера', details: err.message });
  }
}

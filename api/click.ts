import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Инициализируем Supabase клиент с помощью супер-ключа (SERVICE_ROLE)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Именно этот ключ пробивает созданную нами защиту RLS
);

// Секретная функция Telegram для проверки, что запрос не подделан хакером
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
  // Разрешаем только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { initData } = req.body;
  const botToken = process.env.BOT_TOKEN;

  if (!botToken) {
    return res.status(500).json({ error: 'Сервер не настроен: отсутствует BOT_TOKEN' });
  }

  // 🔒 ЗАЩИТА 1: Проверяем цифровую подпись Telegram
  if (!verifyTelegramData(initData, botToken)) {
    return res.status(401).json({ error: 'Попытка взлома! Подпись Telegram не совпадает.' });
  }

  // Парсим данные юзера из проверенной строки Telegram
  const urlParams = new URLSearchParams(initData);
  const userRaw = urlParams.get('user');
  if (!userRaw) return res.status(400).json({ error: 'Данные пользователя пусты' });

  const tgUser = JSON.parse(userRaw);
  const telegramId = tgUser.id;

  try {
    // Запрашиваем текущего игрока из твоей таблицы
    let { data: player, error } = await supabase
      .from('players') // Имя твоей таблицы из Supabase
      .select('balance')
      .eq('telegram_id', telegramId) // Имя колонки с ID (у тебя на скрине Telegram_id или telegram_id)
      .single();

    // Если игрока еще нет в базе — автоматически регистрируем его
    if (!player) {
      const { data: newPlayer, error: insertError } = await supabase
        .from('players')
        .insert([{ telegram_id: telegramId, balance: 0 }])
        .select()
        .single();
      
      if (insertError) throw insertError;
      player = newPlayer;
    }

    // 🔒 ЗАЩИТА 2: Математику считает только сервер!
    // Никаких balance + 1 на фронтенде. Прибавляем фиксированную награду (например, +1 за клик)
    const reward = 1; 
    const newBalance = Number(player.balance) + reward;

    // Обновляем баланс в базе данных
    const { error: updateError } = await supabase
      .from('players')
      .update({ balance: newBalance, updated_at: new Date() })
      .eq('telegram_id', telegramId);

    if (updateError) throw updateError;

    // Возвращаем честный баланс на фронтенд
    return res.status(200).json({ success: true, balance: newBalance });

  } catch (err: any) {
    return res.status(500).json({ error: 'Ошибка базы данных', details: err.message });
  }
}

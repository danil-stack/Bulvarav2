import { createClient } from '@supabase/supabase-client';

// Инициализируем защищенное подключение к твоей базе const supabaseUrl = "https://donljbywsnzvsaykjnbo.supabase.co";
const supabaseUrl = "https://donljbywsnzvsaykjnbo.supabase.co";
const supabaseAnonKey = "sb_publishable_ygvu1F18sFSxpyS5hbZWWw_Lqxhzm7k";
const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default async function handler(req, res) {
  // Настройка CORS, чтобы Mini App мог делать запросы к бэкенду
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { telegram_id } = req.method === 'GET' ? req.query : req.body;

  if (!telegram_id) {
    return res.status(400).json({ error: 'Missing telegram_id' });
  }

  try {
    // 1. ЗАПРОС НА ПОЛУЧЕНИЕ ДАННЫХ ИГРОКА (GET)
    if (req.method === 'GET') {
      let { data: player, error } = await supabase
        .from('players')
        .select('*')
        .eq('telegram_id', telegram_id)
        .single();

      // Если игрока ещё нет в базе, автоматически регистрируем его с нуля
      if (!player) {
        const { data: newPlayer, error: createError } = await supabase
          .from('players')
          .insert([{ telegram_id: parseInt(telegram_id), balance: 0, opened_cases: [] }])
          .select()
          .single();

        if (createError) throw createError;
        return res.status(200).json(newPlayer);
      }

      if (error) throw error;
      return res.status(200).json(player);
    }

    // 2. ЗАПРОС НА СОХРАНЕНИЕ ДАННЫХ (POST)
    if (req.method === 'POST') {
      const { balance, opened_cases } = req.body;

      const { data, error } = await supabase
        .from('players')
        .upsert({ 
          telegram_id: parseInt(telegram_id), 
          balance: balance, 
          opened_cases: opened_cases || [],
          updated_at: new Date()
        })
        .select();

      if (error) throw error;
      return res.status(200).json({ success: true, data });
    }

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

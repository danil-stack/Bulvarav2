export function formatNumber(value: number): string {
  if (value < 1000) return value.toFixed(value % 1 === 0 ? 0 : 1);
  if (value < 1_000_000) return `${(value / 1000).toFixed(2).replace(/\.00$/, '')}K`;
  if (value < 1_000_000_000) return `${(value / 1_000_000).toFixed(2).replace(/\.00$/, '')}M`;
  return `${(value / 1_000_000_000).toFixed(2)}B`;
}

export function formatBulv(value: number): string {
  return formatNumber(Math.floor(value * 100) / 100);
}

export function formatDuration(ms: number, lang: 'ru' | 'en' = 'ru'): string {
  if (ms <= 0) return lang === 'ru' ? 'готово' : 'ready';
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}${lang === 'ru' ? 'ч' : 'h'} ${m}${lang === 'ru' ? 'м' : 'm'}`;
  if (m > 0) return `${m}${lang === 'ru' ? 'м' : 'm'} ${s}${lang === 'ru' ? 'с' : 's'}`;
  return `${s}${lang === 'ru' ? 'с' : 's'}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

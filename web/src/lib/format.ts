export function faNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const number = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(number)) return String(value);
  return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(number);
}

export function faDate(ts: number | null | undefined, withTime = true): string {
  if (!ts) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      dateStyle: 'medium',
      ...(withTime ? { timeStyle: 'short' } : {}),
      calendar: 'persian',
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleString('fa-IR');
  }
}

export function faDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function percent(value: number): string {
  return `${faNumber(Math.round(value * 10) / 10)}٪`;
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'همین حالا';
  if (minutes < 60) return `${faNumber(minutes)} دقیقه پیش`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${faNumber(hours)} ساعت پیش`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${faNumber(days)} روز پیش`;
  return faDate(ts, false);
}

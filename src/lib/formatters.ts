import { format, parseISO } from 'date-fns';
import { id as idLocale, enUS } from 'date-fns/locale';

export function formatCurrency(amount: number, locale: 'en' | 'id' = 'id'): string {
  return new Intl.NumberFormat(locale === 'id' ? 'id-ID' : 'en-US', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyShort(amount: number, locale: 'en' | 'id' = 'en'): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const dec = (n: number) => {
    const s = n.toFixed(1);
    return locale === 'id' ? s.replace('.', ',') : s;
  };
  if (abs >= 1_000_000_000)
    return `${sign}Rp ${dec(abs / 1_000_000_000)}${locale === 'id' ? 'M' : 'B'}`;
  if (abs >= 1_000_000) return `${sign}Rp ${dec(abs / 1_000_000)}${locale === 'id' ? 'jt' : 'M'}`;
  if (abs >= 1_000) return `${sign}Rp ${(abs / 1_000).toFixed(0)}${locale === 'id' ? 'rb' : 'K'}`;
  return `${sign}Rp ${abs}`;
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount);
}

export function formatDate(dateStr: string, locale: 'en' | 'id' = 'en'): string {
  const date = parseISO(dateStr);
  return format(date, 'd MMM yyyy', {
    locale: locale === 'id' ? idLocale : enUS,
  });
}

export function formatDateShort(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, 'd MMM');
}

export function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^\d]/g, '');
  return parseInt(cleaned, 10) || 0;
}

export function formatCurrencyInput(value: number): string {
  if (value === 0) return '';
  return new Intl.NumberFormat('id-ID').format(value);
}

const MONTH_NAMES_ID_FMT = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];
const DAY_NAMES_ID_FMT = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/** Format an ISO date string as "1 Januari 2026" */
export function formatDateID(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${day} ${MONTH_NAMES_ID_FMT[month - 1]} ${year}`;
}

/** Format a Date as "Senin, 1 Januari 2026, 14.30.00" */
export function formatDatetimeID(date: Date): string {
  const day = DAY_NAMES_ID_FMT[date.getDay()];
  const d = date.getDate();
  const m = MONTH_NAMES_ID_FMT[date.getMonth()];
  const y = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${day}, ${d} ${m} ${y}, ${hh}.${mm}.${ss}`;
}

/** Month names in Indonesian (0-based: 0 = Januari) */
export const MONTH_NAMES_ID = MONTH_NAMES_ID_FMT;

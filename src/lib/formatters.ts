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

export function formatCurrencyShort(amount: number): string {
  if (amount >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `Rp ${(amount / 1_000).toFixed(0)}K`;
  return `Rp ${amount}`;
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

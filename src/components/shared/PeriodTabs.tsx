'use client';

import { cn } from '@/lib/utils';
import { t, useLocale } from '@/lib/i18n';

export type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface PeriodTabsProps {
  variant: 'three' | 'four';
  value: Period;
  onChange: (next: Period) => void;
  className?: string;
}

const THREE: Period[] = ['daily', 'weekly', 'monthly'];
const FOUR: Period[] = ['daily', 'weekly', 'monthly', 'yearly'];

const KEY_MAP = {
  daily: 'periodDaily',
  weekly: 'periodWeekly',
  monthly: 'periodMonthly',
  yearly: 'periodYearly',
} as const;

export function PeriodTabs({ variant, value, onChange, className }: PeriodTabsProps) {
  const locale = useLocale();
  const items = variant === 'four' ? FOUR : THREE;
  return (
    <div role="tablist" className={cn('bg-secondary inline-flex w-full rounded-2xl p-1', className)}>
      {items.map((p) => {
        const active = p === value;
        return (
          <button
            key={p}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(p)}
            className={cn(
              'flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-brand-mint text-brand-mint-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t(locale, KEY_MAP[p])}
          </button>
        );
      })}
    </div>
  );
}

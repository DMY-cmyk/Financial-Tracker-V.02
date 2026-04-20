'use client';

import { PieChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

interface SplitBadgeProps {
  locale: Locale;
  className?: string;
}

export function SplitBadge({ locale, className }: SplitBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400',
        className
      )}
    >
      <PieChart className="h-2.5 w-2.5" />
      {t(locale, 'multipleCategoriesSplit')}
    </span>
  );
}

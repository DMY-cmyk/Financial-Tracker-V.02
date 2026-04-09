'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { fadeInUp } from '@/lib/motion';
import { t, useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { BudgetAlert } from '@/lib/budget-alerts';

interface BudgetAlertBannerProps {
  alerts: BudgetAlert[];
}

export function BudgetAlertBanner({ alerts }: BudgetAlertBannerProps) {
  const locale = useLocale();

  if (alerts.length === 0) return null;

  const exceededAlerts = alerts.filter((a) => a.level === 'exceeded');
  const hasExceeded = exceededAlerts.length > 0;

  const warningCount = alerts.filter((a) => a.level === 'warning').length;
  const exceededCount = exceededAlerts.length;

  const message = hasExceeded
    ? t(locale, 'categoriesOverBudget').replace('{n}', String(exceededCount))
    : t(locale, 'categoriesAtLimit').replace('{n}', String(warningCount));

  return (
    <motion.div
      {...fadeInUp}
      className={cn(
        'flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium',
        hasExceeded
          ? 'bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300'
          : 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300'
      )}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle
          className={cn('h-4 w-4 shrink-0', hasExceeded ? 'text-red-500' : 'text-amber-500')}
        />
        <span>{message}</span>
      </div>
      <Link
        href="/budget"
        className={cn(
          'ml-4 flex shrink-0 items-center gap-1 text-xs font-semibold underline-offset-2 hover:underline',
          hasExceeded ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'
        )}
      >
        {t(locale, 'viewBudget')}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </motion.div>
  );
}

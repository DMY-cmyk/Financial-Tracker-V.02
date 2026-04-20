'use client';

import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { fadeInUp, staggerList, staggerListItem } from '@/lib/motion';
import { t } from '@/lib/i18n';
import type { SpendingOutlier } from '@/lib/api/contracts';

interface OutlierAlertsProps {
  outliers: SpendingOutlier[];
  locale: 'en' | 'id';
}

const idrFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
});

function formatDate(dateStr: string, locale: 'en' | 'id'): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', {
    day: 'numeric',
    month: 'short',
  });
}

export function OutlierAlerts({ outliers, locale }: OutlierAlertsProps) {
  return (
    <motion.div
      {...fadeInUp}
      className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"
    >
      <h3 className="mb-4 text-sm font-semibold">{t(locale, 'unusualSpending')}</h3>

      {outliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          <p className="text-muted-foreground text-sm">{t(locale, 'noAnomalies')}</p>
        </div>
      ) : (
        <motion.div variants={staggerList} initial="hidden" animate="show" className="space-y-3">
          {outliers.map((outlier) => (
            <motion.div
              key={outlier.id}
              variants={staggerListItem}
              className="rounded-lg border border-l-[3px] border-slate-200 border-l-amber-500 bg-slate-50 p-3 dark:border-slate-700 dark:border-l-amber-500 dark:bg-slate-800/50"
            >
              <div className="flex items-start justify-between gap-3">
                {/* Left side: description + multiplier */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{outlier.description}</p>
                  <p className="text-muted-foreground text-xs">
                    {outlier.category} &middot; {formatDate(outlier.date, locale)}
                  </p>
                  <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                    {outlier.multiplier.toFixed(1)}&times; {t(locale, 'timesTypical')}{' '}
                    {outlier.category}
                  </p>
                </div>

                {/* Right side: amount + typical */}
                <div className="flex-shrink-0 text-right">
                  <p className="font-mono text-sm font-semibold text-red-500">
                    -{idrFormatter.format(outlier.amount)}
                  </p>
                  <p className="text-muted-foreground text-[10px]">
                    {t(locale, 'typicalSpend')}: {idrFormatter.format(outlier.categoryAvg)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

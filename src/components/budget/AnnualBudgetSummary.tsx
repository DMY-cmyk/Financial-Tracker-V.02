'use client';

import { TrendingUp, AlertTriangle, XCircle, Target } from 'lucide-react';
import { t, type Locale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import type { AnnualBudgetSummaryData } from '@/hooks/useAnnualBudget';

interface AnnualBudgetSummaryProps {
  summary: AnnualBudgetSummaryData;
  locale: Locale;
  isLoading: boolean;
}

export function AnnualBudgetSummary({ summary, locale, isLoading }: AnnualBudgetSummaryProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">{t(locale, 'annualSummary')}</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border bg-card p-4">
          <div className="mb-1 flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{t(locale, 'annualTotal')}</span>
          </div>
          <p className="font-mono text-lg font-semibold">
            {formatCurrency(summary.totalAnnualBudget)}
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {t(locale, 'spent')}: {formatCurrency(summary.totalAnnualSpent)}
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-4">
          <div className="mb-1 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-muted-foreground">{t(locale, 'categoriesOnTrack')}</span>
          </div>
          <p className="text-2xl font-semibold text-emerald-500">{summary.categoriesOnTrack}</p>
        </div>

        <div className="rounded-2xl border bg-card p-4">
          <div className="mb-1 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">{t(locale, 'categoriesAtRisk')}</span>
          </div>
          <p className="text-2xl font-semibold text-amber-500">{summary.categoriesAtRisk}</p>
        </div>

        <div className="rounded-2xl border bg-card p-4">
          <div className="mb-1 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-destructive" />
            <span className="text-xs text-muted-foreground">{t(locale, 'overBudgetLabel')}</span>
          </div>
          <p className="text-2xl font-semibold text-destructive">{summary.categoriesOver}</p>
        </div>
      </div>
    </div>
  );
}

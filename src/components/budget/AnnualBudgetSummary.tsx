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
      <div className="grid animate-pulse grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-muted h-20 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-muted-foreground text-sm font-medium">{t(locale, 'annualSummary')}</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bg-card rounded-2xl border p-4">
          <div className="mb-1 flex items-center gap-2">
            <Target className="text-muted-foreground h-4 w-4" />
            <span className="text-muted-foreground text-xs">{t(locale, 'annualTotal')}</span>
          </div>
          <p className="font-mono text-lg font-semibold">
            {formatCurrency(summary.totalAnnualBudget)}
          </p>
          <p className="text-muted-foreground mt-1 font-mono text-xs">
            {t(locale, 'spent')}: {formatCurrency(summary.totalAnnualSpent)}
          </p>
        </div>

        <div className="bg-card rounded-2xl border p-4">
          <div className="mb-1 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-muted-foreground text-xs">{t(locale, 'categoriesOnTrack')}</span>
          </div>
          <p className="text-2xl font-semibold text-emerald-500">{summary.categoriesOnTrack}</p>
        </div>

        <div className="bg-card rounded-2xl border p-4">
          <div className="mb-1 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-muted-foreground text-xs">{t(locale, 'categoriesAtRisk')}</span>
          </div>
          <p className="text-2xl font-semibold text-amber-500">{summary.categoriesAtRisk}</p>
        </div>

        <div className="bg-card rounded-2xl border p-4">
          <div className="mb-1 flex items-center gap-2">
            <XCircle className="text-destructive h-4 w-4" />
            <span className="text-muted-foreground text-xs">{t(locale, 'overBudgetLabel')}</span>
          </div>
          <p className="text-destructive text-2xl font-semibold">{summary.categoriesOver}</p>
        </div>
      </div>
    </div>
  );
}

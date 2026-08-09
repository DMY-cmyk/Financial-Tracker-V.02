'use client';

import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import type { NetWorthCurrent } from '@/lib/types';

interface AssetsListProps {
  current: NetWorthCurrent | null;
}

export function AssetsList({ current }: AssetsListProps) {
  const locale = useLocale();

  return (
    <div className="border-border bg-card rounded-2xl border p-5">
      <p className="text-muted-foreground mb-4 text-xs font-bold tracking-wide uppercase">
        {t(locale, 'assets')}
      </p>

      <p className="text-muted-foreground mb-1 text-[10px] font-semibold uppercase">
        {t(locale, 'paymentMethods')}
      </p>
      <div className="mb-3 flex justify-between text-sm">
        <span className="text-muted-foreground">{t(locale, 'nwAllAccounts')}</span>
        <span className="font-mono">
          {formatCurrency(current?.breakdown.paymentMethodBalances ?? 0)}
        </span>
      </div>

      <p className="text-muted-foreground mb-1 text-[10px] font-semibold uppercase">
        {t(locale, 'savingsGoals')}
      </p>
      <div className="mb-3 flex justify-between text-sm">
        <span className="text-muted-foreground">{t(locale, 'nwTotalSaved')}</span>
        <span className="font-mono">{formatCurrency(current?.breakdown.savingsGoals ?? 0)}</span>
      </div>

      <div className="border-border flex justify-between border-t pt-3 text-sm font-bold">
        <span>{t(locale, 'totalAssets')}</span>
        <span className="font-mono text-emerald-500">
          {formatCurrency(current?.totalAssets ?? 0)}
        </span>
      </div>
    </div>
  );
}

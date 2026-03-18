'use client';

import { useRouter } from 'next/navigation';
import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { useBalances } from './useBalances';
import { BalanceGrid } from './BalanceGrid';

export function AccountBalancesWidget() {
  const locale = useLocale();
  const router = useRouter();
  const { balances, totalBalance, isLoading } = useBalances();

  const handleCardClick = (paymentMethodName: string) => {
    const params = new URLSearchParams({
      paymentMethod: paymentMethodName,
      allMonths: 'true',
    });
    router.push(`/transactions?${params.toString()}`);
  };

  return (
    <div className="bg-card border-border rounded-2xl border p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">{t(locale, 'accountBalances')}</h3>
        <span className="text-muted-foreground font-mono text-sm font-medium">
          {formatCurrency(totalBalance)}
        </span>
      </div>
      <BalanceGrid
        balances={balances}
        locale={locale}
        isLoading={isLoading}
        onCardClick={handleCardClick}
      />
    </div>
  );
}

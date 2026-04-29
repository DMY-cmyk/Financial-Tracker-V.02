'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useStore } from '@/store';
import { FolderNavigator } from '@/components/folders/FolderNavigator';
import { useDueRecurring } from '@/features/dashboard/useDueRecurring';
import { RecurringDueBanner } from '@/features/dashboard/RecurringDueBanner';
import { useDashboardData } from '@/features/dashboard/useDashboardData';
import { useBudgetData } from '@/hooks/useBudgetData';
import { HeroHeader } from '@/components/layout/HeroHeader';
import { SavingsRingCard } from '@/components/dashboard/SavingsRingCard';
import { PeriodTabs, type Period } from '@/components/shared/PeriodTabs';
import { TransactionRowMobile } from '@/components/transactions/TransactionRowMobile';
import { t } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/types';

type TimeOfDay = 'Morning' | 'Afternoon' | 'Evening' | 'Night';
type SubgreetingKey =
  | 'homeSubgreetingMorning'
  | 'homeSubgreetingAfternoon'
  | 'homeSubgreetingEvening'
  | 'homeSubgreetingNight';
type CaptionKey =
  | 'homeBudgetCaptionUnder30'
  | 'homeBudgetCaptionUnder70'
  | 'homeBudgetCaptionUnder100'
  | 'homeBudgetCaptionAtLimit'
  | 'homeBudgetCaptionOver'
  | 'homeBudgetCaptionNoBudget';

function timeOfDay(d = new Date()): TimeOfDay {
  const h = d.getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  if (h < 20) return 'Evening';
  return 'Night';
}

function budgetCaptionKey(pct: number, hasBudget: boolean): CaptionKey {
  if (!hasBudget) return 'homeBudgetCaptionNoBudget';
  if (pct > 100) return 'homeBudgetCaptionOver';
  if (pct === 100) return 'homeBudgetCaptionAtLimit';
  if (pct >= 70) return 'homeBudgetCaptionUnder100';
  if (pct >= 30) return 'homeBudgetCaptionUnder70';
  return 'homeBudgetCaptionUnder30';
}

export default function DashboardPage() {
  const router = useRouter();
  const locale = useStore((s) => s.ui.locale);
  useKeyboardShortcuts({
    onNewTransaction: () => router.push('/transactions/new'),
  });

  const {
    dueItems,
    totalTransactions,
    totalIncome,
    totalExpense,
    generate,
    isGenerating,
    dismiss,
    hasDueItems,
  } = useDueRecurring();

  const { balance, expense, recentTransactions, categories } = useDashboardData();
  const { totalBudget, totalSpent } = useBudgetData();
  const [period, setPeriod] = useState<Period>('daily');

  const subgreetingKey: SubgreetingKey = `homeSubgreeting${timeOfDay()}` as SubgreetingKey;

  const hasBudget = totalBudget > 0;
  const pct = hasBudget ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const captionKey = budgetCaptionKey(pct, hasBudget);
  const captionRaw = t(locale, captionKey);
  const caption =
    captionKey === 'homeBudgetCaptionOver'
      ? captionRaw.replace('{amount}', formatCurrency(totalSpent - totalBudget))
      : captionRaw;

  const fiveRecent = (recentTransactions ?? []).slice(0, 5);
  const findCategory = (categoryId: string, fallbackName: string): Category => {
    const cat = (categories ?? []).find((c) => c.id === categoryId);
    return (
      cat ?? {
        id: categoryId,
        name: fallbackName,
        type: 'expense',
        color: '#888',
        icon: 'tag',
        budget: 0,
      }
    );
  };

  return (
    <>
      {/* Mobile composition — < 768px */}
      <div className="md:hidden">
        <HeroHeader
          title={t(locale, 'dashboard')}
          greeting={t(locale, 'homeGreeting')}
          subgreeting={t(locale, subgreetingKey)}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-hero-foreground/10 rounded-2xl p-3">
              <p className="text-[11px] opacity-80">{t(locale, 'homeTotalBalance')}</p>
              <p className="font-mono text-base font-bold">{formatCurrency(balance)}</p>
            </div>
            <div className="bg-hero-foreground/10 rounded-2xl p-3">
              <p className="text-[11px] opacity-80">{t(locale, 'homeTotalExpense')}</p>
              <p className="text-destructive font-mono text-base font-bold">
                -{formatCurrency(expense)}
              </p>
            </div>
          </div>
          {hasBudget && (
            <div className="mt-3">
              <div className="bg-hero-foreground/10 h-2 w-full overflow-hidden rounded-full">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    pct > 100 ? 'bg-destructive' : 'bg-hero-foreground',
                  )}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          )}
          <p className="mt-2 text-[11px] opacity-90">{caption}</p>
        </HeroHeader>

        <div className="bg-background -mt-6 rounded-t-3xl px-4 pt-6 pb-24">
          <SavingsRingCard />

          <div className="mt-5">
            <PeriodTabs variant="three" value={period} onChange={setPeriod} />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">{t(locale, 'recentTransactions')}</h2>
            <Link href="/transactions" className="text-primary text-xs">
              {t(locale, 'txSeeAll')}
            </Link>
          </div>

          <div className="mt-2 space-y-1">
            {fiveRecent.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-xs">
                {t(locale, 'txEmpty')}
              </p>
            ) : (
              fiveRecent.map((tx) => (
                <TransactionRowMobile
                  key={tx.id}
                  transaction={tx}
                  category={findCategory(tx.categoryId, tx.category)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Desktop composition — >= 768px (existing behavior, unchanged) */}
      <div className="hidden md:block">
        <HeroHeader title={t(locale, 'dashboard')} />
        <div className="mx-auto max-w-7xl">
          <AnimatePresence>
            {hasDueItems && (
              <div className="mb-4 px-0">
                <RecurringDueBanner
                  dueItems={dueItems}
                  totalTransactions={totalTransactions}
                  totalIncome={totalIncome}
                  totalExpense={totalExpense}
                  onGenerate={generate}
                  onDismiss={dismiss}
                  isGenerating={isGenerating}
                  locale={locale}
                />
              </div>
            )}
          </AnimatePresence>
        </div>
        <FolderNavigator />
      </div>
    </>
  );
}

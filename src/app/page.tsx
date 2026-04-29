'use client';

import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useStore } from '@/store';
import { FolderNavigator } from '@/components/folders/FolderNavigator';
import { useDueRecurring } from '@/features/dashboard/useDueRecurring';
import { RecurringDueBanner } from '@/features/dashboard/RecurringDueBanner';
import { HeroHeader } from '@/components/layout/HeroHeader';
import { t } from '@/lib/i18n';

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

  return (
    <>
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
    </>
  );
}

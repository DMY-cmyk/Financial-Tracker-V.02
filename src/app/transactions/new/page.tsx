'use client';

import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { t, useLocale } from '@/lib/i18n';

export default function NewTransactionPage() {
  const router = useRouter();
  const locale = useLocale();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader title={t(locale, 'addTransaction')} />
      <div className="rounded-2xl border border-border bg-card p-6">
        <TransactionForm onClose={() => router.push('/transactions')} />
      </div>
    </div>
  );
}

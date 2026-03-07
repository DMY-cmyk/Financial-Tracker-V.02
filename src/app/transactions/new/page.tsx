'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { t, useLocale } from '@/lib/i18n';
import { ArrowLeft } from 'lucide-react';

export default function NewTransactionPage() {
  const router = useRouter();
  const locale = useLocale();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href="/transactions"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Transactions
        </Link>
        <PageHeader
          title={t(locale, 'addTransaction')}
          description="Record a new income or expense transaction"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <TransactionForm onClose={() => router.push('/transactions')} />
      </div>
    </div>
  );
}

'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/layout/PageHeader';
import { TransactionForm } from '@/features/transactions/TransactionForm';
import { resolveInitialType } from '@/features/transactions/initial-type';
import { t, useLocale } from '@/lib/i18n';
import { fadeInUp } from '@/lib/motion';
import { ArrowLeft } from 'lucide-react';

function NewTransactionContent() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const initialType = resolveInitialType(searchParams.get('type'));

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <motion.div {...fadeInUp}>
        <Link
          href="/transactions"
          className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t(locale, 'backToTransactions')}
        </Link>
        <PageHeader
          title={t(locale, 'addTransaction')}
          description={t(locale, 'recordTransaction')}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="border-border bg-card shadow-card rounded-2xl border p-4 sm:p-6"
      >
        <TransactionForm initialType={initialType} onClose={() => router.push('/transactions')} />
      </motion.div>
    </div>
  );
}

export default function NewTransactionPage() {
  return (
    <Suspense fallback={null}>
      <NewTransactionContent />
    </Suspense>
  );
}

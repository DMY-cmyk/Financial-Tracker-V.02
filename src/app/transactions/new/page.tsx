'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/layout/PageHeader';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { t, useLocale } from '@/lib/i18n';
import { fadeInUp } from '@/lib/motion';
import { ArrowLeft } from 'lucide-react';

export default function NewTransactionPage() {
  const router = useRouter();
  const locale = useLocale();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <motion.div {...fadeInUp}>
        <Link
          href="/transactions"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {locale === 'id' ? 'Kembali ke Transaksi' : 'Back to Transactions'}
        </Link>
        <PageHeader
          title={t(locale, 'addTransaction')}
          description={locale === 'id' ? 'Catat transaksi baru' : 'Record a new income or expense transaction'}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="rounded-2xl border border-border bg-card p-4 sm:p-6"
      >
        <TransactionForm onClose={() => router.push('/transactions')} />
      </motion.div>
    </div>
  );
}

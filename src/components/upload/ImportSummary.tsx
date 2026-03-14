'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { t, useLocale } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { fadeInUp, scaleIn } from '@/lib/motion';

interface ImportSummaryProps {
  created: number;
  duplicates: number;
  failed: number;
  errors: { index: number; message: string }[];
  onReset: () => void;
}

export function ImportSummary({ created, duplicates, failed, errors, onReset }: ImportSummaryProps) {
  const locale = useLocale();
  const hasSuccess = created > 0;

  return (
    <motion.div {...fadeInUp} className="border-border bg-card rounded-2xl border p-8">
      <div className="flex flex-col items-center gap-4">
        {/* Status Icon */}
        <motion.div {...scaleIn}>
          {hasSuccess ? (
            <CheckCircle2 className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
          )}
        </motion.div>

        {/* Title */}
        <h3 className="text-lg font-semibold">{t(locale, 'importComplete')}</h3>

        {/* Counts */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
          {created > 0 && (
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {created} {t(locale, 'transactionsCreated')}
            </span>
          )}
          {failed > 0 && (
            <span className="font-medium text-red-600 dark:text-red-400">
              {failed} {t(locale, 'transactionsFailed')}
            </span>
          )}
          {duplicates > 0 && (
            <span className="font-medium text-amber-600 dark:text-amber-400">
              {duplicates} {t(locale, 'duplicatesSkipped')}
            </span>
          )}
        </div>

        {/* Error Details */}
        {errors.length > 0 && (
          <div className="bg-muted/50 mt-2 max-h-40 w-full max-w-md overflow-y-auto rounded-xl p-3">
            <div className="space-y-1.5">
              {errors.map((err) => (
                <p
                  key={err.index}
                  className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400"
                >
                  <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>
                    {t(locale, 'row')} {err.index}: {err.message}
                  </span>
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-2 flex gap-3">
          <Button variant="outline" onClick={onReset}>
            {t(locale, 'importMore')}
          </Button>
          <Link href="/transactions">
            <Button>{t(locale, 'viewTransactions')}</Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

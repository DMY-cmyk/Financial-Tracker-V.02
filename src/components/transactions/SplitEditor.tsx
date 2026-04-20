'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Plus, PieChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { Category, TransactionSplitInput } from '@/lib/types';
import { SplitLineRow } from './SplitLineRow';
import { fadeInUp } from '@/lib/motion';

interface SplitEditorProps {
  splits: TransactionSplitInput[];
  totalAmount: number;
  categories: Category[];
  transactionType: 'income' | 'expense';
  locale: Locale;
  onChange: (splits: TransactionSplitInput[]) => void;
  onRemoveSplit: () => void;
}

export function SplitEditor({
  splits,
  totalAmount,
  categories,
  transactionType,
  locale,
  onChange,
  onRemoveSplit,
}: SplitEditorProps) {
  const allocated = splits.reduce((sum, s) => sum + s.amount, 0);
  const remaining = totalAmount - allocated;
  const isBalanced = Math.abs(remaining) <= 1;

  function handleChange(index: number, updated: TransactionSplitInput) {
    const next = splits.map((s, i) => (i === index ? updated : s));
    onChange(next);
  }

  function handleRemove(index: number) {
    onChange(splits.filter((_, i) => i !== index));
  }

  function handleAddLine() {
    onChange([...splits, { categoryId: null, category: '', amount: 0, description: null }]);
  }

  const remainingColor = isBalanced
    ? 'text-emerald-600 dark:text-emerald-400'
    : remaining < 0
      ? 'text-red-600 dark:text-red-400'
      : 'text-amber-600 dark:text-amber-400';

  const fmt = (n: number) => 'Rp ' + Math.abs(n).toLocaleString('id-ID');

  return (
    <motion.div
      {...fadeInUp}
      className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30"
    >
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-xl border-b border-blue-200 bg-blue-100 px-3 py-2 dark:border-blue-900 dark:bg-blue-900/40">
        <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-blue-700 uppercase dark:text-blue-300">
          <PieChart className="h-3 w-3" />
          {t(locale, 'splitAllocation')}
        </span>
        <button
          type="button"
          onClick={onRemoveSplit}
          className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400"
        >
          {t(locale, 'removeSplit')}
        </button>
      </div>

      {/* Lines */}
      <div className="space-y-2 p-3">
        <AnimatePresence initial={false}>
          {splits.map((split, i) => (
            <SplitLineRow
              key={i}
              index={i}
              split={split}
              categories={categories}
              transactionType={transactionType}
              locale={locale}
              onChange={handleChange}
              onRemove={handleRemove}
            />
          ))}
        </AnimatePresence>

        <button
          type="button"
          onClick={handleAddLine}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
        >
          <Plus className="h-3.5 w-3.5" />
          {t(locale, 'addSplit')}
        </button>

        {/* Running total */}
        <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs dark:border-blue-800 dark:bg-blue-950/50">
          <span className="text-muted-foreground">
            Total:{' '}
            <span className="text-foreground font-mono font-semibold">{fmt(totalAmount)}</span>
          </span>
          <span className="text-muted-foreground">
            Allocated:{' '}
            <span className="text-foreground font-mono font-semibold">{fmt(allocated)}</span>
          </span>
          <span className={cn('font-semibold', remainingColor)}>
            {t(locale, 'remainingAmount')}: {remaining === 0 ? '✓ 0' : fmt(remaining)}
          </span>
        </div>

        {splits.length === 1 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {t(locale, 'totalMustMatch')}
          </p>
        )}
      </div>
    </motion.div>
  );
}

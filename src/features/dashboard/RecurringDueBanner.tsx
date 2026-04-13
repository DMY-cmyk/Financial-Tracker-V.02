'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { fadeInUp, staggerList, staggerListItem, tapScale } from '@/lib/motion';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { DueItem, GenerateResult } from '@/lib/api/contracts';

const MAX_VISIBLE = 5;

const idrFormat = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
});

type BannerState = 'showing' | 'generating' | 'success';

interface RecurringDueBannerProps {
  dueItems: DueItem[];
  totalTransactions: number;
  totalIncome: number;
  totalExpense: number;
  onGenerate: () => Promise<GenerateResult>;
  onDismiss: () => void;
  isGenerating: boolean;
  locale: 'en' | 'id';
}

export function RecurringDueBanner({
  dueItems,
  totalTransactions,
  totalIncome,
  totalExpense,
  onGenerate,
  onDismiss,
  isGenerating,
  locale,
}: RecurringDueBannerProps) {
  const [state, setState] = useState<BannerState>('showing');
  const [expanded, setExpanded] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);

  // Sync external isGenerating state
  useEffect(() => {
    if (isGenerating && state === 'showing') {
      setState('generating');
    }
  }, [isGenerating, state]);

  // Auto-dismiss after success
  useEffect(() => {
    if (state !== 'success') return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 2000);
    return () => clearTimeout(timer);
  }, [state, onDismiss]);

  const handleGenerate = useCallback(async () => {
    setState('generating');
    try {
      const generateResult = await onGenerate();
      setResult(generateResult);
      setState('success');
      toast.success(
        `${generateResult.generated} ${t(locale, 'transactionsGenerated')}`
      );
    } catch {
      toast.error(t(locale, 'failedGenerate'));
      setState('showing');
    }
  }, [onGenerate, locale]);

  // HIDDEN state: no due items
  if (dueItems.length === 0) {
    return null;
  }

  const visibleItems = expanded ? dueItems : dueItems.slice(0, MAX_VISIBLE);
  const overflowCount = dueItems.length - MAX_VISIBLE;
  const hasOverflow = dueItems.length > MAX_VISIBLE;

  // SUCCESS state
  if (state === 'success' && result) {
    return (
      <motion.div
        {...fadeInUp}
        role="region"
        aria-label={t(locale, 'recurringDue')}
        aria-live="polite"
        className={cn(
          'overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 sm:p-5',
          'dark:border-emerald-800/50 dark:from-emerald-950/40 dark:to-emerald-900/20'
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
              {result.generated} {t(locale, 'transactionsGenerated')}
            </p>
            <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
              <span className="text-emerald-700 dark:text-emerald-300">
                {t(locale, 'income')}: +{idrFormat.format(result.totalIncome)}
              </span>
              <span className="text-red-600 dark:text-red-400">
                {t(locale, 'expense')}: -{idrFormat.format(result.totalExpense)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // SHOWING / GENERATING state
  const isDisabled = state === 'generating';

  return (
    <AnimatePresence mode="wait">
      <motion.div
        {...fadeInUp}
        role="region"
        aria-label={t(locale, 'recurringDue')}
        aria-busy={isDisabled}
        className={cn(
          'overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/50 p-4 sm:p-5',
          'dark:border-slate-700 dark:from-slate-800 dark:to-slate-950'
        )}
      >
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 dark:bg-amber-500/20">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t(locale, 'recurringDue')}
              </h3>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {totalTransactions} {t(locale, 'recurringDueDesc')}
              </p>
            </div>
          </div>

          {/* Actions — stack on mobile, row on desktop */}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              disabled={isDisabled}
            >
              {t(locale, 'dismiss')}
            </Button>
            <motion.div whileTap={tapScale}>
              <Button
                variant="default"
                size="sm"
                onClick={handleGenerate}
                disabled={isDisabled}
                className="w-full sm:w-auto"
              >
                {isDisabled ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t(locale, 'generating')}
                  </>
                ) : (
                  t(locale, 'generateAll')
                )}
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Item List */}
        <motion.ul
          className="mt-3 space-y-1.5"
          variants={staggerList}
          initial="hidden"
          animate="show"
          role="list"
        >
          {visibleItems.map((item) => (
            <motion.li
              key={item.id}
              variants={staggerListItem}
              className={cn(
                'flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm',
                'bg-white/60 dark:bg-white/5'
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                {/* Type indicator dot */}
                <span
                  className={cn(
                    'h-2 w-2 shrink-0 rounded-full',
                    item.type === 'income'
                      ? 'bg-emerald-500'
                      : 'bg-red-500'
                  )}
                  aria-hidden="true"
                />
                <span className="truncate text-slate-800 dark:text-slate-200">
                  {item.description}
                </span>
                {item.overdueCount > 1 && (
                  <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    &times;{item.overdueCount}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'shrink-0 font-mono text-xs tabular-nums',
                  item.type === 'income'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                )}
              >
                {item.type === 'income' ? '+' : '-'}
                {idrFormat.format(item.totalAmount)}
              </span>
            </motion.li>
          ))}
        </motion.ul>

        {/* Overflow toggle */}
        {hasOverflow && (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className={cn(
              'mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium',
              'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30',
              'transition-colors'
            )}
          >
            {expanded ? (
              <>
                {t(locale, 'showLess')}
                <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                +{overflowCount} {t(locale, 'moreRules')} &mdash; {t(locale, 'showAll')}
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        )}

        {/* Totals summary row */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-200/80 pt-3 text-xs dark:border-slate-700/60">
          <span className="text-emerald-700 dark:text-emerald-400">
            {t(locale, 'income')}: +{idrFormat.format(totalIncome)}
          </span>
          <span className="text-red-600 dark:text-red-400">
            {t(locale, 'expense')}: -{idrFormat.format(totalExpense)}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

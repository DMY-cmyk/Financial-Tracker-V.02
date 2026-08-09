'use client';

import { motion } from 'framer-motion';
import { Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrencyShort } from '@/lib/formatters';
import { tapScale, hoverLift, staggerGridItem } from '@/lib/motion';
import { t, useLocale } from '@/lib/i18n';

interface FolderCardProps {
  label: string;
  count: number;
  income: number;
  expense: number;
  isCurrentPeriod: boolean;
  onClick: () => void;
}

export function FolderCard({
  label,
  count,
  income,
  expense,
  isCurrentPeriod,
  onClick,
}: FolderCardProps) {
  const locale = useLocale();
  const isEmpty = count === 0;

  return (
    <motion.button
      variants={staggerGridItem}
      whileHover={hoverLift}
      whileTap={tapScale}
      onClick={onClick}
      className={cn(
        'border-border bg-card flex w-full flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-shadow hover:shadow-md',
        isCurrentPeriod && 'ring-primary/20 bg-primary/5 ring-2',
        isEmpty && 'opacity-60'
      )}
    >
      <div className="flex w-full items-center justify-between">
        {isCurrentPeriod ? (
          <FolderOpen className="text-primary h-6 w-6" />
        ) : (
          <Folder
            className={cn('h-6 w-6', isEmpty ? 'text-muted-foreground/50' : 'text-primary/70')}
          />
        )}
        {count > 0 && (
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium">
            {count} {t(locale, 'folderTransactions')}
          </span>
        )}
      </div>

      <div>
        <p className="text-lg font-semibold">{label}</p>
        {isEmpty ? (
          <p className="text-muted-foreground text-xs">{t(locale, 'noDataYet')}</p>
        ) : (
          <div className="mt-1 flex items-center gap-3">
            <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
              +{formatCurrencyShort(income, locale)}
            </span>
            <span className="font-mono text-xs text-red-600 dark:text-red-400">
              -{formatCurrencyShort(expense, locale)}
            </span>
          </div>
        )}
      </div>
    </motion.button>
  );
}

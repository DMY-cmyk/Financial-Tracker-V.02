'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SearchX } from 'lucide-react';
import { t, useLocale } from '@/lib/i18n';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function EmptyState({ title, description, icon, className, children }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn('flex flex-col items-center justify-center py-12 text-center', className)}
    >
      {icon && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1, type: 'spring', stiffness: 200 }}
          className="text-muted-foreground/40 mb-4"
        >
          {icon}
        </motion.div>
      )}
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="text-muted-foreground text-base font-medium"
      >
        {title}
      </motion.h3>
      {description && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="text-muted-foreground/70 mt-1 max-w-sm text-sm"
        >
          {description}
        </motion.p>
      )}
      {children && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="mt-4"
        >
          {children}
        </motion.div>
      )}
    </motion.div>
  );
}

interface NoResultsProps {
  message?: string;
  onClear?: () => void;
  clearLabel?: string;
  className?: string;
}

export function NoResults({ message, onClear, clearLabel, className }: NoResultsProps) {
  const locale = useLocale();

  return (
    <div className={cn('flex flex-col items-center justify-center py-10 text-center', className)}>
      <SearchX className="text-muted-foreground/40 mb-3 h-10 w-10" />
      <p className="text-muted-foreground text-sm font-medium">
        {message ?? t(locale, 'noResults')}
      </p>
      {onClear && (
        <button onClick={onClear} className="text-primary mt-2 text-xs font-medium hover:underline">
          {clearLabel ?? t(locale, 'clearFilters')}
        </button>
      )}
    </div>
  );
}

interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function InlineError({ message, onRetry, retryLabel, className }: InlineErrorProps) {
  const locale = useLocale();

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 py-8 text-center dark:border-red-900/50 dark:bg-red-950/20',
        className
      )}
    >
      <p className="text-sm font-medium text-red-600 dark:text-red-400">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
        >
          {retryLabel ?? t(locale, 'tryAgain')}
        </button>
      )}
    </div>
  );
}

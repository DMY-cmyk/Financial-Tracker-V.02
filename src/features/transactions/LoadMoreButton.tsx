'use client';

import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { t, useLocale } from '@/lib/i18n';
import { tapScale } from '@/lib/motion';

interface LoadMoreButtonProps {
  hasMore: boolean;
  isLoadingMore: boolean;
  total: number;
  loadedCount: number;
  onLoadMore: () => void;
}

export function LoadMoreButton({
  hasMore,
  isLoadingMore,
  total,
  loadedCount,
  onLoadMore,
}: LoadMoreButtonProps) {
  const locale = useLocale();

  if (total === 0) return null;

  const remaining = total - loadedCount;

  return (
    <div className="flex flex-col items-center gap-2 py-4">
      {hasMore ? (
        <motion.div whileTap={tapScale}>
          <Button variant="outline" onClick={onLoadMore} disabled={isLoadingMore} className="gap-2">
            {isLoadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t(locale, 'loading')}
              </>
            ) : (
              `${t(locale, 'loadMore')} 50 (${remaining} ${t(locale, 'remaining')})`
            )}
          </Button>
        </motion.div>
      ) : (
        <p className="text-muted-foreground text-sm">
          {t(locale, 'allLoaded')} ({total})
        </p>
      )}
    </div>
  );
}

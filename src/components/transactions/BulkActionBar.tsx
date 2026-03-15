'use client';

import { motion } from 'framer-motion';
import { slideUpBar } from '@/lib/motion';
import { t, useLocale } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Trash2, X } from 'lucide-react';

interface BulkActionBarProps {
  count: number;
  onClear: () => void;
  onDelete: () => void;
}

export function BulkActionBar({ count, onClear, onDelete }: BulkActionBarProps) {
  const locale = useLocale();

  return (
    <motion.div
      {...slideUpBar}
      className="fixed right-4 bottom-20 left-4 z-40 lg:right-6 lg:bottom-6 lg:left-auto"
    >
      <div className="bg-card flex items-center gap-3 rounded-2xl border p-3 shadow-lg">
        <span className="text-sm font-medium">
          {count} {t(locale, 'selected')}
        </span>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={onClear} className="gap-1.5">
          <X className="h-4 w-4" />
          {t(locale, 'clear')}
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete} className="gap-1.5">
          <Trash2 className="h-4 w-4" />
          {t(locale, 'delete')}
        </Button>
      </div>
    </motion.div>
  );
}

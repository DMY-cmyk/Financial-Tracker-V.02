'use client';

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { t, useLocale } from '@/lib/i18n';
import { Progress } from '@/components/ui/progress';
import { fadeInUp } from '@/lib/motion';

interface ImportProgressProps {
  current: number;
  total: number;
}

export function ImportProgress({ current, total }: ImportProgressProps) {
  const locale = useLocale();
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <motion.div
      {...fadeInUp}
      className="border-border bg-card rounded-2xl border p-8"
    >
      <div className="flex flex-col items-center gap-5">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="text-primary h-10 w-10" />
        </motion.div>

        <div className="w-full max-w-xs space-y-3">
          <Progress value={percentage} />

          <div className="text-center">
            <p className="text-sm font-medium">
              {t(locale, 'importingData')} {current} / {total}
            </p>
            <p className="text-muted-foreground mt-1 font-mono text-xs">{percentage}%</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

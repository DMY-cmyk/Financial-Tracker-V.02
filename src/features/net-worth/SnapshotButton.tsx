'use client';

import { t, useLocale } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import type { NetWorthSnapshot } from '@/lib/types';

interface SnapshotButtonProps {
  history: NetWorthSnapshot[];
  isRecording: boolean;
  onRecord: () => Promise<void>;
}

export function SnapshotButton({ history, isRecording, onRecord }: SnapshotButtonProps) {
  const locale = useLocale();

  const now = new Date();
  const currentMonthSnap = history.find(
    (s) => s.month === now.getMonth() && s.year === now.getFullYear()
  );

  return (
    <div className="border-border bg-card flex items-center justify-between rounded-2xl border p-5">
      <div>
        <p className="text-sm font-semibold">{t(locale, 'nwRecordThisMonth')}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {currentMonthSnap
            ? `${t(locale, 'nwLastRecorded')}: ${new Date(
                currentMonthSnap.createdAt
              ).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}`
            : t(locale, 'nwNoSnapshotThisMonth')}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={isRecording}
        onClick={onRecord}
        className="gap-2"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isRecording ? 'animate-spin' : ''}`} />
        {t(locale, 'recordSnapshot')}
      </Button>
    </div>
  );
}

'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { t, useLocale } from '@/lib/i18n';
import { type ExportFormat } from '@/lib/types';

export interface ExportOptionsState {
  groupByDate: boolean;
  expandSplits: boolean;
}

interface ExportOptionsProps {
  options: ExportOptionsState;
  onChange: (options: ExportOptionsState) => void;
  format: ExportFormat;
}

export function ExportOptions({ options, onChange, format }: ExportOptionsProps) {
  const locale = useLocale();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Checkbox
          id="group-by-date"
          checked={options.groupByDate}
          onCheckedChange={(checked) => onChange({ ...options, groupByDate: checked === true })}
        />
        <Label htmlFor="group-by-date" className="cursor-pointer text-sm">
          {t(locale, 'groupByDate')}
        </Label>
      </div>
      {format === 'csv' && (
        <div className="flex items-center gap-3">
          <Checkbox
            id="expand-splits"
            checked={options.expandSplits}
            onCheckedChange={(checked) => onChange({ ...options, expandSplits: checked === true })}
          />
          <Label htmlFor="expand-splits" className="cursor-pointer text-sm">
            {t(locale, 'expandSplits')}
          </Label>
        </div>
      )}
    </div>
  );
}

'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export interface ExportOptionsState {
  includeSummary: boolean;
  groupByDate: boolean;
}

interface ExportOptionsProps {
  options: ExportOptionsState;
  onChange: (options: ExportOptionsState) => void;
}

export function ExportOptions({ options, onChange }: ExportOptionsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Checkbox
          id="include-summary"
          checked={options.includeSummary}
          onCheckedChange={(checked) => onChange({ ...options, includeSummary: checked === true })}
        />
        <Label htmlFor="include-summary" className="cursor-pointer text-sm">
          Include summary totals
        </Label>
      </div>
      <div className="flex items-center gap-3">
        <Checkbox
          id="group-by-date"
          checked={options.groupByDate}
          onCheckedChange={(checked) => onChange({ ...options, groupByDate: checked === true })}
        />
        <Label htmlFor="group-by-date" className="cursor-pointer text-sm">
          Group by date
        </Label>
      </div>
    </div>
  );
}

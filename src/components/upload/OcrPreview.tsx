'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Category } from '@/lib/types';
import { t, useLocale } from '@/lib/i18n';

export interface OcrData {
  amount: string;
  description: string;
  date: string;
  category: string;
}

interface OcrPreviewProps {
  data: OcrData;
  onChange: (data: OcrData) => void;
  onSave: () => void;
  categories: Category[];
}

export function OcrPreview({ data, onChange, onSave, categories }: OcrPreviewProps) {
  const locale = useLocale();
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  return (
    <div className="space-y-4">
      <div>
        <Label>{t(locale, 'amount')}</Label>
        <div className="relative mt-1">
          <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 font-mono text-sm">
            Rp
          </span>
          <Input
            value={data.amount}
            onChange={(e) => onChange({ ...data, amount: e.target.value })}
            className="pl-10 font-mono"
          />
        </div>
      </div>
      <div>
        <Label>{t(locale, 'description')}</Label>
        <Input
          value={data.description}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          className="mt-1"
        />
      </div>
      <div>
        <Label>{t(locale, 'date')}</Label>
        <Input
          type="date"
          value={data.date}
          onChange={(e) => onChange({ ...data, date: e.target.value })}
          className="mt-1"
        />
      </div>
      <div>
        <Label>{t(locale, 'category')}</Label>
        <select
          value={data.category}
          onChange={(e) => onChange({ ...data, category: e.target.value })}
          className="border-input bg-background mt-1 w-full rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Select...</option>
          {expenseCategories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <Button onClick={onSave} className="w-full">
        {t(locale, 'save')} Transaction
      </Button>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { t, useLocale } from '@/lib/i18n';
import type { BudgetSuggestion } from '@/lib/api/contracts';

interface BudgetSuggestionRowProps {
  suggestion: BudgetSuggestion;
  value: number;
  onChange: (categoryId: string, value: number) => void;
}

export function BudgetSuggestionRow({ suggestion, value, onChange }: BudgetSuggestionRowProps) {
  const locale = useLocale();
  const [inputValue, setInputValue] = useState(String(value));

  const handleChange = (raw: string) => {
    setInputValue(raw);
    const num = parseFloat(raw.replace(/[^0-9]/g, ''));
    if (!isNaN(num)) onChange(suggestion.categoryId, num);
  };

  const basedOnText =
    suggestion.basedOnMonths > 0
      ? t(locale, 'suggestionsBasedOn').replace('{n}', String(suggestion.basedOnMonths))
      : t(locale, 'notEnoughData');

  return (
    <div className="border-border flex items-center gap-3 border-b py-3 last:border-0">
      <div
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: suggestion.color }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{suggestion.category}</p>
        <p className="text-muted-foreground text-xs">{basedOnText}</p>
      </div>
      <div className="w-36 shrink-0">
        <Input
          value={inputValue}
          onChange={(e) => handleChange(e.target.value)}
          className="text-right font-mono text-sm"
          inputMode="numeric"
        />
      </div>
    </div>
  );
}

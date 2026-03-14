'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { Input } from '@/components/ui/input';
import { t, useLocale } from '@/lib/i18n';
import { Search } from 'lucide-react';
import type { Category, PaymentMethod } from '@/lib/types';

interface TransactionFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  typeFilter: 'all' | 'income' | 'expense';
  onTypeChange: (v: 'all' | 'income' | 'expense') => void;
  categoryFilter: string;
  onCategoryChange: (v: string) => void;
  paymentMethodFilter?: string;
  onPaymentMethodChange?: (v: string) => void;
  paymentMethods?: PaymentMethod[];
  allMonths?: boolean;
  onAllMonthsChange?: (v: boolean) => void;
}

export function TransactionFilters({
  search,
  onSearchChange,
  typeFilter,
  onTypeChange,
  categoryFilter,
  onCategoryChange,
  paymentMethodFilter = '',
  onPaymentMethodChange,
  paymentMethods = [],
  allMonths = false,
  onAllMonthsChange,
}: TransactionFiltersProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const locale = useLocale();

  useEffect(() => {
    api.categories.list().then((result) => {
      if (result.data) setCategories(result.data.categories);
    });
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[200px] flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder={`${t(locale, 'search')}...`}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="border-border flex rounded-lg border">
        {(['all', 'income', 'expense'] as const).map((type) => (
          <button
            key={type}
            onClick={() => onTypeChange(type)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-lg last:rounded-r-lg ${
              typeFilter === type
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {type === 'all' ? t(locale, 'all') : t(locale, type)}
          </button>
        ))}
      </div>

      <select
        value={categoryFilter}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="border-border bg-card rounded-lg border px-3 py-1.5 text-xs"
        aria-label={`${t(locale, 'filter')} ${t(locale, 'categories')}`}
      >
        <option value="">
          {t(locale, 'all')} {t(locale, 'categories')}
        </option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {onPaymentMethodChange && paymentMethods.length > 0 && (
        <select
          value={paymentMethodFilter}
          onChange={(e) => onPaymentMethodChange(e.target.value)}
          className="border-border bg-card rounded-lg border px-3 py-1.5 text-xs"
          aria-label={`${t(locale, 'filter')} ${t(locale, 'paymentMethod')}`}
        >
          <option value="">
            {t(locale, 'all')} {t(locale, 'paymentMethod')}
          </option>
          {paymentMethods.map((pm) => (
            <option key={pm.id} value={pm.name}>
              {pm.name}
            </option>
          ))}
        </select>
      )}

      {onAllMonthsChange && (
        <button
          onClick={() => onAllMonthsChange(!allMonths)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            allMonths
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:bg-muted'
          }`}
        >
          {t(locale, 'allMonths')}
        </button>
      )}
    </div>
  );
}

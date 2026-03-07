'use client';

import { useStore } from '@/store';
import { Input } from '@/components/ui/input';
import { t, useLocale } from '@/lib/i18n';
import { Search } from 'lucide-react';

interface TransactionFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  typeFilter: 'all' | 'income' | 'expense';
  onTypeChange: (v: 'all' | 'income' | 'expense') => void;
  categoryFilter: string;
  onCategoryChange: (v: string) => void;
}

export function TransactionFilters({
  search,
  onSearchChange,
  typeFilter,
  onTypeChange,
  categoryFilter,
  onCategoryChange,
}: TransactionFiltersProps) {
  const categories = useStore(s => s.categories);
  const locale = useLocale();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={`${t(locale, 'search')}...`}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex rounded-lg border border-border">
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
        className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs"
      >
        <option value="">{t(locale, 'all')} {t(locale, 'categories')}</option>
        {categories.map((c) => (
          <option key={c.id} value={c.name}>{c.name}</option>
        ))}
      </select>
    </div>
  );
}

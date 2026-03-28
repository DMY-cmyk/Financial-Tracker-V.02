'use client';

import type { RefObject } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { t, useLocale } from '@/lib/i18n';
import { Search, SlidersHorizontal } from 'lucide-react';
import type { PaymentMethod } from '@/lib/types';

interface TransactionFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  typeFilter: 'all' | 'income' | 'expense';
  onTypeChange: (v: 'all' | 'income' | 'expense') => void;
  paymentMethodFilter?: string;
  onPaymentMethodChange?: (v: string) => void;
  paymentMethods?: PaymentMethod[];
  allMonths?: boolean;
  onAllMonthsChange?: (v: boolean) => void;
  yearOnly?: boolean;
  onYearOnlyChange?: (v: boolean) => void;
  selectedYear?: number;
  searchInputRef?: RefObject<HTMLInputElement | null>;
  // Advanced filter badge
  activeAdvancedFilterCount?: number;
  onFiltersClick?: () => void;
}

export function TransactionFilters({
  search,
  onSearchChange,
  typeFilter,
  onTypeChange,
  paymentMethodFilter = '',
  onPaymentMethodChange,
  paymentMethods = [],
  allMonths = false,
  onAllMonthsChange,
  yearOnly = false,
  onYearOnlyChange,
  selectedYear,
  searchInputRef,
  activeAdvancedFilterCount = 0,
  onFiltersClick,
}: TransactionFiltersProps) {
  const locale = useLocale();

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search input */}
      <div className="relative min-w-[200px] flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          ref={searchInputRef}
          placeholder={`${t(locale, 'search')}...`}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Type toggle */}
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

      {/* Payment method */}
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

      {/* All months toggle */}
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

      {/* Year only toggle */}
      {onYearOnlyChange && (
        <button
          onClick={() => onYearOnlyChange(!yearOnly)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            yearOnly
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:bg-muted'
          }`}
        >
          {t(locale, 'viewEntireYear')}
          {selectedYear ? ` ${selectedYear}` : ''}
        </button>
      )}

      {/* Advanced filters button */}
      {onFiltersClick && (
        <Button
          variant={activeAdvancedFilterCount > 0 ? 'default' : 'outline'}
          size="sm"
          onClick={onFiltersClick}
          className="gap-1.5"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {activeAdvancedFilterCount > 0
            ? t(locale, 'activeFilters').replace('{n}', String(activeAdvancedFilterCount))
            : t(locale, 'advancedFilters')}
        </Button>
      )}
    </div>
  );
}

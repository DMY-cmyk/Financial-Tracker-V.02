'use client';

import { useState } from 'react';
import { t, useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { X, Trash2 } from 'lucide-react';
import type { Category } from '@/lib/types';
import type { FilterPreset, FilterPresetFilters } from './useFilterPresets';

export interface TransactionFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Amount range
  amountMin: string;
  setAmountMin: (v: string) => void;
  amountMax: string;
  setAmountMax: (v: string) => void;
  // Multi-category
  selectedCategories: string[];
  toggleCategory: (id: string) => void;
  clearCategories: () => void;
  categories: Category[];
  // Date range
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  // Notes toggle
  includeNotes: boolean;
  setIncludeNotes: (v: boolean) => void;
  // Presets
  presets: FilterPreset[];
  onSavePreset: (name: string, filters: FilterPresetFilters) => void;
  onDeletePreset: (id: string) => void;
  onApplyPreset: (filters: FilterPresetFilters) => void;
  // Current filter snapshot (for save)
  currentFilters: FilterPresetFilters;
  // Actions
  onClearAll: () => void;
}

export function TransactionFilterSheet({
  open,
  onOpenChange,
  amountMin,
  setAmountMin,
  amountMax,
  setAmountMax,
  selectedCategories,
  toggleCategory,
  clearCategories,
  categories,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  includeNotes,
  setIncludeNotes,
  presets,
  onSavePreset,
  onDeletePreset,
  onApplyPreset,
  currentFilters,
  onClearAll,
}: TransactionFilterSheetProps) {
  const locale = useLocale();
  const [savingPreset, setSavingPreset] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');

  const amountError =
    amountMin !== '' &&
    amountMax !== '' &&
    Number(amountMin) > Number(amountMax);

  const handleSavePreset = () => {
    if (!presetNameInput.trim()) return;
    onSavePreset(presetNameInput.trim(), currentFilters);
    setPresetNameInput('');
    setSavingPreset(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="flex w-full flex-col gap-0 overflow-hidden sm:max-w-md"
        aria-describedby={undefined}
      >
        <SheetHeader className="border-border border-b px-6 py-4">
          <SheetTitle>{t(locale, 'advancedFilters')}</SheetTitle>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

          {/* --- Amount Range --- */}
          <section>
            <h3 className="text-sm font-medium mb-3">{t(locale, 'amountRange')}</h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  {t(locale, 'minAmount')}
                </Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                  className={cn('font-mono text-sm', amountError && 'border-destructive')}
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  {t(locale, 'maxAmount')}
                </Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="∞"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  className={cn('font-mono text-sm', amountError && 'border-destructive')}
                />
              </div>
            </div>
            {amountError && (
              <p className="text-destructive mt-1.5 text-xs">
                {t(locale, 'minAmount')} ≤ {t(locale, 'maxAmount')}
              </p>
            )}
          </section>

          {/* --- Categories --- */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">{t(locale, 'multiCategory')}</h3>
              {selectedCategories.length > 0 && (
                <button
                  onClick={clearCategories}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  {t(locale, 'clear')}
                </button>
              )}
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {categories.map((cat) => (
                <label
                  key={cat.id}
                  className="flex items-center gap-2.5 cursor-pointer select-none"
                >
                  <Checkbox
                    checked={selectedCategories.includes(cat.id)}
                    onCheckedChange={() => toggleCategory(cat.id)}
                  />
                  <span className="text-sm">{cat.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground capitalize">
                    {cat.type}
                  </span>
                </label>
              ))}
              {categories.length === 0 && (
                <p className="text-muted-foreground text-xs py-2">{t(locale, 'noData')}</p>
              )}
            </div>
          </section>

          {/* --- Date Range --- */}
          <section>
            <h3 className="text-sm font-medium mb-1">{t(locale, 'dateRange')}</h3>
            <p className="text-muted-foreground text-xs mb-3">
              {t(locale, 'dateRangeOverridesMonth')}
            </p>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  {t(locale, 'dateFrom')}
                </Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  {t(locale, 'dateTo')}
                </Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
            {((dateFrom && !dateTo) || (!dateFrom && dateTo)) && (
              <p className="text-destructive mt-1.5 text-xs">
                {t(locale, 'dateRangeBothRequired')}
              </p>
            )}
          </section>

          {/* --- Include Notes --- */}
          <section>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <Checkbox
                checked={includeNotes}
                onCheckedChange={(checked) => setIncludeNotes(Boolean(checked))}
              />
              <span className="text-sm">{t(locale, 'includeNotes')}</span>
            </label>
          </section>

          {/* --- Saved Presets --- */}
          <section>
            <h3 className="text-sm font-medium mb-3">{t(locale, 'filterPresets')}</h3>

            {presets.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="border-border bg-muted flex items-center gap-1 rounded-full border px-3 py-1 text-xs"
                  >
                    <button
                      onClick={() => onApplyPreset(preset.filters)}
                      className="hover:text-foreground text-muted-foreground"
                    >
                      {preset.name}
                    </button>
                    <button
                      onClick={() => onDeletePreset(preset.id)}
                      className="text-muted-foreground hover:text-destructive ml-1"
                      aria-label={`Delete preset ${preset.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {savingPreset ? (
              <div className="flex gap-2">
                <Input
                  placeholder={t(locale, 'presetName')}
                  value={presetNameInput}
                  onChange={(e) => setPresetNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSavePreset();
                    if (e.key === 'Escape') setSavingPreset(false);
                  }}
                  className="text-sm h-8"
                  autoFocus
                />
                <Button size="sm" onClick={handleSavePreset} disabled={!presetNameInput.trim()}>
                  {t(locale, 'save')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSavingPreset(false)}>
                  {t(locale, 'cancel')}
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setSavingPreset(true)}
                className="text-primary hover:underline text-sm"
              >
                + {t(locale, 'savePreset')}
              </button>
            )}
          </section>
        </div>

        {/* Sticky footer */}
        <SheetFooter className="border-border border-t px-6 py-4 flex-row gap-2">
          <Button variant="outline" size="sm" onClick={onClearAll} className="gap-1.5">
            <Trash2 className="h-3.5 w-3.5" />
            {t(locale, 'clearAllFilters')}
          </Button>
          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="ml-auto"
          >
            {t(locale, 'ok')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

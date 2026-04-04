'use client';

import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Loader2, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeInUp } from '@/lib/motion';
import { t, useLocale } from '@/lib/i18n';
import { BudgetSuggestionRow } from './BudgetSuggestionRow';
import type { BudgetSuggestion } from '@/lib/api/contracts';

interface BudgetSuggestionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: BudgetSuggestion[];
  isLoading: boolean;
  onLoad: () => void;
  onApplyAll: (overrides: { categoryId: string; budget: number }[]) => Promise<boolean>;
  onApplied: () => void;
}

export function BudgetSuggestionSheet({
  open,
  onOpenChange,
  suggestions,
  isLoading,
  onLoad,
  onApplyAll,
  onApplied,
}: BudgetSuggestionSheetProps) {
  const locale = useLocale();
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (open) {
      onLoad();
    }
  }, [open, onLoad]);

  useEffect(() => {
    const initial: Record<string, number> = {};
    for (const s of suggestions) {
      initial[s.categoryId] = s.suggestedBudget;
    }
    setOverrides(initial);
  }, [suggestions]);

  const handleChange = (categoryId: string, value: number) => {
    setOverrides((prev) => ({ ...prev, [categoryId]: value }));
  };

  const handleApply = async () => {
    setIsApplying(true);
    const entries = Object.entries(overrides).map(([categoryId, budget]) => ({
      categoryId,
      budget,
    }));
    const ok = await onApplyAll(entries);
    setIsApplying(false);
    if (ok) {
      onApplied();
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-hidden sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            {t(locale, 'smartSuggest')}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
            </div>
          )}

          {!isLoading && suggestions.length === 0 && (
            <motion.div {...fadeInUp} className="flex flex-col items-center gap-3 py-12">
              <Lightbulb className="text-muted-foreground h-12 w-12" />
              <p className="text-muted-foreground text-center text-sm">
                {t(locale, 'noExpenseCategories')}
              </p>
            </motion.div>
          )}

          {!isLoading && suggestions.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-3 text-xs">
                {t(locale, 'suggestionsBasedOn').replace('{n}', '3')}
              </p>
              {suggestions.map((s) => (
                <BudgetSuggestionRow
                  key={s.categoryId}
                  suggestion={s}
                  value={overrides[s.categoryId] ?? s.suggestedBudget}
                  onChange={handleChange}
                />
              ))}
            </div>
          )}
        </div>

        {suggestions.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <Button className="w-full" onClick={handleApply} disabled={isApplying}>
              {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t(locale, 'applySuggestions')}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

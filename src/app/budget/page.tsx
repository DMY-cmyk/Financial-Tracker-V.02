'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, BookmarkPlus, Library, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t, useLocale } from '@/lib/i18n';
import { useStore } from '@/store';
import { MONTH_NAMES } from '@/lib/constants';
import { fadeInUp, staggerGrid, staggerGridItem } from '@/lib/motion';
import { useBudgetData } from '@/hooks/useBudgetData';
import { useBudgetTemplates } from '@/hooks/useBudgetTemplates';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { BudgetOverview } from '@/components/budget/BudgetOverview';
import { BudgetCategoryCard } from '@/components/budget/BudgetCategoryCard';
import { UnbudgetedCategories } from '@/components/budget/UnbudgetedCategories';
import { SaveTemplateDialog } from '@/components/budget/SaveTemplateDialog';
import { ApplyTemplateSheet } from '@/components/budget/ApplyTemplateSheet';
import { BudgetSuggestionSheet } from '@/components/budget/BudgetSuggestionSheet';

export default function BudgetPage() {
  const locale = useLocale();
  const month = useStore((s) => s.ui.selectedMonth);
  const year = useStore((s) => s.ui.selectedYear);

  const {
    budgetedCategories,
    unbudgetedCategories,
    totalBudget,
    totalSpent,
    updateBudget,
    refetch,
    isLoading,
  } = useBudgetData();

  const {
    templates,
    suggestions,
    isLoadingTemplates,
    isLoadingSuggestions,
    loadTemplates,
    saveTemplate,
    applyTemplate,
    removeTemplate,
    loadSuggestions,
    applySuggestions,
  } = useBudgetTemplates();

  const [saveOpen, setSaveOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <PageHeader title={t(locale, 'budgetPage')} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border-border bg-card h-24 animate-pulse rounded-2xl border" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-border bg-card h-32 animate-pulse rounded-2xl border" />
          ))}
        </div>
      </div>
    );
  }

  const isEmpty = budgetedCategories.length === 0 && unbudgetedCategories.length === 0;

  return (
    <div className="mx-auto max-w-4xl space-y-4 sm:space-y-6">
      <motion.div {...fadeInUp}>
        <PageHeader title={t(locale, 'budgetPage')} description={`${MONTH_NAMES[month]} ${year}`} />
      </motion.div>

      {/* Action bar */}
      <motion.div {...fadeInUp} className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setSaveOpen(true)}>
          <BookmarkPlus className="mr-2 h-4 w-4" />
          {t(locale, 'saveAsTemplate')}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setApplyOpen(true)}>
          <Library className="mr-2 h-4 w-4" />
          {t(locale, 'applyTemplate')}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setSuggestOpen(true)}>
          <Lightbulb className="mr-2 h-4 w-4" />
          {t(locale, 'smartSuggest')}
        </Button>
      </motion.div>

      {isEmpty ? (
        <motion.div {...fadeInUp}>
          <EmptyState
            title={t(locale, 'noBudgetCategories')}
            icon={<Target className="h-12 w-12" />}
          />
        </motion.div>
      ) : (
        <>
          <BudgetOverview totalBudget={totalBudget} totalSpent={totalSpent} />

          {budgetedCategories.length > 0 && (
            <motion.div
              variants={staggerGrid}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              {budgetedCategories.map((cat) => (
                <motion.div key={cat.id} variants={staggerGridItem}>
                  <BudgetCategoryCard category={cat} onUpdateBudget={updateBudget} />
                </motion.div>
              ))}
            </motion.div>
          )}

          {unbudgetedCategories.length > 0 && (
            <UnbudgetedCategories categories={unbudgetedCategories} onSetBudget={updateBudget} />
          )}
        </>
      )}

      {/* Dialogs / Sheets */}
      <SaveTemplateDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        categoryCount={budgetedCategories.length}
        onSave={saveTemplate}
      />

      <ApplyTemplateSheet
        open={applyOpen}
        onOpenChange={setApplyOpen}
        templates={templates}
        isLoading={isLoadingTemplates}
        onLoad={loadTemplates}
        onApply={applyTemplate}
        onDelete={removeTemplate}
        onApplied={refetch}
      />

      <BudgetSuggestionSheet
        open={suggestOpen}
        onOpenChange={setSuggestOpen}
        suggestions={suggestions}
        isLoading={isLoadingSuggestions}
        onLoad={loadSuggestions}
        onApplyAll={applySuggestions}
        onApplied={refetch}
      />
    </div>
  );
}

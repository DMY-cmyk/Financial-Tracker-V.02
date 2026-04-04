'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api/client';
import { t, useLocale } from '@/lib/i18n';
import type { BudgetTemplate, BudgetSuggestion } from '@/lib/api/contracts';

export function useBudgetTemplates() {
  const locale = useLocale();
  const [templates, setTemplates] = useState<BudgetTemplate[]>([]);
  const [suggestions, setSuggestions] = useState<BudgetSuggestion[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const loadTemplates = useCallback(async () => {
    setIsLoadingTemplates(true);
    const result = await api.budgetTemplates.list();
    setIsLoadingTemplates(false);
    if (result.data) setTemplates(result.data.templates);
  }, []);

  const saveTemplate = useCallback(
    async (name: string): Promise<boolean> => {
      const result = await api.budgetTemplates.create(name);
      if (result.error) {
        toast.error(result.error.message);
        return false;
      }
      toast.success(t(locale, 'templateSaved'));
      await loadTemplates();
      return true;
    },
    [locale, loadTemplates]
  );

  const applyTemplate = useCallback(
    async (id: string): Promise<{ applied: number; skipped: number } | null> => {
      const result = await api.budgetTemplates.apply(id);
      if (result.error) {
        toast.error(result.error.message);
        return null;
      }
      toast.success(t(locale, 'templateApplied').replace('{n}', String(result.data.applied)));
      return result.data;
    },
    [locale]
  );

  const removeTemplate = useCallback(async (id: string): Promise<boolean> => {
    const result = await api.budgetTemplates.delete(id);
    if (result.error) {
      toast.error(result.error.message);
      return false;
    }
    setTemplates((prev) => prev.filter((tmpl) => tmpl.id !== id));
    return true;
  }, []);

  const loadSuggestions = useCallback(async (months = 3) => {
    setIsLoadingSuggestions(true);
    setSuggestions([]);
    const result = await api.budgetTemplates.suggestions(months);
    setIsLoadingSuggestions(false);
    if (result.data) setSuggestions(result.data.suggestions);
    if (result.error) toast.error(result.error.message);
  }, []);

  const applySuggestions = useCallback(
    async (overrides: { categoryId: string; budget: number }[]): Promise<boolean> => {
      const results = await Promise.all(
        overrides.map(({ categoryId, budget }) => api.categories.update(categoryId, { budget }))
      );
      const failed = results.filter((r) => r.error);
      if (failed.length > 0) {
        toast.error(`Failed to update ${failed.length} categories`);
        return false;
      }
      toast.success(t(locale, 'budgetUpdated'));
      return true;
    },
    [locale]
  );

  return {
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
  };
}

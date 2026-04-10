'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { useStore } from '@/store';
import { useLocale } from '@/lib/i18n';
import type { SavingsGoal } from '@/lib/types';

export const COLOR_OPTIONS = [
  '#2563EB',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#F97316',
];

export function useSavingsGoals() {
  const locale = useLocale();
  const initialized = useStore((s) => s.initialized);

  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [fetchKey, setFetchKey] = useState(0);
  const [loadedKey, setLoadedKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isLoading = loadedKey !== String(fetchKey);

  useEffect(() => {
    if (!initialized) return;
    let cancelled = false;
    setError(null);
    api.savings.list().then((result) => {
      if (cancelled) return;
      if (result.data) {
        setGoals(result.data.goals);
      } else if (result.error) {
        setError(result.error.message);
      }
      setLoadedKey(String(fetchKey));
    });
    return () => {
      cancelled = true;
    };
  }, [initialized, fetchKey]);

  void locale; // used in Tasks 5–9 for toast messages

  const reload = useCallback(() => setFetchKey((k) => k + 1), []);

  return {
    goals,
    isLoading,
    error,
    reload,
    form: {
      open: false,
      editingGoal: null as SavingsGoal | null,
      name: '',
      setName: (_v: string) => {},
      target: '',
      setTarget: (_v: string) => {},
      saved: '',
      setSaved: (_v: string) => {},
      color: COLOR_OPTIONS[0],
      setColor: (_v: string) => {},
      errors: {} as Record<string, string>,
      openAdd: () => {},
      openEdit: (_goal: SavingsGoal) => {},
      close: () => {},
      submit: async () => {},
    },
    deleteConfirm: {
      id: null as string | null,
      setId: (_id: string | null) => {},
      confirm: async () => {},
    },
    quickEdit: {
      goalId: null as string | null,
      value: '',
      open: (_goal: SavingsGoal) => {},
      close: () => {},
      setValue: (_v: string) => {},
      submit: async (_goal: SavingsGoal) => {},
    },
  };
}

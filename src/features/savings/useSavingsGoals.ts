'use client';

import { useState } from 'react';
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
  const [goals] = useState<SavingsGoal[]>([]);
  const [error] = useState<string | null>(null);

  return {
    goals,
    isLoading: true,
    error,
    reload: () => {},
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

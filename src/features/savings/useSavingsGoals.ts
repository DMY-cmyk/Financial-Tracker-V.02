'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api/client';
import { useStore } from '@/store';
import { useLocale, t } from '@/lib/i18n';
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

  // Data state
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [fetchKey, setFetchKey] = useState(0);
  const [loadedKey, setLoadedKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isLoading = loadedKey !== String(fetchKey);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [formName, setFormName] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formSaved, setFormSaved] = useState('');
  const [formColor, setFormColor] = useState(COLOR_OPTIONS[0]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Quick edit state
  const [quickEditGoalId, setQuickEditGoalId] = useState<string | null>(null);
  const [quickEditValue, setQuickEditValue] = useState('');

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

  const reload = useCallback(() => setFetchKey((k) => k + 1), []);

  const resetForm = () => {
    setFormName('');
    setFormTarget('');
    setFormSaved('');
    setFormColor(COLOR_OPTIONS[0]);
    setFormErrors({});
    setEditingGoal(null);
  };

  const openAdd = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setFormName(goal.name);
    setFormTarget(String(goal.targetAmount));
    setFormSaved(String(goal.savedAmount));
    setFormColor(goal.color);
    setFormErrors({});
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    resetForm();
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = t(locale, 'required');
    const target = Number(formTarget);
    if (!formTarget || isNaN(target) || target <= 0) errors.target = t(locale, 'invalidAmount');
    const saved = Number(formSaved || '0');
    if (isNaN(saved) || saved < 0) errors.saved = t(locale, 'invalidAmount');
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submit = async () => {
    if (!validateForm()) return;

    const payload = {
      name: formName.trim(),
      targetAmount: Number(formTarget),
      savedAmount: Number(formSaved || '0'),
      color: formColor,
    };

    const result = editingGoal
      ? await api.savings.update(editingGoal.id, payload)
      : await api.savings.create(payload);

    if (result.data) {
      toast.success(t(locale, 'goalSaved'));
      reload();
      closeForm();
    } else {
      toast.error(t(locale, 'failedSave'));
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const deletedGoal = goals.find((g) => g.id === deleteId);
    const result = await api.savings.delete(deleteId);
    if (result.data) {
      setGoals((prev) => prev.filter((g) => g.id !== deleteId));
      toast.success(t(locale, 'goalDeleted'), {
        action: deletedGoal
          ? {
              label: t(locale, 'undo'),
              onClick: async () => {
                await api.savings.create({
                  name: deletedGoal.name,
                  targetAmount: deletedGoal.targetAmount,
                  savedAmount: deletedGoal.savedAmount,
                  color: deletedGoal.color,
                });
                reload();
                toast.success(t(locale, 'itemRestored'));
              },
            }
          : undefined,
      });
    }
    setDeleteId(null);
  };

  return {
    goals,
    isLoading,
    error,
    reload,

    form: {
      open: formOpen,
      editingGoal,
      name: formName,
      setName: setFormName,
      target: formTarget,
      setTarget: setFormTarget,
      saved: formSaved,
      setSaved: setFormSaved,
      color: formColor,
      setColor: setFormColor,
      errors: formErrors,
      openAdd,
      openEdit,
      close: closeForm,
      submit,
    },

    deleteConfirm: {
      id: deleteId,
      setId: setDeleteId,
      confirm: confirmDelete,
    },

    quickEdit: {
      goalId: quickEditGoalId,
      value: quickEditValue,
      open: (_goal: SavingsGoal) => {}, // TODO: Task 9
      close: () => {}, // TODO: Task 9
      setValue: setQuickEditValue,
      submit: async (_goal: SavingsGoal) => {}, // TODO: Task 9
    },
  };
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/store';
import { api } from '@/lib/api/client';
import type { RecurringTransaction, Category, PaymentMethod } from '@/lib/types';

export function useRecurringTransactions() {
  const initialized = useStore((s) => s.initialized);

  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [fetchKey, setFetchKey] = useState(0);

  const [loadedKey, setLoadedKey] = useState('');
  const targetKey = `rt-${fetchKey}`;
  const isLoading = loadedKey !== targetKey;

  useEffect(() => {
    if (!initialized) return;
    let cancelled = false;

    Promise.all([
      api.recurringTransactions.list(),
      api.categories.list(),
      api.paymentMethods.list(),
    ]).then(([rtResult, catResult, pmResult]) => {
      if (cancelled) return;
      if (rtResult.data) setRecurringTransactions(rtResult.data.recurringTransactions);
      if (catResult.data) setCategories(catResult.data.categories);
      if (pmResult.data) setPaymentMethods(pmResult.data.paymentMethods);
      setLoadedKey(`rt-${fetchKey}`);
    });

    return () => {
      cancelled = true;
    };
  }, [initialized, fetchKey]);

  const refetch = useCallback(() => setFetchKey((k) => k + 1), []);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingRT, setEditingRT] = useState<RecurringTransaction | undefined>();

  const openAdd = useCallback(() => {
    setEditingRT(undefined);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((rt: RecurringTransaction) => {
    setEditingRT(rt);
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingRT(undefined);
    refetch();
  }, [refetch]);

  const deleteRecurring = useCallback(
    async (id: string) => {
      await api.recurringTransactions.delete(id);
      setRecurringTransactions((prev) => prev.filter((rt) => rt.id !== id));
    },
    []
  );

  const toggleActive = useCallback(
    async (id: string) => {
      const rt = recurringTransactions.find((r) => r.id === id);
      if (!rt) return;
      const newActive = !rt.isActive;
      // Optimistic update
      setRecurringTransactions((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isActive: newActive } : r))
      );
      const result = await api.recurringTransactions.update(id, { isActive: newActive });
      if (result.error) refetch();
    },
    [recurringTransactions, refetch]
  );

  const generate = useCallback(async () => {
    const result = await api.recurringTransactions.generate();
    if (result.data) {
      refetch();
      return result.data.generated;
    }
    return 0;
  }, [refetch]);

  return {
    recurringTransactions,
    categories,
    paymentMethods,
    isLoading,
    formOpen,
    setFormOpen,
    editingRT,
    openAdd,
    openEdit,
    closeForm,
    deleteRecurring,
    toggleActive,
    generate,
    refetch,
  };
}

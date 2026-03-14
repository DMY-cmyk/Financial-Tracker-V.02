'use client';

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useStore } from '@/store';
import { api } from '@/lib/api/client';
import type { RecurringTransaction, Category, PaymentMethod } from '@/lib/types';

interface RecurringData {
  recurringTransactions: RecurringTransaction[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
}

export function useRecurringTransactions() {
  const initialized = useStore((s) => s.initialized);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<RecurringData>({
    queryKey: ['recurring-transactions'],
    queryFn: async () => {
      const [rtResult, catResult, pmResult] = await Promise.all([
        api.recurringTransactions.list(),
        api.categories.list(),
        api.paymentMethods.list(),
      ]);
      return {
        recurringTransactions: rtResult.data?.recurringTransactions ?? [],
        categories: catResult.data?.categories ?? [],
        paymentMethods: pmResult.data?.paymentMethods ?? [],
      };
    },
    enabled: initialized,
  });

  const recurringTransactions = data?.recurringTransactions ?? [];
  const categories = data?.categories ?? [];
  const paymentMethods = data?.paymentMethods ?? [];

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
    queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] });
  }, [queryClient]);

  const deleteRecurring = useCallback(
    async (id: string) => {
      await api.recurringTransactions.delete(id);
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] });
    },
    [queryClient]
  );

  const toggleActive = useCallback(
    async (id: string) => {
      const rt = recurringTransactions.find((r) => r.id === id);
      if (!rt) return;
      const newActive = !rt.isActive;
      // Optimistic update
      queryClient.setQueryData<RecurringData>(['recurring-transactions'], (old) => {
        if (!old) return old;
        return {
          ...old,
          recurringTransactions: old.recurringTransactions.map((r) =>
            r.id === id ? { ...r, isActive: newActive } : r
          ),
        };
      });
      const result = await api.recurringTransactions.update(id, { isActive: newActive });
      if (result.error) {
        queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] });
      }
    },
    [recurringTransactions, queryClient]
  );

  const generate = useCallback(async () => {
    const result = await api.recurringTransactions.generate();
    if (result.data) {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      return result.data.generated;
    }
    return 0;
  }, [queryClient]);

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
  };
}

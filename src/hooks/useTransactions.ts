'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useStore } from '@/store';
import { api } from '@/lib/api/client';
import { type Transaction } from '@/lib/types';

interface UseTransactionsReturn {
  // Data
  transactions: Transaction[];
  filtered: Transaction[];
  income: number;
  expense: number;

  // Filters
  search: string;
  setSearch: (v: string) => void;
  typeFilter: 'all' | 'income' | 'expense';
  setTypeFilter: (v: 'all' | 'income' | 'expense') => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;

  // Form
  formOpen: boolean;
  setFormOpen: (v: boolean) => void;
  editingTx: Transaction | undefined;
  openAdd: () => void;
  openEdit: (tx: Transaction) => void;
  closeForm: () => void;

  // Actions
  deleteTransaction: (id: string) => void;

  // States
  isLoading: boolean;
  isEmpty: boolean;
  hasNoResults: boolean;
}

export function useTransactions(): UseTransactionsReturn {
  const month = useStore((s) => s.ui.selectedMonth);
  const year = useStore((s) => s.ui.selectedYear);
  const initialized = useStore((s) => s.initialized);

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [fetchKey, setFetchKey] = useState(0);

  // Derive loading from comparing requested vs loaded data key
  const [loadedKey, setLoadedKey] = useState('');
  const targetKey = `${month}-${year}-${fetchKey}`;
  const isApiLoading = loadedKey !== targetKey;

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | undefined>();

  // Fetch transactions from API
  useEffect(() => {
    if (!initialized) return;

    let cancelled = false;

    api.transactions.list({ month, year }).then((result) => {
      if (cancelled) return;
      if (result.data) {
        setAllTransactions(result.data.transactions);
        setIncome(result.data.income);
        setExpense(result.data.expense);
      }
      setLoadedKey(`${month}-${year}-${fetchKey}`);
    });

    return () => {
      cancelled = true;
    };
  }, [month, year, fetchKey, initialized]);

  const refetch = useCallback(() => setFetchKey((k) => k + 1), []);

  // Client-side filtering
  const filtered = useMemo(() => {
    return allTransactions.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (categoryFilter && tx.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          tx.description.toLowerCase().includes(q) ||
          tx.category.toLowerCase().includes(q) ||
          tx.notes.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allTransactions, typeFilter, categoryFilter, search]);

  const hasActiveFilters = search !== '' || typeFilter !== 'all' || categoryFilter !== '';

  const clearFilters = useCallback(() => {
    setSearch('');
    setTypeFilter('all');
    setCategoryFilter('');
  }, []);

  const openAdd = useCallback(() => {
    setEditingTx(undefined);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((tx: Transaction) => {
    setEditingTx(tx);
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingTx(undefined);
    refetch();
  }, [refetch]);

  const deleteTransaction = useCallback(
    (id: string) => {
      // Optimistic update: remove from local state immediately
      setAllTransactions((prev) => prev.filter((t) => t.id !== id));
      // Fire API call in background
      api.transactions.delete(id);
    },
    []
  );

  const isLoading = !initialized || isApiLoading;

  return {
    transactions: allTransactions,
    filtered,
    income,
    expense,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    categoryFilter,
    setCategoryFilter,
    hasActiveFilters,
    clearFilters,
    formOpen,
    setFormOpen,
    editingTx,
    openAdd,
    openEdit,
    closeForm,
    deleteTransaction,
    isLoading,
    isEmpty: !isLoading && allTransactions.length === 0,
    hasNoResults: !isLoading && allTransactions.length > 0 && filtered.length === 0,
  };
}

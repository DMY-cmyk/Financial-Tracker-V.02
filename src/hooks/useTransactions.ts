import { useState, useMemo, useCallback } from 'react';
import { useStore } from '@/store';
import { useMonthlyTransactions, useMonthlyIncome, useMonthlyExpense } from '@/store/selectors';
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
  const allTransactions = useMonthlyTransactions();
  const income = useMonthlyIncome();
  const expense = useMonthlyExpense();
  const deleteTx = useStore((s) => s.deleteTransaction);
  const initialized = useStore((s) => s.initialized);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | undefined>();

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
  }, []);

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
    deleteTransaction: deleteTx,
    isLoading: !initialized,
    isEmpty: initialized && allTransactions.length === 0,
    hasNoResults: initialized && allTransactions.length > 0 && filtered.length === 0,
  };
}

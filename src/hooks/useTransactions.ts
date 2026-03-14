'use client';

import { useState, useCallback, useEffect } from 'react';
import { useStore } from '@/store';
import { api } from '@/lib/api/client';
import { type Transaction, type PaymentMethod } from '@/lib/types';

interface UseTransactionsReturn {
  // Data
  transactions: Transaction[];
  income: number;
  expense: number;

  // Pagination
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  setPage: (v: number) => void;

  // Filters
  search: string;
  setSearch: (v: string) => void;
  typeFilter: 'all' | 'income' | 'expense';
  setTypeFilter: (v: 'all' | 'income' | 'expense') => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  paymentMethodFilter: string;
  setPaymentMethodFilter: (v: string) => void;
  allMonths: boolean;
  setAllMonths: (v: boolean) => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;

  // Reference data
  paymentMethods: PaymentMethod[];

  // Form
  formOpen: boolean;
  setFormOpen: (v: boolean) => void;
  editingTx: Transaction | undefined;
  openAdd: () => void;
  openEdit: (tx: Transaction) => void;
  openDuplicate: (tx: Transaction) => void;
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
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 25;

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [allMonths, setAllMonthsState] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | undefined>();

  const [loadedKey, setLoadedKey] = useState('');
  const targetKey = `${allMonths ? 'all' : `${month}-${year}`}-${fetchKey}-${page}-${typeFilter}-${categoryFilter}-${paymentMethodFilter}-${search}`;
  const isApiLoading = loadedKey !== targetKey;

  // Reset page when filters change
  const setSearchWithReset = useCallback((v: string) => { setSearch(v); setPage(1); }, []);
  const setTypeFilterWithReset = useCallback((v: 'all' | 'income' | 'expense') => { setTypeFilter(v); setPage(1); }, []);
  const setCategoryFilterWithReset = useCallback((v: string) => { setCategoryFilter(v); setPage(1); }, []);
  const setPaymentMethodFilterWithReset = useCallback((v: string) => { setPaymentMethodFilter(v); setPage(1); }, []);
  const setAllMonthsWithReset = useCallback((v: boolean) => { setAllMonthsState(v); setPage(1); }, []);

  useEffect(() => {
    if (!initialized) return;
    api.paymentMethods.list().then((result) => {
      if (result.data) setPaymentMethods(result.data.paymentMethods);
    });
  }, [initialized]);

  useEffect(() => {
    if (!initialized) return;

    let cancelled = false;
    const params: Record<string, unknown> = { page, pageSize };
    if (!allMonths) {
      params.month = month;
      params.year = year;
    }
    if (typeFilter !== 'all') params.type = typeFilter;
    if (categoryFilter) params.categoryId = categoryFilter;
    if (paymentMethodFilter) params.paymentMethod = paymentMethodFilter;
    if (search) params.search = search;

    api.transactions.list(params as Parameters<typeof api.transactions.list>[0]).then((result) => {
      if (cancelled) return;
      if (result.data) {
        setAllTransactions(result.data.transactions);
        setIncome(result.data.income);
        setExpense(result.data.expense);
        setTotalPages(result.data.totalPages);
        setTotal(result.data.total);
      }
      setLoadedKey(targetKey);
    });

    return () => {
      cancelled = true;
    };
  }, [month, year, fetchKey, initialized, page, typeFilter, categoryFilter, paymentMethodFilter, search, allMonths, targetKey]);

  const refetch = useCallback(() => setFetchKey((k) => k + 1), []);

  const hasActiveFilters =
    search !== '' || typeFilter !== 'all' || categoryFilter !== '' || paymentMethodFilter !== '' || allMonths;

  const clearFilters = useCallback(() => {
    setSearch('');
    setTypeFilter('all');
    setCategoryFilter('');
    setPaymentMethodFilter('');
    setAllMonthsState(false);
    setPage(1);
  }, []);

  const openAdd = useCallback(() => {
    setEditingTx(undefined);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((tx: Transaction) => {
    setEditingTx(tx);
    setFormOpen(true);
  }, []);

  const openDuplicate = useCallback(
    (tx: Transaction) => {
      const today = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
      setEditingTx({
        ...tx,
        id: '', // empty ID triggers create mode in the form
        date: today,
      });
      setFormOpen(true);
    },
    [month, year]
  );

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingTx(undefined);
    refetch();
  }, [refetch]);

  const deleteTransaction = useCallback((id: string) => {
    setAllTransactions((prev) => prev.filter((t) => t.id !== id));
    api.transactions.delete(id);
  }, []);

  const isLoading = !initialized || isApiLoading;

  return {
    transactions: allTransactions,
    income,
    expense,
    page,
    pageSize,
    totalPages,
    total,
    setPage,
    search,
    setSearch: setSearchWithReset,
    typeFilter,
    setTypeFilter: setTypeFilterWithReset,
    categoryFilter,
    setCategoryFilter: setCategoryFilterWithReset,
    paymentMethodFilter,
    setPaymentMethodFilter: setPaymentMethodFilterWithReset,
    allMonths,
    setAllMonths: setAllMonthsWithReset,
    hasActiveFilters,
    clearFilters,
    paymentMethods,
    formOpen,
    setFormOpen,
    editingTx,
    openAdd,
    openEdit,
    openDuplicate,
    closeForm,
    deleteTransaction,
    isLoading,
    isEmpty: !isLoading && total === 0 && !hasActiveFilters,
    hasNoResults: !isLoading && allTransactions.length === 0 && hasActiveFilters,
  };
}

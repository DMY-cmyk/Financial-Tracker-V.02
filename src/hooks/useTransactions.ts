'use client';

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  yearOnly: boolean;
  setYearOnly: (v: boolean) => void;
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
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const pageSize = 25;

  const [search, setSearchState] = useState('');
  const [typeFilter, setTypeFilterState] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilterState] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilterState] = useState('');
  const [allMonths, setAllMonthsState] = useState(false);
  const [yearOnly, setYearOnlyState] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | undefined>();

  // Reset page when filters change
  const setSearch = useCallback((v: string) => {
    setSearchState(v);
    setPage(1);
  }, []);
  const setTypeFilter = useCallback((v: 'all' | 'income' | 'expense') => {
    setTypeFilterState(v);
    setPage(1);
  }, []);
  const setCategoryFilter = useCallback((v: string) => {
    setCategoryFilterState(v);
    setPage(1);
  }, []);
  const setPaymentMethodFilter = useCallback((v: string) => {
    setPaymentMethodFilterState(v);
    setPage(1);
  }, []);
  const setAllMonths = useCallback((v: boolean) => {
    setAllMonthsState(v);
    if (v) setYearOnlyState(false);
    setPage(1);
  }, []);
  const setYearOnly = useCallback((v: boolean) => {
    setYearOnlyState(v);
    if (v) setAllMonthsState(false);
    setPage(1);
  }, []);

  const { data: pmData } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const result = await api.paymentMethods.list();
      return result.data?.paymentMethods ?? [];
    },
    enabled: initialized,
  });
  const paymentMethods = pmData ?? [];

  const txQueryKey = [
    'transactions',
    allMonths ? 'all' : yearOnly ? `year-${year}` : `${month}-${year}`,
    page,
    typeFilter,
    categoryFilter,
    paymentMethodFilter,
    search,
  ];

  const { data: txData, isLoading: isQueryLoading } = useQuery({
    queryKey: txQueryKey,
    queryFn: async () => {
      const params: Record<string, unknown> = { page, pageSize };
      if (yearOnly) {
        params.year = year;
        params.yearOnly = true;
      } else if (!allMonths) {
        params.month = month;
        params.year = year;
      }
      if (typeFilter !== 'all') params.type = typeFilter;
      if (categoryFilter) params.categoryId = categoryFilter;
      if (paymentMethodFilter) params.paymentMethod = paymentMethodFilter;
      if (search) params.search = search;

      const result = await api.transactions.list(
        params as Parameters<typeof api.transactions.list>[0]
      );
      return result.data ?? null;
    },
    enabled: initialized,
  });

  const transactions = txData?.transactions ?? [];
  const income = txData?.income ?? 0;
  const expense = txData?.expense ?? 0;
  const totalPages = txData?.totalPages ?? 0;
  const total = txData?.total ?? 0;

  const hasActiveFilters =
    search !== '' ||
    typeFilter !== 'all' ||
    categoryFilter !== '' ||
    paymentMethodFilter !== '' ||
    allMonths ||
    yearOnly;

  const clearFilters = useCallback(() => {
    setSearchState('');
    setTypeFilterState('all');
    setCategoryFilterState('');
    setPaymentMethodFilterState('');
    setAllMonthsState(false);
    setYearOnlyState(false);
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
        id: '',
        date: today,
      });
      setFormOpen(true);
    },
    [month, year]
  );

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingTx(undefined);
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }, [queryClient]);

  const deleteTransaction = useCallback(
    (id: string) => {
      api.transactions.delete(id).then(() => {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      });
    },
    [queryClient]
  );

  const isLoading = !initialized || isQueryLoading;

  return {
    transactions,
    income,
    expense,
    page,
    pageSize,
    totalPages,
    total,
    setPage,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    categoryFilter,
    setCategoryFilter,
    paymentMethodFilter,
    setPaymentMethodFilter,
    allMonths,
    setAllMonths,
    yearOnly,
    setYearOnly,
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
    hasNoResults: !isLoading && transactions.length === 0 && hasActiveFilters,
  };
}

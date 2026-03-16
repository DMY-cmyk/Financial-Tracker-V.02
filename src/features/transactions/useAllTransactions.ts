'use client';

import { useState, useCallback } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useStore } from '@/store';
import { api } from '@/lib/api/client';
import { type Transaction, type PaymentMethod } from '@/lib/types';

const PAGE_SIZE = 50;

interface UseAllTransactionsReturn {
  // Data
  transactions: Transaction[];
  income: number;
  expense: number;
  total: number;

  // Load-more
  hasMore: boolean;
  loadMore: () => void;
  isLoading: boolean;
  isLoadingMore: boolean;

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
  deleteTransaction: (id: string) => void;

  // Selection (bulk)
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  isAllSelected: boolean;
  bulkDeleteTransactions: () => Promise<number>;

  // States
  isEmpty: boolean;
  hasNoResults: boolean;
}

export function useAllTransactions(): UseAllTransactionsReturn {
  const month = useStore((s) => s.ui.selectedMonth);
  const year = useStore((s) => s.ui.selectedYear);
  const initialized = useStore((s) => s.initialized);
  const queryClient = useQueryClient();

  const [search, setSearchState] = useState('');
  const [typeFilter, setTypeFilterState] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilterState] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilterState] = useState('');
  const [allMonths, setAllMonthsState] = useState(false);
  const [yearOnly, setYearOnlyState] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | undefined>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter key for query cache invalidation and accumulation reset
  const filterKey = [
    allMonths ? 'all' : yearOnly ? `year-${year}` : `${month}-${year}`,
    typeFilter,
    categoryFilter,
    paymentMethodFilter,
    search,
  ].join('|');

  // Filter setters — each resets selection
  const setSearch = useCallback((v: string) => {
    setSearchState(v);
    setSelectedIds(new Set());
  }, []);
  const setTypeFilter = useCallback((v: 'all' | 'income' | 'expense') => {
    setTypeFilterState(v);
    setSelectedIds(new Set());
  }, []);
  const setCategoryFilter = useCallback((v: string) => {
    setCategoryFilterState(v);
    setSelectedIds(new Set());
  }, []);
  const setPaymentMethodFilter = useCallback((v: string) => {
    setPaymentMethodFilterState(v);
    setSelectedIds(new Set());
  }, []);
  const setAllMonths = useCallback((v: boolean) => {
    setAllMonthsState(v);
    if (v) setYearOnlyState(false);
    setSelectedIds(new Set());
  }, []);
  const setYearOnly = useCallback((v: boolean) => {
    setYearOnlyState(v);
    if (v) setAllMonthsState(false);
    setSelectedIds(new Set());
  }, []);

  const clearFilters = useCallback(() => {
    setSearchState('');
    setTypeFilterState('all');
    setCategoryFilterState('');
    setPaymentMethodFilterState('');
    setAllMonthsState(false);
    setYearOnlyState(false);
    setSelectedIds(new Set());
  }, []);

  const hasActiveFilters =
    search !== '' ||
    typeFilter !== 'all' ||
    categoryFilter !== '' ||
    paymentMethodFilter !== '' ||
    allMonths ||
    yearOnly;

  // Payment methods reference data
  const { data: pmData } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const result = await api.paymentMethods.list();
      return result.data?.paymentMethods ?? [];
    },
    enabled: initialized,
  });
  const paymentMethods = pmData ?? [];

  // Infinite query for load-more accumulation
  const {
    data,
    isLoading: isQueryLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['all-transactions', filterKey],
    queryFn: async ({ pageParam }) => {
      const params: Record<string, unknown> = { page: pageParam, pageSize: PAGE_SIZE };
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
    getNextPageParam: (lastPage) => {
      if (!lastPage) return undefined;
      const next = lastPage.page + 1;
      return next <= lastPage.totalPages ? next : undefined;
    },
    initialPageParam: 1,
    enabled: initialized,
  });

  const transactions = data?.pages.flatMap((p) => p?.transactions ?? []) ?? [];
  const firstPage = data?.pages[0];
  const total = firstPage?.total ?? 0;
  const income = firstPage?.income ?? 0;
  const expense = firstPage?.expense ?? 0;
  const isLoading = !initialized || isQueryLoading;

  // Form actions
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
      setEditingTx({ ...tx, id: '', date: today });
      setFormOpen(true);
    },
    [month, year]
  );

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingTx(undefined);
    queryClient.invalidateQueries({ queryKey: ['all-transactions'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['payment-method-balances'] });
  }, [queryClient]);

  const deleteTransaction = useCallback(
    (id: string) => {
      api.transactions.delete(id).then(() => {
        queryClient.invalidateQueries({ queryKey: ['all-transactions'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['payment-method-balances'] });
      });
    },
    [queryClient]
  );

  // Selection
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const selectAll = useCallback(
    () => setSelectedIds(new Set(transactions.map((tx) => tx.id))),
    [transactions]
  );
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
  const isAllSelected = transactions.length > 0 && selectedIds.size === transactions.length;

  const bulkDeleteTransactions = useCallback(async () => {
    const ids = Array.from(selectedIds);
    const result = await api.transactions.bulkDelete(ids);
    const deleted = result.data?.deleted ?? 0;
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ['all-transactions'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['payment-method-balances'] });
    return deleted;
  }, [selectedIds, queryClient]);

  return {
    transactions,
    income,
    expense,
    total,
    hasMore: Boolean(hasNextPage),
    loadMore: fetchNextPage,
    isLoading,
    isLoadingMore: isFetchingNextPage,
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
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    isAllSelected,
    bulkDeleteTransactions,
    isEmpty: !isLoading && total === 0 && !hasActiveFilters,
    hasNoResults: !isLoading && transactions.length === 0 && hasActiveFilters,
  };
}

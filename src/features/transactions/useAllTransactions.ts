'use client';

import { useState, useCallback } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useStore } from '@/store';
import { api } from '@/lib/api/client';
import { type Transaction, type PaymentMethod, type Category } from '@/lib/types';

const PAGE_SIZE = 50;

interface InitialFilters {
  paymentMethod?: string;
  allMonths?: boolean;
}

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
  isError: boolean;
  refetch: () => void;

  // Basic filters
  search: string;
  setSearch: (v: string) => void;
  typeFilter: 'all' | 'income' | 'expense';
  setTypeFilter: (v: 'all' | 'income' | 'expense') => void;
  paymentMethodFilter: string;
  setPaymentMethodFilter: (v: string) => void;
  allMonths: boolean;
  setAllMonths: (v: boolean) => void;
  yearOnly: boolean;
  setYearOnly: (v: boolean) => void;
  sortOrder: 'asc' | 'desc';
  toggleSortOrder: () => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;

  // Advanced filters
  amountMin: string;
  setAmountMin: (v: string) => void;
  amountMax: string;
  setAmountMax: (v: string) => void;
  selectedCategories: string[];
  toggleCategory: (id: string) => void;
  clearCategories: () => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  includeNotes: boolean;
  setIncludeNotes: (v: boolean) => void;
  clearAdvancedFilters: () => void;
  activeAdvancedFilterCount: number;

  // Reference data
  paymentMethods: PaymentMethod[];
  categories: Category[];

  // Form
  formOpen: boolean;
  setFormOpen: (v: boolean) => void;
  editingTx: Transaction | undefined;
  openAdd: () => void;
  openEdit: (tx: Transaction) => void;
  openDuplicate: (tx: Transaction) => void;
  closeForm: () => void;
  deleteTransaction: (id: string) => Promise<boolean>;

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

export function useAllTransactions(initialFilters?: InitialFilters): UseAllTransactionsReturn {
  const month = useStore((s) => s.ui.selectedMonth);
  const year = useStore((s) => s.ui.selectedYear);
  const initialized = useStore((s) => s.initialized);
  const queryClient = useQueryClient();

  // Basic filter state
  const [search, setSearchState] = useState('');
  const [typeFilter, setTypeFilterState] = useState<'all' | 'income' | 'expense'>('all');
  const [paymentMethodFilter, setPaymentMethodFilterState] = useState(
    initialFilters?.paymentMethod ?? ''
  );
  const [allMonths, setAllMonthsState] = useState(initialFilters?.allMonths ?? false);
  const [yearOnly, setYearOnlyState] = useState(false);
  const [sortOrder, setSortOrderState] = useState<'asc' | 'desc'>('desc');

  // Advanced filter state
  const [amountMin, setAmountMinState] = useState('');
  const [amountMax, setAmountMaxState] = useState('');
  const [selectedCategories, setSelectedCategoriesState] = useState<string[]>([]);
  const [dateFrom, setDateFromState] = useState('');
  const [dateTo, setDateToState] = useState('');
  const [includeNotes, setIncludeNotesState] = useState(false);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | undefined>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Derived: active advanced filter count
  const activeAdvancedFilterCount = [
    Number(amountMin) > 0,
    Number(amountMax) > 0,
    selectedCategories.length > 0,
    dateFrom !== '' && dateTo !== '',
    includeNotes,
  ].filter(Boolean).length;

  // Filter key — changing any filter resets to page 1
  const filterKey = [
    dateFrom && dateTo
      ? `date-${dateFrom}-${dateTo}`
      : allMonths
        ? 'all'
        : yearOnly
          ? `year-${year}`
          : `${month}-${year}`,
    typeFilter,
    selectedCategories.slice().sort().join(','),
    paymentMethodFilter,
    search,
    sortOrder,
    amountMin,
    amountMax,
    includeNotes,
  ].join('|');

  // Basic filter setters
  const setSearch = useCallback((v: string) => {
    setSearchState(v);
    setSelectedIds(new Set());
  }, []);
  const setTypeFilter = useCallback((v: 'all' | 'income' | 'expense') => {
    setTypeFilterState(v);
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
  const toggleSortOrder = useCallback(() => {
    setSortOrderState((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    setSelectedIds(new Set());
  }, []);

  // Advanced filter setters
  const setAmountMin = useCallback((v: string) => {
    setAmountMinState(v);
    setSelectedIds(new Set());
  }, []);
  const setAmountMax = useCallback((v: string) => {
    setAmountMaxState(v);
    setSelectedIds(new Set());
  }, []);
  const toggleCategory = useCallback((id: string) => {
    setSelectedCategoriesState((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
    setSelectedIds(new Set());
  }, []);
  const clearCategories = useCallback(() => {
    setSelectedCategoriesState([]);
    setSelectedIds(new Set());
  }, []);
  const setDateFrom = useCallback((v: string) => {
    setDateFromState(v);
    setSelectedIds(new Set());
  }, []);
  const setDateTo = useCallback((v: string) => {
    setDateToState(v);
    setSelectedIds(new Set());
  }, []);
  const setIncludeNotes = useCallback((v: boolean) => {
    setIncludeNotesState(v);
    setSelectedIds(new Set());
  }, []);

  const clearAdvancedFilters = useCallback(() => {
    setAmountMinState('');
    setAmountMaxState('');
    setSelectedCategoriesState([]);
    setDateFromState('');
    setDateToState('');
    setIncludeNotesState(false);
    setSelectedIds(new Set());
  }, []);

  const clearFilters = useCallback(() => {
    setSearchState('');
    setTypeFilterState('all');
    setPaymentMethodFilterState('');
    setAllMonthsState(false);
    setYearOnlyState(false);
    setAmountMinState('');
    setAmountMaxState('');
    setSelectedCategoriesState([]);
    setDateFromState('');
    setDateToState('');
    setIncludeNotesState(false);
    setSelectedIds(new Set());
  }, []);

  const hasActiveFilters =
    search !== '' ||
    typeFilter !== 'all' ||
    paymentMethodFilter !== '' ||
    allMonths ||
    yearOnly ||
    activeAdvancedFilterCount > 0;

  // Reference data — payment methods
  const { data: pmData } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const result = await api.paymentMethods.list();
      return result.data?.paymentMethods ?? [];
    },
    enabled: initialized,
  });
  const paymentMethods = pmData ?? [];

  // Reference data — categories (for filter sheet)
  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const result = await api.categories.list();
      return result.data?.categories ?? [];
    },
    enabled: initialized,
  });
  const categories = catData ?? [];

  // Infinite query
  const {
    data,
    isLoading: isQueryLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['all-transactions', filterKey],
    queryFn: async ({ pageParam }) => {
      const params: Record<string, unknown> = { page: pageParam, pageSize: PAGE_SIZE };

      // Date scope — date range takes priority over month/year
      if (dateFrom && dateTo) {
        params.dateFrom = dateFrom;
        params.dateTo = dateTo;
      } else if (yearOnly) {
        params.year = year;
        params.yearOnly = true;
      } else if (!allMonths) {
        params.month = month;
        params.year = year;
      }

      if (typeFilter !== 'all') params.type = typeFilter;
      if (paymentMethodFilter) params.paymentMethod = paymentMethodFilter;
      if (search) params.search = search;
      params.sortOrder = sortOrder;

      // Advanced filters
      if (Number(amountMin) > 0) params.amountMin = Number(amountMin);
      if (Number(amountMax) > 0) params.amountMax = Number(amountMax);
      if (selectedCategories.length > 0) params.categories = selectedCategories.join(',');
      if (includeNotes) params.includeNotes = true;

      const result = await api.transactions.list(
        params as Parameters<typeof api.transactions.list>[0]
      );
      if (result.error) throw new Error(result.error.message);
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
    async (id: string) => {
      const result = await api.transactions.delete(id);
      queryClient.invalidateQueries({ queryKey: ['all-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['payment-method-balances'] });
      return !result.error;
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
    () =>
      setSelectedIds(
        new Set((data?.pages.flatMap((p) => p?.transactions ?? []) ?? []).map((tx) => tx.id))
      ),
    [data]
  );
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
  const isAllSelected = transactions.length > 0 && selectedIds.size === transactions.length;

  const bulkDeleteTransactions = useCallback(async () => {
    const ids = Array.from(selectedIds);
    const result = await api.transactions.bulkDelete(ids);
    if (result.error) throw new Error(result.error.message);
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
    isError,
    refetch,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    paymentMethodFilter,
    setPaymentMethodFilter,
    allMonths,
    setAllMonths,
    yearOnly,
    setYearOnly,
    sortOrder,
    toggleSortOrder,
    hasActiveFilters,
    clearFilters,
    amountMin,
    setAmountMin,
    amountMax,
    setAmountMax,
    selectedCategories,
    toggleCategory,
    clearCategories,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    includeNotes,
    setIncludeNotes,
    clearAdvancedFilters,
    activeAdvancedFilterCount,
    paymentMethods,
    categories,
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

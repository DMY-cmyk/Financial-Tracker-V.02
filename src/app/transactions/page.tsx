'use client';

import { useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAllTransactions } from '@/features/transactions/useAllTransactions';
import { useFilterPresets } from '@/features/transactions/useFilterPresets';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useStore } from '@/store';
import { t, useLocale } from '@/lib/i18n';
import { MONTH_NAMES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { staggerContainer, fadeInUp } from '@/lib/motion';
import { BulkActionBar } from '@/features/transactions/BulkActionBar';
import { HeroHeader } from '@/components/layout/HeroHeader';
import { PageHeader } from '@/components/layout/PageHeader';
import { PeriodTabs, type Period } from '@/components/shared/PeriodTabs';
import { useDashboardData } from '@/features/dashboard/useDashboardData';
import { formatCurrency } from '@/lib/formatters';
import { TransactionFilters } from '@/features/transactions/TransactionFilters';
import { TransactionFilterSheet } from '@/features/transactions/TransactionFilterSheet';
import { TransactionForm } from '@/features/transactions/TransactionForm';
import { AllTransactionsView } from '@/features/transactions/AllTransactionsView';
import { TransactionSummary } from '@/features/transactions/TransactionSummary';
import { EmptyState, NoResults } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ListSkeleton } from '@/components/shared/Skeletons';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Plus, Receipt, Download, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { exportCSV, exportExcel } from '@/lib/export-utils';
import type { ExportReportInput } from '@/lib/types';

function TransactionsPageInner() {
  const locale = useLocale();
  const queryClient = useQueryClient();

  const searchParams = useSearchParams();
  const urlPaymentMethod = searchParams.get('paymentMethod') ?? '';
  const urlAllMonths = searchParams.get('allMonths') === 'true';

  const month = useStore((s) => s.ui.selectedMonth);
  const year = useStore((s) => s.ui.selectedYear);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    transactions,
    income,
    expense,
    total,
    hasMore,
    loadMore,
    isLoading,
    isLoadingMore,
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
    paymentMethods,
    categories,
    clearFilters,
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
    isEmpty,
    hasNoResults,
    // Advanced filters
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
  } = useAllTransactions({
    paymentMethod: urlPaymentMethod,
    allMonths: urlAllMonths,
  });

  const { presets, savePreset, deletePreset } = useFilterPresets();
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [period, setPeriod] = useState<Period>('daily');
  const { balance, expense: dashExpense, categories: dashCategories } = useDashboardData();

  useKeyboardShortcuts({
    onNewTransaction: openAdd,
    onFocusSearch: () => searchInputRef.current?.focus(),
  });

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const handleDelete = (id: string) => setDeleteId(id);

  const confirmDelete = () => {
    if (deleteId) {
      const deletedTx = transactions.find((tx) => tx.id === deleteId);
      deleteTransaction(deleteId);
      toast.success(t(locale, 'transactionDeleted'), {
        action: deletedTx
          ? {
              label: t(locale, 'undo'),
              onClick: async () => {
                await api.transactions.create({
                  description: deletedTx.description,
                  amount: deletedTx.amount,
                  type: deletedTx.type,
                  category: deletedTx.category,
                  categoryId: deletedTx.categoryId,
                  paymentMethod: deletedTx.paymentMethod,
                  date: deletedTx.date,
                  notes: deletedTx.notes,
                });
                queryClient.invalidateQueries({ queryKey: ['all-transactions'] });
                queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                toast.success(t(locale, 'itemRestored'));
              },
            }
          : undefined,
      });
      setDeleteId(null);
    }
  };

  const confirmBulkDelete = async () => {
    const deleted = await bulkDeleteTransactions();
    toast.success(`${deleted} ${t(locale, 'bulkDeleteSuccess')}`);
    setBulkDeleteOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <HeroHeader title={t(locale, 'transactions')} />
        <div className="hidden lg:block">
          <PageHeader title={t(locale, 'transactions')} />
        </div>
        <ListSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <HeroHeader title={t(locale, 'transactions')}>
        <div className="grid grid-cols-2 gap-3 md:hidden">
          <div className="bg-hero-foreground/10 ring-hero-foreground/10 rounded-2xl p-3 ring-1 ring-inset">
            <p className="text-[10px] font-medium tracking-wider uppercase opacity-75">
              {t(locale, 'homeTotalBalance')}
            </p>
            <p className="mt-0.5 font-mono text-base font-bold tabular-nums">
              {formatCurrency(balance)}
            </p>
          </div>
          <div className="bg-hero-foreground/10 ring-hero-foreground/10 rounded-2xl p-3 ring-1 ring-inset">
            <p className="text-[10px] font-medium tracking-wider uppercase opacity-75">
              {t(locale, 'homeTotalExpense')}
            </p>
            <p className="text-destructive mt-0.5 font-mono text-base font-bold tabular-nums">
              -{formatCurrency(dashExpense)}
            </p>
          </div>
        </div>
      </HeroHeader>
      <div className="md:hidden">
        <PeriodTabs variant="four" value={period} onChange={setPeriod} />
      </div>
      <motion.div {...fadeInUp} className="hidden lg:block">
        <PageHeader
          title={t(locale, 'transactions')}
          description={`${total} ${t(locale, 'transactionCount')}`}
        >
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  'border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium whitespace-nowrap shadow-sm transition-colors disabled:pointer-events-none disabled:opacity-50',
                  transactions.length === 0 && 'pointer-events-none opacity-50'
                )}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">{t(locale, 'exportFiltered')}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    exportCSV(
                      transactions,
                      `transactions-${year}-${String(month + 1).padStart(2, '0')}.csv`,
                      `${MONTH_NAMES[month]} ${year}`,
                      income,
                      expense,
                      income - expense
                    );
                    toast.success(t(locale, 'exportSuccess'));
                  }}
                >
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    const txTotalIncome = transactions
                      .filter((t) => t.type === 'income')
                      .reduce((s, t) => s + t.amount, 0);
                    const txTotalExpense = transactions
                      .filter((t) => t.type === 'expense')
                      .reduce((s, t) => s + t.amount, 0);
                    const txIncomeCategories = Object.entries(
                      transactions
                        .filter((t) => t.type === 'income')
                        .reduce<Record<string, number>>((acc, t) => {
                          acc[t.category] = (acc[t.category] ?? 0) + t.amount;
                          return acc;
                        }, {})
                    )
                      .map(([category, total]) => ({ category, total }))
                      .sort((a, b) => b.total - a.total);
                    const txExpenseCategories = Object.entries(
                      transactions
                        .filter((t) => t.type === 'expense')
                        .reduce<Record<string, number>>((acc, t) => {
                          acc[t.category] = (acc[t.category] ?? 0) + t.amount;
                          return acc;
                        }, {})
                    )
                      .map(([category, total]) => ({ category, total }))
                      .sort((a, b) => b.total - a.total);
                    const txPaymentMethodBalances = Object.entries(
                      transactions.reduce<Record<string, number>>((acc, t) => {
                        const delta = t.type === 'income' ? t.amount : -t.amount;
                        acc[t.paymentMethod] = (acc[t.paymentMethod] ?? 0) + delta;
                        return acc;
                      }, {})
                    ).map(([name, balance]) => ({ name, balance }));
                    const txInput: ExportReportInput = {
                      scopeLabel: t(locale, 'transactions'),
                      transactions,
                      totalIncome: txTotalIncome,
                      totalExpense: txTotalExpense,
                      totalAssets: txTotalIncome - txTotalExpense,
                      incomeCategories: txIncomeCategories,
                      expenseCategories: txExpenseCategories,
                      paymentMethodBalances: txPaymentMethodBalances,
                      bills: [],
                      filename: `transactions-${year}-${String(month + 1).padStart(2, '0')}.xlsx`,
                    };
                    await exportExcel(txInput);
                    toast.success(t(locale, 'exportSuccess'));
                  }}
                >
                  Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={openAdd} className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t(locale, 'addTransaction')}</span>
              <span className="sm:hidden">{t(locale, 'add')}</span>
            </Button>
          </div>
        </PageHeader>
      </motion.div>

      <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, delay: 0.05 }}>
        <TransactionSummary income={income} expense={expense} />
      </motion.div>

      <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, delay: 0.1 }}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="flex-1">
            <TransactionFilters
              search={search}
              onSearchChange={setSearch}
              typeFilter={typeFilter}
              onTypeChange={setTypeFilter}
              paymentMethodFilter={paymentMethodFilter}
              onPaymentMethodChange={setPaymentMethodFilter}
              paymentMethods={paymentMethods}
              allMonths={allMonths}
              onAllMonthsChange={setAllMonths}
              yearOnly={yearOnly}
              onYearOnlyChange={setYearOnly}
              selectedYear={year}
              searchInputRef={searchInputRef}
              activeAdvancedFilterCount={activeAdvancedFilterCount}
              onFiltersClick={() => setFilterSheetOpen(true)}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSortOrder}
            className="gap-1.5 self-start"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sortOrder === 'desc' ? t(locale, 'newest') : t(locale, 'oldest')}
          </Button>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {isEmpty ? (
          <motion.div key="empty" {...fadeInUp}>
            <EmptyState
              title={t(locale, 'noData')}
              description={t(locale, 'addFirstTransaction')}
              icon={<Receipt className="h-12 w-12" />}
            >
              <Button onClick={openAdd} className="gap-2">
                <Plus className="h-4 w-4" />
                {t(locale, 'addTransaction')}
              </Button>
            </EmptyState>
          </motion.div>
        ) : hasNoResults ? (
          <motion.div key="no-results" {...fadeInUp}>
            <NoResults
              message={t(locale, 'noTransactionsMatch')}
              onClear={clearFilters}
              clearLabel={t(locale, 'clearFilters')}
            />
          </motion.div>
        ) : (
          <motion.div key="list" variants={staggerContainer} initial="hidden" animate="show">
            <AllTransactionsView
              transactions={transactions}
              total={total}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              onLoadMore={loadMore}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onSelectAll={selectAll}
              isAllSelected={isAllSelected}
              onEdit={openEdit}
              onDuplicate={openDuplicate}
              onDelete={handleDelete}
              categories={dashCategories}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Advanced Filter Sheet */}
      <TransactionFilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        amountMin={amountMin}
        setAmountMin={setAmountMin}
        amountMax={amountMax}
        setAmountMax={setAmountMax}
        selectedCategories={selectedCategories}
        toggleCategory={toggleCategory}
        clearCategories={clearCategories}
        categories={categories}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        includeNotes={includeNotes}
        setIncludeNotes={setIncludeNotes}
        presets={presets}
        onSavePreset={savePreset}
        onDeletePreset={deletePreset}
        onApplyPreset={(filters) => {
          clearAdvancedFilters();
          if (filters.amountMin !== undefined) setAmountMin(String(filters.amountMin));
          if (filters.amountMax !== undefined) setAmountMax(String(filters.amountMax));
          if (filters.selectedCategories !== undefined) {
            filters.selectedCategories.forEach((id) => toggleCategory(id));
          }
          if (filters.dateFrom !== undefined) setDateFrom(filters.dateFrom);
          if (filters.dateTo !== undefined) setDateTo(filters.dateTo);
          if (filters.includeNotes !== undefined) setIncludeNotes(filters.includeNotes);
          if (filters.type) setTypeFilter(filters.type as 'all' | 'income' | 'expense');
          if (filters.search !== undefined) setSearch(filters.search);
        }}
        currentFilters={{
          amountMin: Number(amountMin) || undefined,
          amountMax: Number(amountMax) || undefined,
          selectedCategories: selectedCategories.length > 0 ? selectedCategories : undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          includeNotes: includeNotes ? true : undefined,
        }}
        onClearAll={() => {
          clearAdvancedFilters();
          setFilterSheetOpen(false);
        }}
      />

      {/* Sheet form */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent className="overflow-y-auto" aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle>
              {editingTx ? t(locale, 'editTransaction') : t(locale, 'addTransaction')}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <TransactionForm transaction={editingTx} onClose={closeForm} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t(locale, 'deleteTransaction')}
        description={t(locale, 'deleteConfirmDescription')}
        confirmLabel={t(locale, 'delete')}
        cancelLabel={t(locale, 'cancel')}
        onConfirm={confirmDelete}
      />

      {/* Bulk delete confirmation */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={t(locale, 'bulkDeleteTitle')}
        description={t(locale, 'bulkDeleteDescription').replace(
          '{count}',
          String(selectedIds.size)
        )}
        confirmLabel={t(locale, 'delete')}
        cancelLabel={t(locale, 'cancel')}
        onConfirm={confirmBulkDelete}
      />

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <BulkActionBar
            count={selectedIds.size}
            onClear={clearSelection}
            onDelete={() => setBulkDeleteOpen(true)}
          />
        )}
      </AnimatePresence>

      {/* Mobile FAB */}
      {selectedIds.size === 0 && (
        <button
          onClick={openAdd}
          className="bg-primary text-primary-foreground fixed right-4 bottom-20 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 lg:bottom-6 lg:hidden"
          aria-label={t(locale, 'addTransaction')}
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <TransactionsPageInner />
    </Suspense>
  );
}

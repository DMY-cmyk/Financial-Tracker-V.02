'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAllTransactions } from '@/features/transactions/useAllTransactions';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useStore } from '@/store';
import { t, useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { staggerContainer, fadeInUp } from '@/lib/motion';
import { BulkActionBar } from '@/features/transactions/BulkActionBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { TransactionFilters } from '@/features/transactions/TransactionFilters';
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
import { Plus, Receipt, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { exportCSV, exportExcel } from '@/lib/export-utils';

export default function TransactionsPage() {
  const locale = useLocale();
  const queryClient = useQueryClient();

  // One-time URL seed: read paymentMethod from URL on mount (lazy useState avoids ref-in-render)
  const [urlPaymentMethod] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('paymentMethod') ?? '';
  });

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
    categoryFilter,
    setCategoryFilter,
    paymentMethodFilter,
    setPaymentMethodFilter,
    allMonths,
    setAllMonths,
    yearOnly,
    setYearOnly,
    paymentMethods,
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
  } = useAllTransactions(urlPaymentMethod ? { paymentMethod: urlPaymentMethod } : undefined);

  useKeyboardShortcuts({
    onNewTransaction: openAdd,
    onFocusSearch: () => searchInputRef.current?.focus(),
  });

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

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
        <PageHeader title={t(locale, 'transactions')} />
        <ListSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <motion.div {...fadeInUp}>
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
                      `transactions-${year}-${String(month + 1).padStart(2, '0')}`
                    );
                    toast.success(t(locale, 'exportSuccess'));
                  }}
                >
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    await exportExcel(
                      transactions,
                      `transactions-${year}-${String(month + 1).padStart(2, '0')}`,
                      t(locale, 'transactions'),
                      false
                    );
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
        <TransactionFilters
          search={search}
          onSearchChange={setSearch}
          typeFilter={typeFilter}
          onTypeChange={setTypeFilter}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
          paymentMethodFilter={paymentMethodFilter}
          onPaymentMethodChange={setPaymentMethodFilter}
          paymentMethods={paymentMethods}
          allMonths={allMonths}
          onAllMonthsChange={setAllMonths}
          yearOnly={yearOnly}
          onYearOnlyChange={setYearOnly}
          selectedYear={year}
          searchInputRef={searchInputRef}
        />
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
            />
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Mobile FAB — hidden when bulk selection active */}
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

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTransactions } from '@/hooks/useTransactions';
import { t, useLocale } from '@/lib/i18n';
import { staggerContainer, fadeInUp } from '@/lib/motion';
import { PageHeader } from '@/components/layout/PageHeader';
import { TransactionFilters } from '@/components/transactions/TransactionFilters';
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { TransactionSummary } from '@/components/transactions/TransactionSummary';
import { EmptyState, NoResults } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ListSkeleton } from '@/components/shared/Skeletons';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Plus, Receipt } from 'lucide-react';
import { toast } from 'sonner';

export default function TransactionsPage() {
  const locale = useLocale();
  const {
    filtered,
    income,
    expense,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    categoryFilter,
    setCategoryFilter,
    clearFilters,
    formOpen,
    setFormOpen,
    editingTx,
    openAdd,
    openEdit,
    closeForm,
    deleteTransaction,
    isLoading,
    isEmpty,
    hasNoResults,
  } = useTransactions();

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteTransaction(deleteId);
      toast.success(locale === 'id' ? 'Transaksi dihapus' : 'Transaction deleted');
      setDeleteId(null);
    }
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
          description={`${filtered.length} ${filtered.length === 1 ? 'transaction' : 'transactions'} this month`}
        >
          <Button onClick={openAdd} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t(locale, 'addTransaction')}</span>
            <span className="sm:hidden">Add</span>
          </Button>
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
        />
      </motion.div>

      <AnimatePresence mode="wait">
        {isEmpty ? (
          <motion.div key="empty" {...fadeInUp}>
            <EmptyState
              title={t(locale, 'noData')}
              description={
                locale === 'id'
                  ? 'Tambahkan transaksi pertama Anda.'
                  : 'Start by adding your first transaction.'
              }
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
              message={locale === 'id' ? 'Tidak ada hasil' : 'No transactions match your filters'}
              onClear={clearFilters}
              clearLabel={locale === 'id' ? 'Hapus filter' : 'Clear filters'}
            />
          </motion.div>
        ) : (
          <motion.div key="list" variants={staggerContainer} initial="hidden" animate="show">
            <TransactionTable transactions={filtered} onEdit={openEdit} onDelete={handleDelete} />
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
        description={
          locale === 'id'
            ? 'Transaksi ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.'
            : 'This transaction will be permanently deleted. This action cannot be undone.'
        }
        confirmLabel={locale === 'id' ? 'Hapus' : 'Delete'}
        cancelLabel={t(locale, 'cancel')}
        onConfirm={confirmDelete}
      />

      {/* Mobile FAB */}
      <button
        onClick={openAdd}
        className="bg-primary text-primary-foreground fixed right-4 bottom-20 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 lg:bottom-6 lg:hidden"
        aria-label={t(locale, 'addTransaction')}
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}

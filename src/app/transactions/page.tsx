'use client';

import { useState, useMemo } from 'react';
import { useMonthlyTransactions, useMonthlyIncome, useMonthlyExpense } from '@/store/selectors';
import { useStore } from '@/store';
import { Transaction } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';
import { t, useLocale } from '@/lib/i18n';
import { PageHeader } from '@/components/layout/PageHeader';
import { TransactionFilters } from '@/components/transactions/TransactionFilters';
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Plus } from 'lucide-react';

export default function TransactionsPage() {
  const allTransactions = useMonthlyTransactions();
  const income = useMonthlyIncome();
  const expense = useMonthlyExpense();
  const deleteTransaction = useStore(s => s.deleteTransaction);
  const locale = useLocale();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | undefined>();

  const filtered = useMemo(() => {
    return allTransactions.filter(tx => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (categoryFilter && tx.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return tx.description.toLowerCase().includes(q) ||
               tx.category.toLowerCase().includes(q) ||
               tx.notes.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allTransactions, typeFilter, categoryFilter, search]);

  const handleEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteTransaction(id);
  };

  const handleClose = () => {
    setFormOpen(false);
    setEditingTx(undefined);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t(locale, 'transactions')}
        description={`${filtered.length} transactions`}
      >
        <Button onClick={() => { setEditingTx(undefined); setFormOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          {t(locale, 'addTransaction')}
        </Button>
      </PageHeader>

      <div className="flex flex-wrap gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex-1 text-center">
          <p className="text-xs text-muted-foreground">{t(locale, 'income')}</p>
          <p className="mt-1 font-mono text-lg font-semibold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(income)}
          </p>
        </div>
        <div className="w-px bg-border" />
        <div className="flex-1 text-center">
          <p className="text-xs text-muted-foreground">{t(locale, 'expense')}</p>
          <p className="mt-1 font-mono text-lg font-semibold text-red-600 dark:text-red-400">
            {formatCurrency(expense)}
          </p>
        </div>
        <div className="w-px bg-border" />
        <div className="flex-1 text-center">
          <p className="text-xs text-muted-foreground">{t(locale, 'netBalance')}</p>
          <p className="mt-1 font-mono text-lg font-semibold">
            {formatCurrency(income - expense)}
          </p>
        </div>
      </div>

      <TransactionFilters
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
      />

      <TransactionTable
        transactions={filtered}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingTx ? t(locale, 'editTransaction') : t(locale, 'addTransaction')}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <TransactionForm transaction={editingTx} onClose={handleClose} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';
import { useRecurringTransactions } from '@/features/transactions/useRecurringTransactions';
import { api } from '@/lib/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { RecurringTransactionForm } from '@/features/transactions/RecurringTransactionForm';
import { EmptyState, InlineError } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Plus, Pencil, Trash2, Repeat, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';

const FREQUENCY_COLORS: Record<string, string> = {
  daily: 'bg-info-soft text-info-soft-foreground',
  weekly: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  monthly: 'bg-success-soft text-success-soft-foreground',
  yearly: 'bg-warning-soft text-warning-soft-foreground',
};

export default function RecurringTransactionsPage() {
  const locale = useLocale();
  const queryClient = useQueryClient();
  const {
    recurringTransactions,
    isLoading,
    isError,
    refetch,
    formOpen,
    setFormOpen,
    editingRT,
    openAdd,
    openEdit,
    closeForm,
    deleteRecurring,
    toggleActive,
    generate,
  } = useRecurringTransactions();

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const confirmDelete = async () => {
    if (!deleteId) return;
    const deletedRT = recurringTransactions.find((rt) => rt.id === deleteId);
    await deleteRecurring(deleteId);
    toast.success(t(locale, 'recurringDeleted'), {
      action: deletedRT
        ? {
            label: t(locale, 'undo'),
            onClick: async () => {
              await api.recurringTransactions.create({
                description: deletedRT.description,
                category: deletedRT.category,
                categoryId: deletedRT.categoryId,
                type: deletedRT.type,
                amount: deletedRT.amount,
                paymentMethod: deletedRT.paymentMethod,
                notes: deletedRT.notes,
                frequency: deletedRT.frequency,
                startDate: deletedRT.startDate,
                endDate: deletedRT.endDate,
                nextDueDate: deletedRT.nextDueDate,
                isActive: deletedRT.isActive,
              });
              queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] });
              toast.success(t(locale, 'itemRestored'));
            },
          }
        : undefined,
    });
    setDeleteId(null);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const count = await generate();
    toast.success(`${t(locale, 'generated')} ${count} ${t(locale, 'transactions').toLowerCase()}`);
    setGenerating(false);
  };

  const activeCount = recurringTransactions.filter((rt) => rt.isActive).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t(locale, 'recurringTransactions')} />
        <div className="mx-auto max-w-2xl space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="border-border bg-card shadow-card h-20 animate-pulse rounded-2xl border"
            />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title={t(locale, 'recurringTransactions')} />
        <div className="mx-auto max-w-2xl">
          <InlineError
            message={t(locale, 'somethingWentWrong')}
            onRetry={() => refetch()}
            retryLabel={t(locale, 'tryAgain')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <motion.div {...fadeInUp}>
        <PageHeader
          title={t(locale, 'recurringTransactions')}
          description={
            recurringTransactions.length > 0
              ? `${activeCount} ${t(locale, 'active').toLowerCase()}`
              : undefined
          }
        >
          <div className="flex gap-2">
            {recurringTransactions.length > 0 && (
              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={generating}
                className="gap-2 shadow-sm"
              >
                <Play className="h-4 w-4" />
                <span className="hidden sm:inline">{t(locale, 'generateNow')}</span>
              </Button>
            )}
            <Button onClick={openAdd} className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t(locale, 'addRecurring')}</span>
              <span className="sm:hidden">{t(locale, 'add')}</span>
            </Button>
          </div>
        </PageHeader>
      </motion.div>

      <div className="mx-auto max-w-2xl">
        <AnimatePresence mode="wait">
          {recurringTransactions.length === 0 ? (
            <motion.div key="empty" {...fadeInUp}>
              <EmptyState title={t(locale, 'noRecurring')} icon={<Repeat className="h-12 w-12" />}>
                <Button onClick={openAdd} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t(locale, 'addRecurring')}
                </Button>
              </EmptyState>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="space-y-2.5"
            >
              {recurringTransactions.map((rt) => (
                <motion.div
                  key={rt.id}
                  variants={staggerItem}
                  className={cn(
                    'group border-border bg-card shadow-card hover:shadow-card-hover flex items-center gap-3 rounded-2xl border p-4 transition-all duration-300',
                    !rt.isActive && 'opacity-60'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{rt.description}</p>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase',
                          FREQUENCY_COLORS[rt.frequency]
                        )}
                      >
                        {t(locale, rt.frequency)}
                      </span>
                      {!rt.isActive && (
                        <span className="text-muted-foreground text-[10px] font-medium">
                          ({t(locale, 'inactive')})
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {rt.category} · {t(locale, 'nextDueDate')}: {rt.nextDueDate}
                      {rt.endDate
                        ? ` · ${t(locale, 'endDate')}: ${rt.endDate}`
                        : ` · ${t(locale, 'indefinite')}`}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'font-mono text-sm font-medium tabular-nums',
                      rt.type === 'income'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {rt.type === 'income' ? '+' : '-'}
                    {formatCurrency(rt.amount)}
                  </span>
                  <div className="flex gap-1 transition-opacity pointer-fine:opacity-0 pointer-fine:group-focus-within:opacity-100 pointer-fine:group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleActive(rt.id)}
                      aria-label={rt.isActive ? t(locale, 'inactive') : t(locale, 'active')}
                    >
                      {rt.isActive ? (
                        <Pause className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(rt)}
                      aria-label={t(locale, 'edit')}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive h-8 w-8"
                      onClick={() => setDeleteId(rt.id)}
                      aria-label={t(locale, 'delete')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add/Edit Sheet */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent className="overflow-y-auto" aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle>
              {editingRT ? t(locale, 'editRecurring') : t(locale, 'addRecurring')}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <RecurringTransactionForm recurringTransaction={editingRT} onClose={closeForm} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t(locale, 'deleteRecurring')}
        description={t(locale, 'confirmDelete')}
        confirmLabel={t(locale, 'delete')}
        cancelLabel={t(locale, 'cancel')}
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';
import { api } from '@/lib/api/client';
import { useStore } from '@/store';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Plus, Pencil, Trash2, CalendarCheck, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import type { Bill } from '@/lib/types';

export default function BillsPage() {
  const locale = useLocale();
  const month = useStore((s) => s.ui.selectedMonth);
  const year = useStore((s) => s.ui.selectedYear);
  const initialized = useStore((s) => s.initialized);

  const [bills, setBills] = useState<Bill[]>([]);
  const [fetchKey, setFetchKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [loadedKey, setLoadedKey] = useState('');
  const targetKey = `${month}-${year}-${fetchKey}`;
  const isLoading = loadedKey !== targetKey;

  // Form state
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!initialized) return;

    let cancelled = false;

    api.bills.list({ month, year }).then((result) => {
      if (cancelled) return;
      if (result.data) {
        setBills(result.data.bills);
      }
      setLoadedKey(`${month}-${year}-${fetchKey}`);
    });

    return () => {
      cancelled = true;
    };
  }, [initialized, month, year, fetchKey]);

  const refetch = useCallback(() => setFetchKey((k) => k + 1), []);

  const resetForm = () => {
    setFormName('');
    setFormAmount('');
    setFormDueDate('');
    setFormErrors({});
    setEditingBill(null);
  };

  const openAdd = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (bill: Bill) => {
    setEditingBill(bill);
    setFormName(bill.name);
    setFormAmount(String(bill.amount));
    setFormDueDate(String(bill.dueDate));
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    resetForm();
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = t(locale, 'required');
    const amt = Number(formAmount);
    if (!formAmount || isNaN(amt) || amt <= 0) errors.amount = t(locale, 'invalidAmount');
    const due = Number(formDueDate);
    if (!formDueDate || isNaN(due) || due < 1 || due > 31) errors.dueDate = t(locale, 'required');
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (editingBill) {
      const result = await api.bills.update(editingBill.id, {
        name: formName.trim(),
        amount: Number(formAmount),
        dueDate: Number(formDueDate),
      });
      if (result.data) {
        toast.success(t(locale, 'billSaved'));
        refetch();
        closeForm();
      } else {
        toast.error(t(locale, 'failedSave'));
      }
    } else {
      const result = await api.bills.create({
        name: formName.trim(),
        amount: Number(formAmount),
        dueDate: Number(formDueDate),
        month,
        year,
      });
      if (result.data) {
        toast.success(t(locale, 'billSaved'));
        refetch();
        closeForm();
      } else {
        toast.error(t(locale, 'failedSave'));
      }
    }
  };

  const handleTogglePaid = async (bill: Bill) => {
    const result = await api.bills.update(bill.id, { isPaid: !bill.isPaid });
    if (result.data) {
      setBills((prev) => prev.map((b) => (b.id === bill.id ? { ...b, isPaid: !bill.isPaid } : b)));
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const result = await api.bills.delete(deleteId);
    if (result.data) {
      setBills((prev) => prev.filter((b) => b.id !== deleteId));
      toast.success(t(locale, 'billDeleted'));
    }
    setDeleteId(null);
  };

  const paidCount = bills.filter((b) => b.isPaid).length;
  const totalAmount = bills.reduce((sum, b) => sum + b.amount, 0);
  const paidAmount = bills.filter((b) => b.isPaid).reduce((sum, b) => sum + b.amount, 0);

  const now = new Date();
  const currentDay = now.getDate();
  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear();
  const isPastMonth =
    year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth());

  const getBillStatus = (bill: Bill): 'overdue' | 'dueSoon' | null => {
    if (bill.isPaid) return null;
    if (isPastMonth) return 'overdue';
    if (!isCurrentMonth) return null;
    if (currentDay > bill.dueDate) return 'overdue';
    if (bill.dueDate - currentDay <= 3 && bill.dueDate - currentDay > 0) return 'dueSoon';
    return null;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t(locale, 'bills')} />
        <div className="mx-auto max-w-2xl space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-border bg-card h-20 animate-pulse rounded-2xl border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <motion.div {...fadeInUp}>
        <PageHeader
          title={t(locale, 'bills')}
          description={
            bills.length > 0
              ? `${paidCount}/${bills.length} ${t(locale, 'paid').toLowerCase()} · ${formatCurrency(paidAmount)} / ${formatCurrency(totalAmount)}`
              : undefined
          }
        >
          <Button onClick={openAdd} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t(locale, 'addBill')}</span>
            <span className="sm:hidden">{t(locale, 'add')}</span>
          </Button>
        </PageHeader>
      </motion.div>

      <div className="mx-auto max-w-2xl">
        <AnimatePresence mode="wait">
          {bills.length === 0 ? (
            <motion.div key="empty" {...fadeInUp}>
              <EmptyState
                title={t(locale, 'noBills')}
                icon={<CalendarCheck className="h-12 w-12" />}
              >
                <Button onClick={openAdd} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t(locale, 'addBill')}
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
              {bills.map((bill) => {
                const status = getBillStatus(bill);
                return (
                <motion.div
                  key={bill.id}
                  variants={staggerItem}
                  className={cn(
                    'border-border bg-card group hover:bg-muted/50 flex items-center gap-3 rounded-2xl border p-4 transition-colors',
                    status === 'overdue' && 'border-red-400 dark:border-red-500/60',
                    status === 'dueSoon' && 'border-amber-400 dark:border-amber-500/60'
                  )}
                >
                  <Checkbox
                    checked={bill.isPaid}
                    onCheckedChange={() => handleTogglePaid(bill)}
                    aria-label={bill.isPaid ? t(locale, 'paid') : t(locale, 'unpaid')}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p
                        className={cn(
                          'truncate text-sm font-medium',
                          bill.isPaid && 'text-muted-foreground line-through'
                        )}
                      >
                        {bill.name}
                      </p>
                      {status === 'overdue' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-400">
                          <AlertCircle className="h-3 w-3" />
                          {t(locale, 'overdue')}
                        </span>
                      )}
                      {status === 'dueSoon' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                          <Clock className="h-3 w-3" />
                          {t(locale, 'dueSoon')}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {t(locale, 'dueDate')}: {bill.dueDate}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'font-mono text-sm font-medium',
                      bill.isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                    )}
                  >
                    {formatCurrency(bill.amount)}
                  </span>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(bill)}
                      aria-label={t(locale, 'edit')}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive h-8 w-8"
                      onClick={() => setDeleteId(bill.id)}
                      aria-label={t(locale, 'delete')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add/Edit Sheet */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent className="overflow-y-auto" aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle>{editingBill ? t(locale, 'editBill') : t(locale, 'addBill')}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bill-name">{t(locale, 'billName')}</Label>
              <Input
                id="bill-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={locale === 'id' ? 'cth. Listrik' : 'e.g. Electricity'}
              />
              {formErrors.name && <p className="text-destructive text-xs">{formErrors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bill-amount">{t(locale, 'billAmount')}</Label>
              <Input
                id="bill-amount"
                type="number"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="500000"
                min={0}
              />
              {formErrors.amount && <p className="text-destructive text-xs">{formErrors.amount}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bill-due">{t(locale, 'billDueDate')}</Label>
              <Input
                id="bill-due"
                type="number"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                placeholder="1–31"
                min={1}
                max={31}
              />
              {formErrors.dueDate && (
                <p className="text-destructive text-xs">{formErrors.dueDate}</p>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} className="flex-1">
                {t(locale, 'save')}
              </Button>
              <Button variant="outline" onClick={closeForm}>
                {t(locale, 'cancel')}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t(locale, 'deleteBill')}
        description={
          locale === 'id'
            ? 'Tagihan ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.'
            : 'This bill will be permanently deleted. This action cannot be undone.'
        }
        confirmLabel={t(locale, 'delete')}
        cancelLabel={t(locale, 'cancel')}
        onConfirm={confirmDelete}
      />

      {/* Mobile FAB */}
      <button
        onClick={openAdd}
        className="bg-primary text-primary-foreground fixed right-4 bottom-20 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 lg:bottom-6 lg:hidden"
        aria-label={t(locale, 'addBill')}
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}

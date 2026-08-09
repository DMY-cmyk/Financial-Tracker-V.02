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
import { EmptyState, InlineError } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Plus,
  Pencil,
  Trash2,
  CalendarCheck,
  AlertCircle,
  Clock,
  Repeat,
  Loader2,
} from 'lucide-react';
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
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const targetKey = `${month}-${year}-${fetchKey}`;
  const isLoading = loadedKey !== targetKey;

  // Form state
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formIsRecurring, setFormIsRecurring] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!initialized) return;

    let cancelled = false;

    api.bills.list({ month, year }).then((result) => {
      if (cancelled) return;
      if (result.data) {
        setBills(result.data.bills);
        setLoadError(false);
      } else {
        setLoadError(true);
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
    setFormIsRecurring(false);
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
    setFormIsRecurring(bill.isRecurring);
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
    if (saving || !validateForm()) return;
    setSaving(true);

    if (editingBill) {
      const result = await api.bills.update(editingBill.id, {
        name: formName.trim(),
        amount: Number(formAmount),
        dueDate: Number(formDueDate),
        isRecurring: formIsRecurring,
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
        isRecurring: formIsRecurring,
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
    setSaving(false);
  };

  const handleTogglePaid = async (bill: Bill) => {
    const result = await api.bills.update(bill.id, { isPaid: !bill.isPaid });
    if (result.data) {
      setBills((prev) => prev.map((b) => (b.id === bill.id ? { ...b, isPaid: !bill.isPaid } : b)));
    } else {
      toast.error(t(locale, 'failedSave'));
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const deletedBill = bills.find((b) => b.id === deleteId);
    const result = await api.bills.delete(deleteId);
    if (result.data) {
      setBills((prev) => prev.filter((b) => b.id !== deleteId));
      toast.success(t(locale, 'billDeleted'), {
        action: deletedBill
          ? {
              label: t(locale, 'undo'),
              onClick: async () => {
                await api.bills.create({
                  name: deletedBill.name,
                  amount: deletedBill.amount,
                  dueDate: deletedBill.dueDate,
                  isPaid: deletedBill.isPaid,
                  month: deletedBill.month,
                  year: deletedBill.year,
                  isRecurring: deletedBill.isRecurring,
                });
                setFetchKey((k) => k + 1);
                toast.success(t(locale, 'itemRestored'));
              },
            }
          : undefined,
      });
    }
    setDeleteId(null);
  };

  const handleGenerateRecurring = async () => {
    const result = await api.bills.generateRecurring(month, year);
    if (result.data && result.data.generated > 0) {
      toast.success(t(locale, 'generatedBills').replace('{count}', String(result.data.generated)));
      refetch();
    } else {
      toast.info(
        locale === 'id'
          ? 'Tidak ada tagihan berulang untuk dibuat'
          : 'No recurring bills to generate'
      );
    }
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
            <div
              key={i}
              className="border-border bg-card shadow-card h-20 animate-pulse rounded-2xl border"
            />
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
          {loadError ? (
            <motion.div key="error" {...fadeInUp}>
              <InlineError
                message={t(locale, 'error')}
                onRetry={refetch}
                retryLabel={t(locale, 'tryAgain')}
              />
            </motion.div>
          ) : bills.length === 0 ? (
            <motion.div key="empty" {...fadeInUp}>
              <EmptyState
                title={t(locale, 'noBills')}
                icon={<CalendarCheck className="h-12 w-12" />}
              >
                <div className="flex flex-col items-center gap-2">
                  <Button onClick={openAdd} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t(locale, 'addBill')}
                  </Button>
                  <Button variant="outline" onClick={handleGenerateRecurring} className="gap-2">
                    <Repeat className="h-4 w-4" />
                    {t(locale, 'generateBills')}
                  </Button>
                </div>
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
                      'group border-border bg-card shadow-card hover:shadow-card-hover flex items-center gap-3 rounded-2xl border p-4 transition-all duration-300',
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
                          <span className="bg-danger-soft text-danger-soft-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase">
                            <AlertCircle className="h-3 w-3" />
                            {t(locale, 'overdue')}
                          </span>
                        )}
                        {status === 'dueSoon' && (
                          <span className="bg-warning-soft text-warning-soft-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase">
                            <Clock className="h-3 w-3" />
                            {t(locale, 'dueSoon')}
                          </span>
                        )}
                        {bill.isRecurring && (
                          <span className="bg-info-soft text-info-soft-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase">
                            <Repeat className="h-3 w-3" />
                            {t(locale, 'recurringBill')}
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {t(locale, 'dueDate')}: {bill.dueDate}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'font-mono text-sm font-medium tabular-nums',
                        bill.isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                      )}
                    >
                      {formatCurrency(bill.amount)}
                    </span>
                    <div className="flex gap-1 transition-opacity pointer-fine:opacity-0 pointer-fine:group-focus-within:opacity-100 pointer-fine:group-hover:opacity-100">
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
            <div className="flex items-center gap-2">
              <Checkbox
                id="bill-recurring"
                checked={formIsRecurring}
                onCheckedChange={(checked) => setFormIsRecurring(checked === true)}
              />
              <Label htmlFor="bill-recurring" className="cursor-pointer text-sm">
                {t(locale, 'markAsRecurring')}
              </Label>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} disabled={saving} className="flex-1">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
        description={t(locale, 'deleteConfirmDescription')}
        confirmLabel={t(locale, 'delete')}
        cancelLabel={t(locale, 'cancel')}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

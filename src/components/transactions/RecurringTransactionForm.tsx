'use client';

import { useState, useEffect } from 'react';
import { RecurringTransaction, Category, PaymentMethod } from '@/lib/types';
import { parseCurrencyInput, formatCurrencyInput } from '@/lib/formatters';
import { api } from '@/lib/api/client';
import { t, useLocale } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface RecurringTransactionFormProps {
  recurringTransaction?: RecurringTransaction;
  onClose: () => void;
}

export function RecurringTransactionForm({
  recurringTransaction,
  onClose,
}: RecurringTransactionFormProps) {
  const locale = useLocale();

  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    api.categories.list().then((r) => {
      if (r.data) setCategories(r.data.categories);
    });
    api.paymentMethods.list().then((r) => {
      if (r.data) setPaymentMethods(r.data.paymentMethods);
    });
  }, []);

  const [type, setType] = useState<'income' | 'expense'>(recurringTransaction?.type || 'expense');
  const [description, setDescription] = useState(recurringTransaction?.description || '');
  const [amountStr, setAmountStr] = useState(
    recurringTransaction ? formatCurrencyInput(recurringTransaction.amount) : ''
  );
  const [category, setCategory] = useState(recurringTransaction?.categoryId || '');
  const [paymentMethod, setPaymentMethod] = useState(recurringTransaction?.paymentMethod || '');
  const [frequency, setFrequency] = useState<RecurringTransaction['frequency']>(
    recurringTransaction?.frequency || 'monthly'
  );
  const [startDate, setStartDate] = useState(
    recurringTransaction?.startDate || new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(recurringTransaction?.endDate || '');
  const [notes, setNotes] = useState(recurringTransaction?.notes || '');
  const [submitting, setSubmitting] = useState(false);

  const filteredCategories = categories.filter((c) => c.type === type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseCurrencyInput(amountStr);
    if (!description || amount <= 0 || !category || !paymentMethod) return;

    const selectedCategory = categories.find((c) => c.id === category);
    const categoryName = selectedCategory?.name || '';

    const data = {
      description,
      category: categoryName,
      categoryId: category,
      type,
      amount,
      paymentMethod,
      notes,
      frequency,
      startDate,
      endDate: endDate || null,
      nextDueDate: recurringTransaction?.nextDueDate || startDate,
      isActive: recurringTransaction?.isActive ?? true,
    };

    setSubmitting(true);
    try {
      if (recurringTransaction?.id) {
        const result = await api.recurringTransactions.update(recurringTransaction.id, data);
        if (result.error) throw new Error(result.error.message);
        toast.success(t(locale, 'recurringUpdated'));
      } else {
        const result = await api.recurringTransactions.create(data);
        if (result.error) throw new Error(result.error.message);
        toast.success(t(locale, 'recurringAdded'));
      }
      onClose();
    } catch {
      toast.error(t(locale, 'failedSave'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Type toggle */}
      <div className="flex gap-2">
        {(['expense', 'income'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setType(t);
              setCategory('');
            }}
            className={cn(
              'flex-1 rounded-lg border py-2 text-sm font-medium transition-colors',
              type === t
                ? t === 'income'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                  : 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                : 'border-border text-muted-foreground hover:bg-muted'
            )}
          >
            {t === 'income' ? 'Income' : 'Expense'}
          </button>
        ))}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label>{t(locale, 'description')}</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t(locale, 'description')}
          required
        />
      </div>

      {/* Amount */}
      <div className="space-y-1.5">
        <Label>{t(locale, 'amount')}</Label>
        <Input
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
          placeholder="0"
          className="font-mono"
          inputMode="numeric"
          required
        />
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label>{t(locale, 'category')}</Label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          required
        >
          <option value="">{t(locale, 'category')}</option>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Payment Method */}
      <div className="space-y-1.5">
        <Label>{t(locale, 'paymentMethod')}</Label>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          required
        >
          <option value="">{t(locale, 'paymentMethod')}</option>
          {paymentMethods.map((pm) => (
            <option key={pm.id} value={pm.name}>
              {pm.name}
            </option>
          ))}
        </select>
      </div>

      {/* Frequency */}
      <div className="space-y-1.5">
        <Label>{t(locale, 'frequency')}</Label>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as RecurringTransaction['frequency'])}
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
        >
          <option value="daily">{t(locale, 'daily')}</option>
          <option value="weekly">{t(locale, 'weekly')}</option>
          <option value="monthly">{t(locale, 'monthly')}</option>
          <option value="yearly">{t(locale, 'yearly')}</option>
        </select>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>{t(locale, 'startDate')}</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t(locale, 'endDate')}</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label>{t(locale, 'notes')}</Label>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t(locale, 'notes')}
        />
      </div>

      {/* Submit */}
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {recurringTransaction?.id ? t(locale, 'save') : t(locale, 'addRecurring')}
      </Button>
    </form>
  );
}

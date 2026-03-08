'use client';

import { useState } from 'react';
import { useStore } from '@/store';
import { Transaction } from '@/lib/types';
import { parseCurrencyInput, formatCurrencyInput } from '@/lib/formatters';
import { validateTransactionForm, getFieldError, type FieldError } from '@/lib/validation';
import { t, useLocale } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface TransactionFormProps {
  transaction?: Transaction;
  onClose: () => void;
}

export function TransactionForm({ transaction, onClose }: TransactionFormProps) {
  const addTransaction = useStore((s) => s.addTransaction);
  const updateTransaction = useStore((s) => s.updateTransaction);
  const categories = useStore((s) => s.categories);
  const paymentMethods = useStore((s) => s.paymentMethods);
  const month = useStore((s) => s.ui.selectedMonth);
  const year = useStore((s) => s.ui.selectedYear);
  const locale = useLocale();

  const [type, setType] = useState<'income' | 'expense'>(transaction?.type || 'expense');
  const [description, setDescription] = useState(transaction?.description || '');
  const [amountStr, setAmountStr] = useState(
    transaction ? formatCurrencyInput(transaction.amount) : ''
  );
  const [category, setCategory] = useState(transaction?.category || '');
  const [paymentMethod, setPaymentMethod] = useState(transaction?.paymentMethod || '');
  const [date, setDate] = useState(
    transaction?.date || `${year}-${String(month + 1).padStart(2, '0')}-01`
  );
  const [notes, setNotes] = useState(transaction?.notes || '');
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const filteredCategories = categories.filter((c) => c.type === type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateTransactionForm(
      { type, amount: amountStr, description, date, category, paymentMethod, notes },
      locale
    );

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setErrors([]);

    const amount = parseCurrencyInput(amountStr);
    const data = { date, description, category, type, amount, paymentMethod, notes };

    try {
      if (transaction) {
        updateTransaction(transaction.id, data);
        toast.success(locale === 'id' ? 'Transaksi diperbarui' : 'Transaction updated');
      } else {
        addTransaction(data);
        toast.success(locale === 'id' ? 'Transaksi ditambahkan' : 'Transaction added');
      }
      onClose();
    } catch {
      toast.error(locale === 'id' ? 'Gagal menyimpan' : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldError = (field: string) => getFieldError(errors, field);

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Type toggle */}
      <div
        className="border-border flex rounded-lg border p-1"
        role="radiogroup"
        aria-label="Transaction type"
      >
        {(['expense', 'income'] as const).map((tp) => (
          <button
            key={tp}
            type="button"
            role="radio"
            aria-checked={type === tp}
            onClick={() => {
              setType(tp);
              setCategory('');
            }}
            className={cn(
              'flex-1 rounded-md py-2 text-sm font-medium transition-colors',
              type === tp
                ? tp === 'income'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-red-500 text-white'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            {tp === 'income'
              ? locale === 'id'
                ? 'Pemasukan'
                : 'Income'
              : locale === 'id'
                ? 'Pengeluaran'
                : 'Expense'}
          </button>
        ))}
      </div>

      {/* Amount */}
      <div>
        <Label htmlFor="amount">{t(locale, 'amount')}</Label>
        <div className="relative mt-1">
          <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 font-mono text-sm">
            Rp
          </span>
          <Input
            id="amount"
            value={amountStr}
            onChange={(e) => {
              const num = parseCurrencyInput(e.target.value);
              setAmountStr(num > 0 ? formatCurrencyInput(num) : '');
              if (fieldError('amount')) setErrors(errors.filter((e) => e.field !== 'amount'));
            }}
            className={cn('pl-10 font-mono text-lg', fieldError('amount') && 'border-red-500')}
            placeholder="0"
            inputMode="numeric"
            aria-invalid={!!fieldError('amount')}
            aria-describedby={fieldError('amount') ? 'amount-error' : undefined}
          />
        </div>
        {fieldError('amount') && (
          <p id="amount-error" className="mt-1 text-xs text-red-500">
            {fieldError('amount')}
          </p>
        )}
      </div>

      {/* Date & Category */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="date">{t(locale, 'date')}</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={cn('mt-1', fieldError('date') && 'border-red-500')}
            aria-invalid={!!fieldError('date')}
          />
          {fieldError('date') && <p className="mt-1 text-xs text-red-500">{fieldError('date')}</p>}
        </div>
        <div>
          <Label htmlFor="category">{t(locale, 'category')}</Label>
          <select
            id="category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              if (fieldError('category')) setErrors(errors.filter((e) => e.field !== 'category'));
            }}
            className={cn(
              'bg-background mt-1 w-full rounded-md border px-3 py-2 text-sm',
              fieldError('category') ? 'border-red-500' : 'border-input'
            )}
            aria-invalid={!!fieldError('category')}
          >
            <option value="">{locale === 'id' ? 'Pilih...' : 'Select...'}</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          {fieldError('category') && (
            <p className="mt-1 text-xs text-red-500">{fieldError('category')}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">{t(locale, 'description')}</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            if (fieldError('description'))
              setErrors(errors.filter((e) => e.field !== 'description'));
          }}
          className={cn('mt-1', fieldError('description') && 'border-red-500')}
          aria-invalid={!!fieldError('description')}
        />
        {fieldError('description') && (
          <p className="mt-1 text-xs text-red-500">{fieldError('description')}</p>
        )}
      </div>

      {/* Payment Method */}
      <div>
        <Label htmlFor="paymentMethod">{t(locale, 'paymentMethod')}</Label>
        <select
          id="paymentMethod"
          value={paymentMethod}
          onChange={(e) => {
            setPaymentMethod(e.target.value);
            if (fieldError('paymentMethod'))
              setErrors(errors.filter((e) => e.field !== 'paymentMethod'));
          }}
          className={cn(
            'bg-background mt-1 w-full rounded-md border px-3 py-2 text-sm',
            fieldError('paymentMethod') ? 'border-red-500' : 'border-input'
          )}
          aria-invalid={!!fieldError('paymentMethod')}
        >
          <option value="">{locale === 'id' ? 'Pilih...' : 'Select...'}</option>
          {paymentMethods.map((p) => (
            <option key={p.id} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
        {fieldError('paymentMethod') && (
          <p className="mt-1 text-xs text-red-500">{fieldError('paymentMethod')}</p>
        )}
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">{t(locale, 'notes')}</Label>
        <Input
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onClose}
          disabled={submitting}
        >
          {t(locale, 'cancel')}
        </Button>
        <Button type="submit" className="flex-1 gap-2" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {t(locale, 'save')}
        </Button>
      </div>
    </form>
  );
}

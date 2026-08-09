'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/store';
import { Transaction, Category, PaymentMethod } from '@/lib/types';
import { parseCurrencyInput, formatCurrencyInput } from '@/lib/formatters';
import { validateTransactionForm, getFieldError, type FieldError } from '@/lib/validation';
import { api } from '@/lib/api/client';
import { t, useLocale } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PaymentMethodIcon } from '@/components/shared/PaymentMethodIcon';

interface TransactionFormProps {
  transaction?: Transaction;
  initialType?: 'income' | 'expense';
  onClose: () => void;
}

export function TransactionForm({
  transaction,
  initialType = 'expense',
  onClose,
}: TransactionFormProps) {
  const month = useStore((s) => s.ui.selectedMonth);
  const year = useStore((s) => s.ui.selectedYear);
  const locale = useLocale();

  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    api.categories.list().then((r) => {
      // Archived categories are hidden from new-transaction pickers;
      // existing transactions keep their category via free-text `category`.
      if (r.data) setCategories(r.data.categories.filter((c) => !c.archived));
    });
    api.paymentMethods.list().then((r) => {
      if (r.data) setPaymentMethods(r.data.paymentMethods);
    });
  }, []);

  const [type, setType] = useState<'income' | 'expense'>(transaction?.type || initialType);
  const [description, setDescription] = useState(transaction?.description || '');
  const [amountStr, setAmountStr] = useState(
    transaction ? formatCurrencyInput(transaction.amount) : ''
  );
  const [category, setCategory] = useState(transaction?.categoryId || '');
  const [paymentMethod, setPaymentMethod] = useState(transaction?.paymentMethod || '');
  const [date, setDate] = useState(
    transaction?.date || `${year}-${String(month + 1).padStart(2, '0')}-01`
  );
  const [notes, setNotes] = useState(transaction?.notes || '');
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [pastDescriptions, setPastDescriptions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api.transactions.list().then((r) => {
      if (r.data) {
        const unique = Array.from(
          new Set(r.data.transactions.map((tx) => tx.description).filter(Boolean))
        ).sort((a, b) => a.localeCompare(b));
        setPastDescriptions(unique);
      }
    });
  }, []);

  const descriptionSuggestions =
    description.trim().length > 0 && showSuggestions
      ? pastDescriptions
          .filter((d) => d.toLowerCase().includes(description.toLowerCase()))
          .slice(0, 5)
      : [];

  const handleSelectSuggestion = useCallback(
    (value: string) => {
      setDescription(value);
      setShowSuggestions(false);
      if (fieldError('description'))
        setErrors((prev) => prev.filter((e) => e.field !== 'description'));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [errors]
  );

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
    const selectedCategory = categories.find((c) => c.id === category);
    const categoryName = selectedCategory?.name || '';
    const data = {
      date,
      description,
      category: categoryName,
      categoryId: category,
      type,
      amount,
      paymentMethod,
      notes,
    };

    try {
      if (transaction?.id) {
        const result = await api.transactions.update(transaction.id, data);
        if (result.error) throw new Error(result.error.message);
        toast.success(t(locale, 'transactionUpdated'));
      } else {
        const result = await api.transactions.create(data);
        if (result.error) throw new Error(result.error.message);
        toast.success(t(locale, 'transactionAdded'));
      }
      onClose();
    } catch {
      toast.error(t(locale, 'failedSave'));
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
        aria-label={t(locale, 'transactionType')}
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
            {tp === 'income' ? t(locale, 'income') : t(locale, 'expense')}
          </button>
        ))}
      </div>

      {/* Amount */}
      <div>
        <Label htmlFor="amount">
          {t(locale, 'amount')}
          <span className="ml-0.5 text-red-500">*</span>
        </Label>
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
          <Label htmlFor="date">
            {t(locale, 'date')}
            <span className="ml-0.5 text-red-500">*</span>
          </Label>
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
          <Label htmlFor="category">
            {t(locale, 'category')}
            <span className="ml-0.5 text-red-500">*</span>
          </Label>
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
            <option value="">{t(locale, 'selectPlaceholder')}</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
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
        <Label htmlFor="description">
          {t(locale, 'description')}
          <span className="ml-0.5 text-red-500">*</span>
        </Label>
        <div className="relative">
          <Input
            id="description"
            ref={descriptionRef}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setShowSuggestions(true);
              if (fieldError('description'))
                setErrors(errors.filter((e) => e.field !== 'description'));
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              blurTimeoutRef.current = setTimeout(() => setShowSuggestions(false), 150);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowSuggestions(false);
            }}
            className={cn('mt-1', fieldError('description') && 'border-red-500')}
            aria-invalid={!!fieldError('description')}
            autoComplete="off"
          />
          {descriptionSuggestions.length > 0 && (
            <div className="border-border bg-card absolute z-10 mt-1 w-full rounded-lg border shadow-lg">
              {descriptionSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="hover:bg-muted w-full px-3 py-2 text-left text-sm transition-colors"
                  onMouseDown={() => {
                    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
                  }}
                  onClick={() => handleSelectSuggestion(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        {fieldError('description') && (
          <p className="mt-1 text-xs text-red-500">{fieldError('description')}</p>
        )}
      </div>

      {/* Payment Method */}
      <div>
        <Label htmlFor="paymentMethod">
          {t(locale, 'paymentMethod')}
          <span className="ml-0.5 text-red-500">*</span>
        </Label>
        <Select
          value={paymentMethod}
          onValueChange={(val) => {
            if (val !== null) {
              setPaymentMethod(val);
              if (fieldError('paymentMethod'))
                setErrors(errors.filter((e) => e.field !== 'paymentMethod'));
            }
          }}
        >
          <SelectTrigger
            id="paymentMethod"
            className={cn('mt-1 w-full', fieldError('paymentMethod') ? 'border-red-500' : '')}
            aria-invalid={!!fieldError('paymentMethod')}
          >
            <SelectValue placeholder={t(locale, 'selectPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {paymentMethods.map((p) => (
              <SelectItem key={p.id} value={p.name}>
                <PaymentMethodIcon
                  name={p.name}
                  icon={p.icon}
                  type={p.type}
                  size="sm"
                  aria-hidden="true"
                />
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

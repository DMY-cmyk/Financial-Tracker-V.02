'use client';

import { useState } from 'react';
import { useStore } from '@/store';
import { Transaction } from '@/lib/types';
import { parseCurrencyInput, formatCurrencyInput } from '@/lib/formatters';
import { t, useLocale } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface TransactionFormProps {
  transaction?: Transaction;
  onClose: () => void;
}

export function TransactionForm({ transaction, onClose }: TransactionFormProps) {
  const addTransaction = useStore(s => s.addTransaction);
  const updateTransaction = useStore(s => s.updateTransaction);
  const categories = useStore(s => s.categories);
  const paymentMethods = useStore(s => s.paymentMethods);
  const month = useStore(s => s.ui.selectedMonth);
  const year = useStore(s => s.ui.selectedYear);
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

  const filteredCategories = categories.filter(c => c.type === type);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseCurrencyInput(amountStr);
    if (!description || !amount || !category || !paymentMethod) return;

    const data = { date, description, category, type, amount, paymentMethod, notes };

    if (transaction) {
      updateTransaction(transaction.id, data);
    } else {
      addTransaction(data);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex rounded-lg border border-border p-1">
        {(['expense', 'income'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setType(t); setCategory(''); }}
            className={cn(
              'flex-1 rounded-md py-2 text-sm font-medium transition-colors',
              type === t
                ? t === 'income'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-red-500 text-white'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            {t === 'income' ? 'Income' : 'Expense'}
          </button>
        ))}
      </div>

      <div>
        <Label>{t(locale, 'amount')}</Label>
        <div className="relative mt-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">
            Rp
          </span>
          <Input
            value={amountStr}
            onChange={(e) => {
              const num = parseCurrencyInput(e.target.value);
              setAmountStr(num > 0 ? formatCurrencyInput(num) : '');
            }}
            className="pl-10 font-mono text-lg"
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t(locale, 'date')}</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>{t(locale, 'category')}</Label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select...</option>
            {filteredCategories.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label>{t(locale, 'description')}</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" />
      </div>

      <div>
        <Label>{t(locale, 'paymentMethod')}</Label>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Select...</option>
          {paymentMethods.map(p => (
            <option key={p.id} value={p.name}>{p.name}</option>
          ))}
        </select>
      </div>

      <div>
        <Label>{t(locale, 'notes')}</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
          {t(locale, 'cancel')}
        </Button>
        <Button type="submit" className="flex-1">
          {t(locale, 'save')}
        </Button>
      </div>
    </form>
  );
}

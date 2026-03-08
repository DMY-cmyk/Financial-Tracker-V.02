'use client';

import { useState } from 'react';
import { useStore } from '@/store';
import { t, useLocale } from '@/lib/i18n';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PALETTE_COLORS } from '@/lib/constants';
import { Plus, Trash2 } from 'lucide-react';
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/formatters';

export default function CategoriesPage() {
  const categories = useStore((s) => s.categories);
  const paymentMethods = useStore((s) => s.paymentMethods);
  const addCategory = useStore((s) => s.addCategory);
  const deleteCategory = useStore((s) => s.deleteCategory);
  const updateCategory = useStore((s) => s.updateCategory);
  const addPaymentMethod = useStore((s) => s.addPaymentMethod);
  const deletePaymentMethod = useStore((s) => s.deletePaymentMethod);
  const locale = useLocale();

  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');
  const [newCatColor, setNewCatColor] = useState(PALETTE_COLORS[0]);
  const [newCatBudget, setNewCatBudget] = useState('');

  const [newMethodName, setNewMethodName] = useState('');
  const [newMethodType, setNewMethodType] = useState<'bank' | 'cash' | 'ewallet'>('bank');

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  const handleAddCategory = () => {
    if (!newCatName) return;
    addCategory({
      name: newCatName,
      type: newCatType,
      color: newCatColor,
      icon: 'circle',
      budget: parseCurrencyInput(newCatBudget),
    });
    setNewCatName('');
    setNewCatBudget('');
  };

  const handleAddMethod = () => {
    if (!newMethodName) return;
    addPaymentMethod({ name: newMethodName, icon: 'wallet', type: newMethodType });
    setNewMethodName('');
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title={t(locale, 'categories')} />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Expense Categories */}
        <div className="border-border bg-card rounded-2xl border p-6">
          <h3 className="mb-4 text-sm font-semibold">{t(locale, 'expenseCategories')}</h3>
          <div className="space-y-2">
            {expenseCategories.map((c) => (
              <div key={c.id} className="hover:bg-muted/50 flex items-center gap-2 rounded-lg p-2">
                <div className="h-4 w-4 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="flex-1 text-sm">{c.name}</span>
                <Input
                  className="w-28 font-mono text-xs"
                  value={c.budget > 0 ? formatCurrencyInput(c.budget) : ''}
                  placeholder={t(locale, 'budget')}
                  onChange={(e) => {
                    const budget = parseCurrencyInput(e.target.value);
                    updateCategory(c.id, { budget });
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive h-7 w-7"
                  onClick={() => deleteCategory(c.id)}
                  aria-label={t(locale, 'delete')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Income Categories */}
        <div className="border-border bg-card rounded-2xl border p-6">
          <h3 className="mb-4 text-sm font-semibold">{t(locale, 'incomeSources')}</h3>
          <div className="space-y-2">
            {incomeCategories.map((c) => (
              <div key={c.id} className="hover:bg-muted/50 flex items-center gap-2 rounded-lg p-2">
                <div className="h-4 w-4 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="flex-1 text-sm">{c.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive h-7 w-7"
                  onClick={() => deleteCategory(c.id)}
                  aria-label={t(locale, 'delete')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Category */}
      <div className="border-border bg-card rounded-2xl border p-6">
        <h3 className="mb-4 text-sm font-semibold">{t(locale, 'addCategory')}</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">{t(locale, 'type')}</label>
            <select
              value={newCatType}
              onChange={(e) => setNewCatType(e.target.value as 'expense' | 'income')}
              className="border-input bg-background rounded-md border px-3 py-2 text-sm"
            >
              <option value="expense">{t(locale, 'expense')}</option>
              <option value="income">{t(locale, 'income')}</option>
            </select>
          </div>
          <div className="min-w-[120px] flex-1">
            <label className="text-muted-foreground mb-1 block text-xs">{t(locale, 'name')}</label>
            <Input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder={t(locale, 'categoryName')}
            />
          </div>
          <div className="flex gap-1">
            {PALETTE_COLORS.slice(0, 6).map((color) => (
              <button
                key={color}
                onClick={() => setNewCatColor(color)}
                className={`h-6 w-6 rounded-full border-2 ${newCatColor === color ? 'border-foreground' : 'border-transparent'}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          {newCatType === 'expense' && (
            <div className="w-28">
              <label className="text-muted-foreground mb-1 block text-xs">
                {t(locale, 'budget')}
              </label>
              <Input
                value={newCatBudget}
                onChange={(e) => setNewCatBudget(e.target.value)}
                placeholder="0"
                className="font-mono"
              />
            </div>
          )}
          <Button onClick={handleAddCategory} className="gap-1">
            <Plus className="h-4 w-4" /> {t(locale, 'add')}
          </Button>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="border-border bg-card rounded-2xl border p-6">
        <h3 className="mb-4 text-sm font-semibold">{t(locale, 'paymentMethods')}</h3>
        <div className="mb-4 space-y-2">
          {paymentMethods.map((m) => (
            <div key={m.id} className="hover:bg-muted/50 flex items-center gap-2 rounded-lg p-2">
              <span className="flex-1 text-sm">{m.name}</span>
              <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px]">
                {m.type}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive h-7 w-7"
                onClick={() => deletePaymentMethod(m.id)}
                aria-label={t(locale, 'delete')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Input
              value={newMethodName}
              onChange={(e) => setNewMethodName(e.target.value)}
              placeholder={t(locale, 'methodName')}
            />
          </div>
          <select
            value={newMethodType}
            onChange={(e) => setNewMethodType(e.target.value as 'bank' | 'cash' | 'ewallet')}
            className="border-input bg-background rounded-md border px-3 py-2 text-sm"
          >
            <option value="bank">Bank</option>
            <option value="cash">Cash</option>
            <option value="ewallet">E-Wallet</option>
          </select>
          <Button onClick={handleAddMethod} className="gap-1">
            <Plus className="h-4 w-4" /> {t(locale, 'add')}
          </Button>
        </div>
      </div>
    </div>
  );
}

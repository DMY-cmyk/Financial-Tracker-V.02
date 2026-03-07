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
  const categories = useStore(s => s.categories);
  const paymentMethods = useStore(s => s.paymentMethods);
  const addCategory = useStore(s => s.addCategory);
  const deleteCategory = useStore(s => s.deleteCategory);
  const updateCategory = useStore(s => s.updateCategory);
  const addPaymentMethod = useStore(s => s.addPaymentMethod);
  const deletePaymentMethod = useStore(s => s.deletePaymentMethod);
  const locale = useLocale();

  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');
  const [newCatColor, setNewCatColor] = useState(PALETTE_COLORS[0]);
  const [newCatBudget, setNewCatBudget] = useState('');

  const [newMethodName, setNewMethodName] = useState('');
  const [newMethodType, setNewMethodType] = useState<'bank' | 'cash' | 'ewallet'>('bank');

  const expenseCategories = categories.filter(c => c.type === 'expense');
  const incomeCategories = categories.filter(c => c.type === 'income');

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
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold">Expense {t(locale, 'categories')}</h3>
          <div className="space-y-2">
            {expenseCategories.map(c => (
              <div key={c.id} className="flex items-center gap-2 rounded-lg p-2 hover:bg-muted/50">
                <div className="h-4 w-4 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="flex-1 text-sm">{c.name}</span>
                <Input
                  className="w-28 text-xs font-mono"
                  value={c.budget > 0 ? formatCurrencyInput(c.budget) : ''}
                  placeholder="Budget"
                  onChange={(e) => {
                    const budget = parseCurrencyInput(e.target.value);
                    updateCategory(c.id, { budget });
                  }}
                />
                <Button
                  variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                  onClick={() => deleteCategory(c.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Income Categories */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold">Income Sources</h3>
          <div className="space-y-2">
            {incomeCategories.map(c => (
              <div key={c.id} className="flex items-center gap-2 rounded-lg p-2 hover:bg-muted/50">
                <div className="h-4 w-4 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="flex-1 text-sm">{c.name}</span>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                  onClick={() => deleteCategory(c.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Category */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold">Add Category</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Type</label>
            <select
              value={newCatType}
              onChange={(e) => setNewCatType(e.target.value as 'expense' | 'income')}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="mb-1 block text-xs text-muted-foreground">Name</label>
            <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Category name" />
          </div>
          <div className="flex gap-1">
            {PALETTE_COLORS.slice(0, 6).map(color => (
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
              <label className="mb-1 block text-xs text-muted-foreground">Budget</label>
              <Input
                value={newCatBudget}
                onChange={(e) => setNewCatBudget(e.target.value)}
                placeholder="0"
                className="font-mono"
              />
            </div>
          )}
          <Button onClick={handleAddCategory} className="gap-1">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold">{t(locale, 'paymentMethods')}</h3>
        <div className="space-y-2 mb-4">
          {paymentMethods.map(m => (
            <div key={m.id} className="flex items-center gap-2 rounded-lg p-2 hover:bg-muted/50">
              <span className="flex-1 text-sm">{m.name}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{m.type}</span>
              <Button
                variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                onClick={() => deletePaymentMethod(m.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Input value={newMethodName} onChange={(e) => setNewMethodName(e.target.value)} placeholder="Method name" />
          </div>
          <select
            value={newMethodType}
            onChange={(e) => setNewMethodType(e.target.value as 'bank' | 'cash' | 'ewallet')}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="bank">Bank</option>
            <option value="cash">Cash</option>
            <option value="ewallet">E-Wallet</option>
          </select>
          <Button onClick={handleAddMethod} className="gap-1">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>
    </div>
  );
}

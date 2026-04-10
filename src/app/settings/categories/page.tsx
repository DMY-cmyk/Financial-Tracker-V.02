'use client';

import { useState, useEffect, useCallback } from 'react';
import { t, useLocale } from '@/lib/i18n';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageTransition } from '@/components/shared/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PALETTE_COLORS } from '@/lib/constants';
import {
  Plus,
  Trash2,
  Loader2,
  GripVertical,
  ShoppingCart,
  Coffee,
  Car,
  Home,
  Zap,
  Heart,
  Music,
  Gamepad2,
  GraduationCap,
  Briefcase,
  Gift,
  Utensils,
  Shirt,
  Phone,
  Plane,
  Stethoscope,
  Dumbbell,
  BookOpen,
  Palette,
  Wrench,
  Circle,
  Pencil,
} from 'lucide-react';
import { Reorder } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/formatters';
import { toast } from 'sonner';
import type { Category, PaymentMethod } from '@/lib/types';
import { IconPicker } from '@/components/shared/IconPicker';

const ICON_OPTIONS: { name: string; icon: typeof Circle }[] = [
  { name: 'circle', icon: Circle },
  { name: 'shopping-cart', icon: ShoppingCart },
  { name: 'coffee', icon: Coffee },
  { name: 'car', icon: Car },
  { name: 'home', icon: Home },
  { name: 'zap', icon: Zap },
  { name: 'heart', icon: Heart },
  { name: 'music', icon: Music },
  { name: 'gamepad', icon: Gamepad2 },
  { name: 'graduation', icon: GraduationCap },
  { name: 'briefcase', icon: Briefcase },
  { name: 'gift', icon: Gift },
  { name: 'utensils', icon: Utensils },
  { name: 'shirt', icon: Shirt },
  { name: 'phone', icon: Phone },
  { name: 'plane', icon: Plane },
  { name: 'health', icon: Stethoscope },
  { name: 'fitness', icon: Dumbbell },
  { name: 'book', icon: BookOpen },
  { name: 'art', icon: Palette },
  { name: 'tools', icon: Wrench },
];

function getIconComponent(iconName: string) {
  const match = ICON_OPTIONS.find((o) => o.name === iconName);
  return match ? match.icon : Circle;
}

export default function CategoriesPage() {
  const locale = useLocale();

  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [fetchCount, setFetchCount] = useState(0);
  const [loadedCount, setLoadedCount] = useState(-1);
  const loading = loadedCount !== fetchCount;

  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');
  const [newCatColor, setNewCatColor] = useState(PALETTE_COLORS[0]);
  const [newCatIcon, setNewCatIcon] = useState('circle');
  const [newCatBudget, setNewCatBudget] = useState('');
  const [addingCat, setAddingCat] = useState(false);

  const [newMethodName, setNewMethodName] = useState('');
  const [newMethodType, setNewMethodType] = useState<'bank' | 'cash' | 'ewallet'>('bank');
  const [newMethodBeginningBalance, setNewMethodBeginningBalance] = useState('');
  const [newMethodIcon, setNewMethodIcon] = useState('initials');
  const [addingMethod, setAddingMethod] = useState(false);

  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'bank' | 'cash' | 'ewallet'>('bank');
  const [editBeginningBalance, setEditBeginningBalance] = useState('');
  const [editIcon, setEditIcon] = useState('initials');
  const [savingEdit, setSavingEdit] = useState(false);

  const refetch = useCallback(() => setFetchCount((c) => c + 1), []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.categories.list(), api.paymentMethods.list()]).then(
      ([catResult, pmResult]) => {
        if (cancelled) return;
        if (catResult.data) setCategories(catResult.data.categories);
        if (pmResult.data) setPaymentMethods(pmResult.data.paymentMethods);
        setLoadedCount(fetchCount);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [fetchCount]);

  const [expenseOrder, setExpenseOrder] = useState<string[]>([]);
  const [incomeOrder, setIncomeOrder] = useState<string[]>([]);

  const expenseCategories = (() => {
    const items = categories.filter((c) => c.type === 'expense');
    if (expenseOrder.length === 0) return items;
    const map = new Map(items.map((c) => [c.id, c]));
    const ordered: Category[] = [];
    for (const id of expenseOrder) {
      const item = map.get(id);
      if (item) {
        ordered.push(item);
        map.delete(id);
      }
    }
    for (const item of map.values()) ordered.push(item);
    return ordered;
  })();

  const incomeCategories = (() => {
    const items = categories.filter((c) => c.type === 'income');
    if (incomeOrder.length === 0) return items;
    const map = new Map(items.map((c) => [c.id, c]));
    const ordered: Category[] = [];
    for (const id of incomeOrder) {
      const item = map.get(id);
      if (item) {
        ordered.push(item);
        map.delete(id);
      }
    }
    for (const item of map.values()) ordered.push(item);
    return ordered;
  })();

  const handleReorderExpense = (reordered: Category[]) => {
    setExpenseOrder(reordered.map((c) => c.id));
  };

  const handleReorderIncome = (reordered: Category[]) => {
    setIncomeOrder(reordered.map((c) => c.id));
  };

  const handleAddCategory = async () => {
    if (!newCatName) return;
    setAddingCat(true);
    const result = await api.categories.create({
      name: newCatName,
      type: newCatType,
      color: newCatColor,
      icon: newCatIcon,
      budget: parseCurrencyInput(newCatBudget),
    });
    if (result.data) {
      setCategories((prev) => [...prev, result.data!]);
      setNewCatName('');
      setNewCatBudget('');
      setNewCatIcon('circle');
      toast.success(t(locale, 'saved'));
    } else {
      toast.error(result.error?.message || t(locale, 'failedSave'));
    }
    setAddingCat(false);
  };

  const handleUpdateBudget = async (id: string, budget: number) => {
    const result = await api.categories.update(id, { budget });
    if (result.data) {
      setCategories((prev) => prev.map((c) => (c.id === id ? result.data! : c)));
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    const result = await api.categories.delete(id);
    if (result.error) {
      toast.error(result.error.message);
      refetch();
    }
  };

  const handleAddMethod = async () => {
    if (!newMethodName) return;
    setAddingMethod(true);
    const result = await api.paymentMethods.create({
      name: newMethodName,
      icon: newMethodIcon,
      type: newMethodType,
      beginningBalance: parseCurrencyInput(newMethodBeginningBalance),
    });
    if (result.data) {
      setPaymentMethods((prev) => [...prev, result.data!]);
      setNewMethodName('');
      setNewMethodBeginningBalance('');
      setNewMethodIcon('initials');
      toast.success(t(locale, 'saved'));
    } else {
      toast.error(result.error?.message || t(locale, 'failedSave'));
    }
    setAddingMethod(false);
  };

  const handleDeleteMethod = async (id: string) => {
    setPaymentMethods((prev) => prev.filter((m) => m.id !== id));
    const result = await api.paymentMethods.delete(id);
    if (result.error) {
      toast.error(result.error.message);
      refetch();
    }
  };

  const handleOpenEdit = (method: PaymentMethod) => {
    setEditingMethod(method);
    setEditName(method.name);
    setEditType(method.type);
    setEditIcon(method.icon);
    setEditBeginningBalance(
      method.beginningBalance !== 0 ? formatCurrencyInput(method.beginningBalance) : ''
    );
  };

  const handleEditSave = async () => {
    if (!editingMethod) return;
    setSavingEdit(true);
    const result = await api.paymentMethods.update(editingMethod.id, {
      name: editName,
      type: editType,
      icon: editIcon,
      beginningBalance: parseCurrencyInput(editBeginningBalance),
    });
    if (result.data) {
      setPaymentMethods((prev) => prev.map((m) => (m.id === editingMethod.id ? result.data! : m)));
      setEditingMethod(null);
      toast.success(t(locale, 'saved'));
    } else {
      toast.error(result.error?.message || t(locale, 'failedSave'));
    }
    setSavingEdit(false);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader title={t(locale, 'categories')} />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <PageTransition className="mx-auto max-w-4xl space-y-6">
      <PageHeader title={t(locale, 'categories')} />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Expense Categories */}
        <div className="border-border bg-card rounded-2xl border p-6">
          <h3 className="mb-4 text-sm font-semibold">{t(locale, 'expenseCategories')}</h3>
          <Reorder.Group
            axis="y"
            values={expenseCategories}
            onReorder={handleReorderExpense}
            className="space-y-2"
          >
            {expenseCategories.map((c) => {
              const Icon = getIconComponent(c.icon);
              return (
                <Reorder.Item
                  value={c}
                  key={c.id}
                  className="hover:bg-muted/50 flex items-center gap-2 rounded-lg p-2"
                >
                  <GripVertical className="text-muted-foreground/40 h-4 w-4 cursor-grab" />
                  <Icon className="h-4 w-4" style={{ color: c.color }} />
                  <span className="flex-1 text-sm">{c.name}</span>
                  <Input
                    className="w-28 font-mono text-xs"
                    value={c.budget > 0 ? formatCurrencyInput(c.budget) : ''}
                    placeholder={t(locale, 'budget')}
                    onChange={(e) => {
                      const budget = parseCurrencyInput(e.target.value);
                      setCategories((prev) =>
                        prev.map((cat) => (cat.id === c.id ? { ...cat, budget } : cat))
                      );
                      handleUpdateBudget(c.id, budget);
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive h-7 w-7"
                    onClick={() => handleDeleteCategory(c.id)}
                    aria-label={t(locale, 'delete')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        </div>

        {/* Income Categories */}
        <div className="border-border bg-card rounded-2xl border p-6">
          <h3 className="mb-4 text-sm font-semibold">{t(locale, 'incomeSources')}</h3>
          <Reorder.Group
            axis="y"
            values={incomeCategories}
            onReorder={handleReorderIncome}
            className="space-y-2"
          >
            {incomeCategories.map((c) => {
              const Icon = getIconComponent(c.icon);
              return (
                <Reorder.Item
                  value={c}
                  key={c.id}
                  className="hover:bg-muted/50 flex items-center gap-2 rounded-lg p-2"
                >
                  <GripVertical className="text-muted-foreground/40 h-4 w-4 cursor-grab" />
                  <Icon className="h-4 w-4" style={{ color: c.color }} />
                  <span className="flex-1 text-sm">{c.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive h-7 w-7"
                    onClick={() => handleDeleteCategory(c.id)}
                    aria-label={t(locale, 'delete')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
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
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">
              {t(locale, 'selectIcon')}
            </label>
            <div className="flex max-w-[240px] flex-wrap gap-1">
              {ICON_OPTIONS.map((opt) => {
                const OptIcon = opt.icon;
                return (
                  <button
                    key={opt.name}
                    type="button"
                    onClick={() => setNewCatIcon(opt.name)}
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                      newCatIcon === opt.name
                        ? 'bg-primary/10 text-primary ring-primary ring-1'
                        : 'text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <OptIcon className="h-3.5 w-3.5" />
                  </button>
                );
              })}
            </div>
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
          <Button onClick={handleAddCategory} className="gap-1" disabled={addingCat}>
            {addingCat ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {t(locale, 'add')}
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
                className="h-7 w-7"
                onClick={() => handleOpenEdit(m)}
                aria-label={t(locale, 'edit')}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive h-7 w-7"
                onClick={() => handleDeleteMethod(m.id)}
                aria-label={t(locale, 'delete')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <Input
              value={newMethodName}
              onChange={(e) => setNewMethodName(e.target.value)}
              placeholder={t(locale, 'methodName')}
            />
          </div>
          <div className="w-full">
            <IconPicker
              value={newMethodIcon}
              onChange={setNewMethodIcon}
              paymentMethodName={newMethodName}
              type={newMethodType}
              locale={locale}
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
          <div>
            <Input
              className="w-36 font-mono"
              value={newMethodBeginningBalance}
              onChange={(e) =>
                setNewMethodBeginningBalance(
                  formatCurrencyInput(parseCurrencyInput(e.target.value))
                )
              }
              placeholder="0"
              aria-label={t(locale, 'beginningBalance')}
            />
            <p className="text-muted-foreground mt-1 text-xs">
              {t(locale, 'beginningBalanceHelp')}
            </p>
          </div>
          <Button onClick={handleAddMethod} className="gap-1" disabled={addingMethod}>
            {addingMethod ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {t(locale, 'add')}
          </Button>
        </div>
      </div>
      {/* Edit Payment Method Dialog */}
      <Dialog
        open={!!editingMethod}
        onOpenChange={(open) => {
          if (!open) setEditingMethod(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {t(locale, 'edit')} {editingMethod?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">
                {t(locale, 'name')}
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={t(locale, 'methodName')}
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">
                {t(locale, 'paymentMethodIcon')}
              </label>
              <IconPicker
                value={editIcon}
                onChange={setEditIcon}
                paymentMethodName={editName}
                type={editType}
                locale={locale}
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">
                {t(locale, 'type')}
              </label>
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value as 'bank' | 'cash' | 'ewallet')}
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="bank">Bank</option>
                <option value="cash">Cash</option>
                <option value="ewallet">E-Wallet</option>
              </select>
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">
                {t(locale, 'beginningBalance')}
              </label>
              <Input
                className="font-mono"
                value={editBeginningBalance}
                onChange={(e) =>
                  setEditBeginningBalance(formatCurrencyInput(parseCurrencyInput(e.target.value)))
                }
                placeholder="0"
              />
              <p className="text-muted-foreground mt-1 text-xs">
                {t(locale, 'beginningBalanceHelp')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMethod(null)}>
              {t(locale, 'cancel')}
            </Button>
            <Button onClick={handleEditSave} disabled={savingEdit || !editName}>
              {savingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t(locale, 'save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}

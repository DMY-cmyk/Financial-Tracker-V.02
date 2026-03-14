'use client';

import { useState, useRef, useEffect } from 'react';
import { t, useLocale } from '@/lib/i18n';
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface BudgetItem {
  id: string;
  category: string;
  budget: number;
  spent: number;
  remaining: number;
  color: string;
  percentage: number;
}

interface BudgetProgressProps {
  budgets: BudgetItem[];
  onUpdateBudget?: (categoryId: string, budget: number) => Promise<boolean>;
}

export function BudgetProgress({ budgets, onUpdateBudget }: BudgetProgressProps) {
  const locale = useLocale();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const startEdit = (b: BudgetItem) => {
    if (!onUpdateBudget) return;
    setEditingId(b.id);
    setEditValue(formatCurrencyInput(b.budget));
  };

  const saveEdit = async () => {
    if (!editingId || !onUpdateBudget) return;
    const amount = parseCurrencyInput(editValue);
    if (amount > 0) {
      const ok = await onUpdateBudget(editingId, amount);
      if (ok) toast.success(t(locale, 'budgetUpdated'));
    }
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="border-border bg-card rounded-2xl border p-6"
    >
      <h3 className="mb-4 text-sm font-semibold">{t(locale, 'budgetProgress')}</h3>

      {budgets.length === 0 ? (
        <div className="text-muted-foreground flex h-20 items-center justify-center text-sm">
          {t(locale, 'noData')}
        </div>
      ) : (
        <div className="space-y-4">
          {budgets.map((b) => {
            const isOver = b.percentage >= 100;
            const isWarning = b.percentage >= 80 && !isOver;
            const isEditing = editingId === b.id;

            return (
              <div key={b.id}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: b.color }}
                    />
                    <span className="font-medium">{b.category}</span>
                  </div>
                  {isEditing ? (
                    <input
                      ref={inputRef}
                      type="text"
                      className="border-border bg-background w-28 rounded border px-1.5 py-0.5 text-right font-mono text-xs"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      onBlur={saveEdit}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(b)}
                      className={cn(
                        'text-muted-foreground font-mono',
                        onUpdateBudget &&
                          'hover:text-foreground group/budget inline-flex cursor-pointer items-center gap-1 rounded px-1 transition-colors hover:bg-muted'
                      )}
                      disabled={!onUpdateBudget}
                      title={onUpdateBudget ? t(locale, 'editBudget') : undefined}
                    >
                      {formatCurrency(b.spent)} / {formatCurrency(b.budget)}
                      {onUpdateBudget && (
                        <Pencil className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover/budget:opacity-100" />
                      )}
                    </button>
                  )}
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-700 ease-out',
                      isOver ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                    )}
                    style={{ width: `${Math.min(b.percentage, 100)}%` }}
                  />
                </div>
                {isOver && (
                  <p className="mt-1 text-[10px] font-medium text-red-500">
                    {t(locale, 'overBudget')} ({formatCurrency(Math.abs(b.remaining))})
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

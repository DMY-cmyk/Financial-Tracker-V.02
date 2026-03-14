'use client';

import { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { t, useLocale } from '@/lib/i18n';
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { BudgetCategory } from '@/hooks/useBudgetData';

interface BudgetCategoryCardProps {
  category: BudgetCategory;
  onUpdateBudget: (id: string, budget: number) => Promise<boolean>;
}

export function BudgetCategoryCard({ category, onUpdateBudget }: BudgetCategoryCardProps) {
  const locale = useLocale();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const { id, name, color, budget, spent, remaining, percentage } = category;
  const isOver = percentage >= 100;
  const isWarning = percentage >= 80 && !isOver;

  const startEdit = () => {
    setEditValue(formatCurrencyInput(budget));
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditValue('');
  };

  const saveEdit = async () => {
    const newBudget = parseCurrencyInput(editValue);
    if (newBudget <= 0) return;

    const success = await onUpdateBudget(id, newBudget);
    if (success) {
      toast.success(t(locale, 'budgetUpdated'));
    } else {
      toast.error(t(locale, 'failedSave'));
    }
    setEditing(false);
  };

  return (
    <div className="border-border bg-card rounded-2xl border p-4 transition-shadow hover:shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
            isOver
              ? 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'
              : isWarning
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
          )}
        >
          {percentage.toFixed(0)}%
        </span>
        {!editing && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={startEdit}
            aria-label={t(locale, 'edit')}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Progress bar */}
      <div className="bg-muted mb-3 h-2 overflow-hidden rounded-full">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700 ease-out',
            isOver ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {/* Edit mode */}
      {editing ? (
        <div className="flex items-center gap-2">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="1,000,000"
            className="h-8 font-mono text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
          />
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={saveEdit}>
            <Check className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={cancelEdit}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 text-[11px]">
          <div>
            <p className="text-muted-foreground">{t(locale, 'spent')}</p>
            <p className="font-mono font-medium">{formatCurrency(spent)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t(locale, 'budget')}</p>
            <p className="font-mono font-medium">{formatCurrency(budget)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t(locale, 'remaining')}</p>
            <p
              className={cn(
                'font-mono font-medium',
                remaining < 0 ? 'text-red-600 dark:text-red-400' : ''
              )}
            >
              {formatCurrency(Math.abs(remaining))}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

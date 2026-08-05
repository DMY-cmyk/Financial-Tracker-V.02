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
import type { BudgetAlert } from '@/lib/budget-alerts';

interface BudgetCategoryCardProps {
  category: BudgetCategory;
  alert?: BudgetAlert;
  onUpdateBudget: (id: string, budget: number) => Promise<boolean>;
}

export function BudgetCategoryCard({ category, alert, onUpdateBudget }: BudgetCategoryCardProps) {
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
    <div className="border-border bg-card shadow-card hover:border-border-strong hover:shadow-card-hover rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-0.5">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
        {alert?.level === 'exceeded' ? (
          <span className="bg-danger-soft text-danger-soft-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase">
            {t(locale, 'overBudget')}
          </span>
        ) : alert?.level === 'warning' ? (
          <span className="bg-warning-soft text-warning-soft-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums">
            {Math.round(alert.spentPct * 100)}%
          </span>
        ) : (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums',
              isOver
                ? 'bg-danger-soft text-danger-soft-foreground'
                : isWarning
                  ? 'bg-warning-soft text-warning-soft-foreground'
                  : 'bg-success-soft text-success-soft-foreground'
            )}
          >
            {percentage.toFixed(0)}%
          </span>
        )}
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
      <div className="bg-surface-inset ring-border-subtle mb-3 h-1.5 overflow-hidden rounded-full ring-1 ring-inset">
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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={saveEdit}
            aria-label={t(locale, 'save')}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={cancelEdit}
            aria-label={t(locale, 'cancel')}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 text-[11px]">
          <div>
            <p className="text-muted-foreground text-[10px] tracking-wider uppercase">
              {t(locale, 'spent')}
            </p>
            <p className="font-mono font-medium tabular-nums">{formatCurrency(spent)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-[10px] tracking-wider uppercase">
              {t(locale, 'budget')}
            </p>
            <p className="font-mono font-medium tabular-nums">{formatCurrency(budget)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-[10px] tracking-wider uppercase">
              {t(locale, 'remaining')}
            </p>
            <p
              className={cn(
                'font-mono font-medium tabular-nums',
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

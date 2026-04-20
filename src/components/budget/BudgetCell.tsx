'use client';

import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { t, type Locale } from '@/lib/i18n';

interface BudgetCellProps {
  month: number;
  effectiveBudget: number;
  hasOverride: boolean;
  spent: number;
  percentage: number;
  isPast: boolean;
  isCurrent: boolean;
  locale: Locale;
  onSave: (amount: number) => Promise<boolean>;
  onClear: () => Promise<boolean>;
}

function formatCompact(amount: number): string {
  if (amount === 0) return 'Rp 0';
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return String(amount);
}

function getBarColor(pct: number): string {
  if (pct >= 100) return 'bg-destructive';
  if (pct >= 80) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function getBorderColor(pct: number, hasOverride: boolean, effectiveBudget: number): string {
  if (effectiveBudget === 0) return 'border-dashed border-border';
  if (pct >= 100) return 'border-destructive/60';
  if (pct >= 80) return 'border-amber-500/60';
  return hasOverride ? 'border-emerald-700/60' : 'border-primary/20';
}

export function BudgetCell({
  effectiveBudget,
  hasOverride,
  spent,
  percentage,
  isPast,
  isCurrent,
  locale,
  onSave,
  onClear,
}: BudgetCellProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (editing) return;
    setInputValue(effectiveBudget > 0 ? String(effectiveBudget) : '');
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleSave = async () => {
    const amount = parseFloat(inputValue.replace(/\./g, '').replace(',', '.')) || 0;
    setSaving(true);
    await onSave(amount);
    setSaving(false);
    setEditing(false);
  };

  const handleClear = async () => {
    setSaving(true);
    await onClear();
    setSaving(false);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') setEditing(false);
  };

  const borderClass = getBorderColor(percentage, hasOverride, effectiveBudget);
  const isZeroNoOverride = effectiveBudget === 0 && !hasOverride;

  if (editing) {
    return (
      <div className="w-20 rounded-xl border-2 border-primary bg-card p-2 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]">
        <input
          ref={inputRef}
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="mb-1 w-full rounded bg-background px-1 py-0.5 text-center font-mono text-xs text-foreground outline-none ring-1 ring-primary"
          disabled={saving}
        />
        <div className="flex justify-center gap-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-emerald-900 px-1.5 py-0.5 text-[10px] text-emerald-400 hover:bg-emerald-800 disabled:opacity-50"
          >
            {t(locale, 'save')}
          </button>
          <button
            onClick={handleClear}
            disabled={saving}
            className="rounded bg-destructive/20 px-1.5 py-0.5 text-[10px] text-destructive hover:bg-destructive/30 disabled:opacity-50"
          >
            {t(locale, 'clearBudgetOverride')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-20 cursor-pointer rounded-xl border bg-card p-2 text-left transition-opacity hover:ring-1 hover:ring-primary/40',
        borderClass,
        isPast && 'opacity-70',
        isCurrent && 'ring-1 ring-primary/30'
      )}
    >
      {isZeroNoOverride ? (
        <div className="font-mono text-[11px] font-semibold text-muted-foreground">—</div>
      ) : (
        <>
          <div
            className={cn(
              'font-mono text-[11px]',
              hasOverride ? 'font-semibold text-foreground' : 'italic text-muted-foreground'
            )}
          >
            {formatCompact(effectiveBudget)}
          </div>
          {!hasOverride && (
            <div className="text-[9px] italic text-muted-foreground/60">
              {t(locale, 'inheritedBudget')}
            </div>
          )}
          {hasOverride && effectiveBudget > 0 && (
            <div
              className={cn(
                'text-[9px]',
                percentage >= 100
                  ? 'text-destructive'
                  : percentage >= 80
                    ? 'text-amber-500'
                    : 'text-emerald-500'
              )}
            >
              {Math.round(percentage)}% {t(locale, 'spent')}
            </div>
          )}
        </>
      )}
      {effectiveBudget > 0 && (
        <div className="mt-1 h-0.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full transition-all', getBarColor(percentage))}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </button>
  );
}

'use client';

import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { Category, TransactionSplitInput } from '@/lib/types';
import { tapScale, splitRowAnimation } from '@/lib/motion';

interface SplitLineRowProps {
  index: number;
  split: TransactionSplitInput;
  categories: Category[];
  transactionType: 'income' | 'expense';
  locale: Locale;
  onChange: (index: number, updated: TransactionSplitInput) => void;
  onRemove: (index: number) => void;
}

export function SplitLineRow({
  index,
  split,
  categories,
  transactionType,
  locale,
  onChange,
  onRemove,
}: SplitLineRowProps) {
  const filtered = categories.filter((c) => c.type === transactionType);

  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const cat = categories.find((c) => c.id === e.target.value);
    onChange(index, {
      ...split,
      categoryId: cat?.id ?? null,
      category: cat?.name ?? '',
    });
  }

  function handleAmountBlur(e: React.FocusEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value.replace(/[^\d]/g, ''), 10);
    onChange(index, { ...split, amount: isNaN(val) ? 0 : val });
  }

  return (
    <motion.div
      layout
      {...splitRowAnimation}
      className="grid grid-cols-[2fr_2fr_1.5fr_auto] items-center gap-2"
    >
      <select
        value={split.categoryId ?? ''}
        onChange={handleCategoryChange}
        className="border-input bg-background focus:ring-ring rounded-md border px-2 py-1.5 text-sm focus:ring-1 focus:outline-none"
      >
        <option value="">{t(locale, 'category')}</option>
        {filtered.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <Input
        placeholder={t(locale, 'splitDescription')}
        value={split.description ?? ''}
        onChange={(e) => onChange(index, { ...split, description: e.target.value || null })}
        className="text-sm"
      />

      <Input
        type="text"
        inputMode="numeric"
        value={split.amount === 0 ? '' : split.amount.toLocaleString('id-ID')}
        onChange={(e) => {
          const val = parseFloat(e.target.value.replace(/[^\d]/g, ''));
          onChange(index, { ...split, amount: isNaN(val) ? 0 : val });
        }}
        onBlur={handleAmountBlur}
        className="text-right font-mono text-sm"
        placeholder="0"
      />

      <motion.button
        whileTap={tapScale}
        type="button"
        onClick={() => onRemove(index)}
        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex h-7 w-7 items-center justify-center rounded-md"
        aria-label={t(locale, 'removeSplit')}
      >
        <X className="h-3.5 w-3.5" />
      </motion.button>
    </motion.div>
  );
}

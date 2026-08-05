'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { t, useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { staggerList, staggerListItem } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { Category } from '@/lib/types';

interface UnbudgetedCategoriesProps {
  categories: Category[];
  onSetBudget: (id: string, budget: number) => Promise<boolean>;
}

export function UnbudgetedCategories({ categories, onSetBudget }: UnbudgetedCategoriesProps) {
  const locale = useLocale();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  if (categories.length === 0) return null;

  const startEdit = (id: string) => {
    setEditingId(id);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = async (id: string) => {
    const cleaned = editValue.replace(/[^\d]/g, '');
    const budget = parseInt(cleaned, 10) || 0;
    if (budget <= 0) return;

    const success = await onSetBudget(id, budget);
    if (success) {
      toast.success(t(locale, 'budgetUpdated'));
    } else {
      toast.error(t(locale, 'failedSave'));
    }
    setEditingId(null);
    setEditValue('');
  };

  return (
    <div className="border-border bg-card shadow-card rounded-2xl border p-4">
      <h3 className="mb-3 text-sm font-semibold tracking-tight">{t(locale, 'unbudgeted')}</h3>
      <motion.div variants={staggerList} initial="hidden" animate="show" className="space-y-2">
        {categories.map((cat) => (
          <motion.div
            key={cat.id}
            variants={staggerListItem}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
              'hover:bg-surface-inset'
            )}
          >
            <div
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: cat.color }}
            />
            <span className="min-w-0 flex-1 truncate text-sm">{cat.name}</span>

            {editingId === cat.id ? (
              <div className="flex items-center gap-1.5">
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="500,000"
                  className="h-7 w-28 font-mono text-xs"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit(cat.id);
                    if (e.key === 'Escape') cancelEdit();
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => saveEdit(cat.id)}
                  aria-label={t(locale, 'save')}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={cancelEdit}
                  aria-label={t(locale, 'cancel')}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => startEdit(cat.id)}
              >
                {t(locale, 'setBudget')}
              </Button>
            )}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

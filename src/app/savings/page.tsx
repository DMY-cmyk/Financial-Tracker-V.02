'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { fadeInUp, staggerGrid, staggerGridItem } from '@/lib/motion';
import { api } from '@/lib/api/client';
import { useStore } from '@/store';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ProgressRing } from '@/components/shared/ProgressRing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Plus, Pencil, Trash2, PiggyBank } from 'lucide-react';
import { toast } from 'sonner';
import type { SavingsGoal } from '@/lib/types';

const COLOR_OPTIONS = [
  '#2563EB',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#F97316',
];

export default function SavingsPage() {
  const locale = useLocale();
  const initialized = useStore((s) => s.initialized);

  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [fetchKey, setFetchKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [updatingSavedId, setUpdatingSavedId] = useState<string | null>(null);
  const [savedInput, setSavedInput] = useState('');

  const [loadedKey, setLoadedKey] = useState('');
  const targetKey = `${fetchKey}`;
  const isLoading = loadedKey !== targetKey;

  // Form state
  const [formName, setFormName] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formSaved, setFormSaved] = useState('');
  const [formColor, setFormColor] = useState(COLOR_OPTIONS[0]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!initialized) return;

    let cancelled = false;

    api.savings.list().then((result) => {
      if (cancelled) return;
      if (result.data) {
        setGoals(result.data.goals);
      }
      setLoadedKey(`${fetchKey}`);
    });

    return () => {
      cancelled = true;
    };
  }, [initialized, fetchKey]);

  const refetch = useCallback(() => setFetchKey((k) => k + 1), []);

  const resetForm = () => {
    setFormName('');
    setFormTarget('');
    setFormSaved('');
    setFormColor(COLOR_OPTIONS[0]);
    setFormErrors({});
    setEditingGoal(null);
  };

  const openAdd = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setFormName(goal.name);
    setFormTarget(String(goal.targetAmount));
    setFormSaved(String(goal.savedAmount));
    setFormColor(goal.color);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    resetForm();
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = t(locale, 'required');
    const target = Number(formTarget);
    if (!formTarget || isNaN(target) || target <= 0) errors.target = t(locale, 'invalidAmount');
    const saved = Number(formSaved || '0');
    if (isNaN(saved) || saved < 0) errors.saved = t(locale, 'invalidAmount');
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (editingGoal) {
      const result = await api.savings.update(editingGoal.id, {
        name: formName.trim(),
        targetAmount: Number(formTarget),
        savedAmount: Number(formSaved || '0'),
        color: formColor,
      });
      if (result.data) {
        toast.success(t(locale, 'goalSaved'));
        refetch();
        closeForm();
      } else {
        toast.error(t(locale, 'failedSave'));
      }
    } else {
      const result = await api.savings.create({
        name: formName.trim(),
        targetAmount: Number(formTarget),
        savedAmount: Number(formSaved || '0'),
        color: formColor,
      });
      if (result.data) {
        toast.success(t(locale, 'goalSaved'));
        refetch();
        closeForm();
      } else {
        toast.error(t(locale, 'failedSave'));
      }
    }
  };

  const handleUpdateSaved = async (goal: SavingsGoal) => {
    const newAmount = Number(savedInput);
    if (isNaN(newAmount) || newAmount < 0) return;

    const result = await api.savings.update(goal.id, { savedAmount: newAmount });
    if (result.data) {
      setGoals((prev) =>
        prev.map((g) => (g.id === goal.id ? { ...g, savedAmount: newAmount } : g))
      );
      toast.success(t(locale, 'goalSaved'));
    }
    setUpdatingSavedId(null);
    setSavedInput('');
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const deletedGoal = goals.find((g) => g.id === deleteId);
    const result = await api.savings.delete(deleteId);
    if (result.data) {
      setGoals((prev) => prev.filter((g) => g.id !== deleteId));
      toast.success(t(locale, 'goalDeleted'), {
        action: deletedGoal
          ? {
              label: t(locale, 'undo'),
              onClick: async () => {
                await api.savings.create({
                  name: deletedGoal.name,
                  targetAmount: deletedGoal.targetAmount,
                  savedAmount: deletedGoal.savedAmount,
                  color: deletedGoal.color,
                });
                setFetchKey((k) => k + 1);
                toast.success(t(locale, 'itemRestored'));
              },
            }
          : undefined,
      });
    }
    setDeleteId(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t(locale, 'savingsPage')} />
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-border bg-card h-40 animate-pulse rounded-2xl border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <motion.div {...fadeInUp}>
        <PageHeader
          title={t(locale, 'savingsPage')}
          description={
            goals.length > 0 ? `${goals.length} ${locale === 'id' ? 'target' : 'goals'}` : undefined
          }
        >
          <Button onClick={openAdd} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t(locale, 'addSavingsGoal')}</span>
            <span className="sm:hidden">{t(locale, 'add')}</span>
          </Button>
        </PageHeader>
      </motion.div>

      <div className="mx-auto max-w-2xl">
        <AnimatePresence mode="wait">
          {goals.length === 0 ? (
            <motion.div key="empty" {...fadeInUp}>
              <EmptyState
                title={t(locale, 'noSavingsGoals')}
                icon={<PiggyBank className="h-12 w-12" />}
              >
                <Button onClick={openAdd} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t(locale, 'addSavingsGoal')}
                </Button>
              </EmptyState>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              variants={staggerGrid}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              {goals.map((goal) => {
                const pct =
                  goal.targetAmount > 0
                    ? Math.round((goal.savedAmount / goal.targetAmount) * 100)
                    : 0;

                return (
                  <motion.div
                    key={goal.id}
                    variants={staggerGridItem}
                    className="border-border bg-card group hover:bg-muted/50 rounded-2xl border p-5 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <ProgressRing percentage={pct} size={56} strokeWidth={6} color={goal.color}>
                        <span className="text-[10px] font-bold">{pct}%</span>
                      </ProgressRing>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate text-sm font-medium">{goal.name}</p>
                          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEdit(goal)}
                              aria-label={t(locale, 'edit')}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive h-7 w-7"
                              onClick={() => setDeleteId(goal.id)}
                              aria-label={t(locale, 'delete')}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-muted-foreground mt-0.5 font-mono text-xs">
                          {formatCurrency(goal.savedAmount)} {t(locale, 'of')}{' '}
                          {formatCurrency(goal.targetAmount)}
                        </p>

                        {/* Inline saved amount update */}
                        {updatingSavedId === goal.id ? (
                          <div className="mt-2 flex gap-1.5">
                            <Input
                              type="number"
                              value={savedInput}
                              onChange={(e) => setSavedInput(e.target.value)}
                              className="h-7 text-xs"
                              min={0}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateSaved(goal);
                                if (e.key === 'Escape') {
                                  setUpdatingSavedId(null);
                                  setSavedInput('');
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleUpdateSaved(goal)}
                            >
                              {t(locale, 'save')}
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setUpdatingSavedId(goal.id);
                              setSavedInput(String(goal.savedAmount));
                            }}
                            className="text-primary mt-1.5 text-[11px] font-medium hover:underline"
                          >
                            {t(locale, 'updateSaved')}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add/Edit Sheet */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent className="overflow-y-auto" aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle>
              {editingGoal ? t(locale, 'editSavingsGoal') : t(locale, 'addSavingsGoal')}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goal-name">{t(locale, 'goalName')}</Label>
              <Input
                id="goal-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={locale === 'id' ? 'cth. Dana Darurat' : 'e.g. Emergency Fund'}
              />
              {formErrors.name && <p className="text-destructive text-xs">{formErrors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-target">{t(locale, 'targetAmount')}</Label>
              <Input
                id="goal-target"
                type="number"
                value={formTarget}
                onChange={(e) => setFormTarget(e.target.value)}
                placeholder="10000000"
                min={0}
              />
              {formErrors.target && <p className="text-destructive text-xs">{formErrors.target}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-saved">{t(locale, 'savedAmount')}</Label>
              <Input
                id="goal-saved"
                type="number"
                value={formSaved}
                onChange={(e) => setFormSaved(e.target.value)}
                placeholder="0"
                min={0}
              />
              {formErrors.saved && <p className="text-destructive text-xs">{formErrors.saved}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t(locale, 'goalColor')}</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormColor(color)}
                    className={cn(
                      'h-8 w-8 rounded-full border-2 transition-transform',
                      formColor === color
                        ? 'border-foreground scale-110'
                        : 'border-transparent hover:scale-105'
                    )}
                    style={{ backgroundColor: color }}
                    aria-label={color}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} className="flex-1">
                {t(locale, 'save')}
              </Button>
              <Button variant="outline" onClick={closeForm}>
                {t(locale, 'cancel')}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t(locale, 'deleteSavingsGoal')}
        description={
          locale === 'id'
            ? 'Target tabungan ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.'
            : 'This savings goal will be permanently deleted. This action cannot be undone.'
        }
        confirmLabel={t(locale, 'delete')}
        cancelLabel={t(locale, 'cancel')}
        onConfirm={confirmDelete}
      />

      {/* Mobile FAB */}
      <button
        onClick={openAdd}
        className="bg-primary text-primary-foreground fixed right-4 bottom-20 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 lg:bottom-6 lg:hidden"
        aria-label={t(locale, 'addSavingsGoal')}
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}

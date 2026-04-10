'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { fadeInUp, staggerGrid, staggerGridItem } from '@/lib/motion';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ProgressRing } from '@/components/shared/ProgressRing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Plus, Pencil, Trash2, PiggyBank } from 'lucide-react';
import { useSavingsGoals, COLOR_OPTIONS } from '@/features/savings/useSavingsGoals';

export default function SavingsPage() {
  const locale = useLocale();
  const { goals, isLoading, error, form, deleteConfirm, quickEdit } = useSavingsGoals();

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

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title={t(locale, 'savingsPage')} />
        <div className="mx-auto max-w-2xl">
          <p className="text-destructive py-8 text-center text-sm">{t(locale, 'error')}</p>
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
          <Button onClick={form.openAdd} className="gap-2 shadow-sm">
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
                <Button onClick={form.openAdd} className="gap-2">
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
                              onClick={() => form.openEdit(goal)}
                              aria-label={t(locale, 'edit')}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive h-7 w-7"
                              onClick={() => deleteConfirm.setId(goal.id)}
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

                        {quickEdit.goalId === goal.id ? (
                          <div className="mt-2 flex gap-1.5">
                            <Input
                              type="number"
                              value={quickEdit.value}
                              onChange={(e) => quickEdit.setValue(e.target.value)}
                              className="h-7 text-xs"
                              min={0}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') quickEdit.submit(goal);
                                if (e.key === 'Escape') quickEdit.close();
                              }}
                            />
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => quickEdit.submit(goal)}
                            >
                              {t(locale, 'save')}
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => quickEdit.open(goal)}
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
      <Sheet open={form.open} onOpenChange={(o) => !o && form.close()}>
        <SheetContent className="overflow-y-auto" aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle>
              {form.editingGoal ? t(locale, 'editSavingsGoal') : t(locale, 'addSavingsGoal')}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goal-name">{t(locale, 'goalName')}</Label>
              <Input
                id="goal-name"
                value={form.name}
                onChange={(e) => form.setName(e.target.value)}
                placeholder={locale === 'id' ? 'cth. Dana Darurat' : 'e.g. Emergency Fund'}
              />
              {form.errors.name && <p className="text-destructive text-xs">{form.errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-target">{t(locale, 'targetAmount')}</Label>
              <Input
                id="goal-target"
                type="number"
                value={form.target}
                onChange={(e) => form.setTarget(e.target.value)}
                placeholder="10000000"
                min={0}
              />
              {form.errors.target && (
                <p className="text-destructive text-xs">{form.errors.target}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-saved">{t(locale, 'savedAmount')}</Label>
              <Input
                id="goal-saved"
                type="number"
                value={form.saved}
                onChange={(e) => form.setSaved(e.target.value)}
                placeholder="0"
                min={0}
              />
              {form.errors.saved && <p className="text-destructive text-xs">{form.errors.saved}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t(locale, 'goalColor')}</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => form.setColor(color)}
                    className={cn(
                      'h-8 w-8 rounded-full border-2 transition-transform',
                      form.color === color
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
              <Button onClick={form.submit} className="flex-1">
                {t(locale, 'save')}
              </Button>
              <Button variant="outline" onClick={form.close}>
                {t(locale, 'cancel')}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteConfirm.id}
        onOpenChange={(open) => !open && deleteConfirm.setId(null)}
        title={t(locale, 'deleteSavingsGoal')}
        description={t(locale, 'deleteConfirmDescription')}
        confirmLabel={t(locale, 'delete')}
        cancelLabel={t(locale, 'cancel')}
        onConfirm={deleteConfirm.confirm}
      />

      {/* Mobile FAB */}
      <button
        onClick={form.openAdd}
        className="bg-primary text-primary-foreground fixed right-4 bottom-20 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 lg:bottom-6 lg:hidden"
        aria-label={t(locale, 'addSavingsGoal')}
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}

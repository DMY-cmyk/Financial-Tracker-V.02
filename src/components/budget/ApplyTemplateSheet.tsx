'use client';

import { useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Target } from 'lucide-react';
import { t, useLocale } from '@/lib/i18n';
import { fadeInUp } from '@/lib/motion';
import { motion } from 'framer-motion';
import { TemplateCard } from './TemplateCard';
import type { BudgetTemplate } from '@/lib/api/contracts';

interface ApplyTemplateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: BudgetTemplate[];
  isLoading: boolean;
  onLoad: () => void;
  onApply: (id: string) => Promise<{ applied: number; skipped: number } | null>;
  onDelete: (id: string) => Promise<boolean>;
  onApplied: () => void;
}

export function ApplyTemplateSheet({
  open,
  onOpenChange,
  templates,
  isLoading,
  onLoad,
  onApply,
  onDelete,
  onApplied,
}: ApplyTemplateSheetProps) {
  const locale = useLocale();

  useEffect(() => {
    if (open) onLoad();
  }, [open, onLoad]);

  const handleApply = async (id: string) => {
    const result = await onApply(id);
    if (result !== null) {
      onApplied();
    }
  };

  const handleDelete = async (id: string) => {
    await onDelete(id);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t(locale, 'budgetTemplates')}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="border-border bg-card h-20 animate-pulse rounded-2xl border"
                />
              ))}
            </div>
          )}

          {!isLoading && templates.length === 0 && (
            <motion.div {...fadeInUp} className="flex flex-col items-center gap-3 py-12">
              <Target className="text-muted-foreground h-12 w-12" />
              <p className="text-muted-foreground text-sm">{t(locale, 'noTemplates')}</p>
            </motion.div>
          )}

          {!isLoading &&
            templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onApply={handleApply}
                onDelete={handleDelete}
              />
            ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

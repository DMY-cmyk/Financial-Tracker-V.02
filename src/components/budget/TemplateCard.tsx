'use client';

import { useState } from 'react';
import { Trash2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { t, useLocale } from '@/lib/i18n';
import type { BudgetTemplate } from '@/lib/api/contracts';

interface TemplateCardProps {
  template: BudgetTemplate;
  onApply: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function TemplateCard({ template, onApply, onDelete }: TemplateCardProps) {
  const locale = useLocale();
  const [applyConfirmOpen, setApplyConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleApply = async () => {
    setIsApplying(true);
    await onApply(template.id);
    setIsApplying(false);
    setApplyConfirmOpen(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(template.id);
    setIsDeleting(false);
    setDeleteConfirmOpen(false);
  };

  const previewText =
    template.preview.length > 0
      ? template.preview.join(', ') + (template.categoryCount > 3 ? '...' : '')
      : '—';

  const createdDate = new Date(template.createdAt).toLocaleDateString();

  return (
    <>
      <div className="border-border bg-card flex items-center justify-between rounded-2xl border p-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{template.name}</p>
          <p className="text-muted-foreground truncate text-sm">{previewText}</p>
          <p className="text-muted-foreground text-xs">
            {t(locale, 'nCategoriesLabel').replace('{n}', String(template.categoryCount))} ·{' '}
            {createdDate}
          </p>
        </div>
        <div className="ml-3 flex shrink-0 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setApplyConfirmOpen(true)}
            disabled={isApplying}
          >
            <Play className="mr-1 h-3 w-3" />
            {t(locale, 'applyTemplate')}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={applyConfirmOpen}
        onOpenChange={setApplyConfirmOpen}
        title={t(locale, 'applyTemplate')}
        description={t(locale, 'applyConfirm')}
        confirmLabel={t(locale, 'applyTemplate')}
        cancelLabel={t(locale, 'cancel')}
        onConfirm={handleApply}
        loading={isApplying}
        variant="default"
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t(locale, 'delete')}
        description={t(locale, 'deleteTemplateConfirm').replace('{name}', template.name)}
        confirmLabel={t(locale, 'delete')}
        cancelLabel={t(locale, 'cancel')}
        onConfirm={handleDelete}
        loading={isDeleting}
        variant="destructive"
      />
    </>
  );
}

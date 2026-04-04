'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { t, useLocale } from '@/lib/i18n';

interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryCount: number;
  onSave: (name: string) => Promise<boolean>;
}

export function SaveTemplateDialog({
  open,
  onOpenChange,
  categoryCount,
  onSave,
}: SaveTemplateDialogProps) {
  const locale = useLocale();
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError(t(locale, 'required'));
      return;
    }
    setIsSaving(true);
    const ok = await onSave(name.trim());
    setIsSaving(false);
    if (ok) {
      setName('');
      setError('');
      onOpenChange(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setName('');
      setError('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t(locale, 'saveAsTemplate')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="template-name">{t(locale, 'templateName')}</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              maxLength={50}
              placeholder={t(locale, 'templateName')}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>

          <p className="text-muted-foreground text-sm">
            {categoryCount > 0
              ? t(locale, 'savingCategories').replace('{n}', String(categoryCount))
              : t(locale, 'noBudgetsSet')}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
            {t(locale, 'cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t(locale, 'save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

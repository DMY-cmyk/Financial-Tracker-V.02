'use client';

import { t, useLocale } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Liability } from '@/lib/types';

interface LiabilityDialogProps {
  open: boolean;
  editingLiability: Liability | null;
  name: string;
  setName: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  category: 'loan' | 'credit_card' | 'other';
  setCategory: (v: 'loan' | 'credit_card' | 'other') => void;
  errors: Record<string, string>;
  close: () => void;
  submit: () => Promise<void>;
}

export function LiabilityDialog({
  open,
  editingLiability,
  name,
  setName,
  amount,
  setAmount,
  category,
  setCategory,
  errors,
  close,
  submit,
}: LiabilityDialogProps) {
  const locale = useLocale();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            {editingLiability ? t(locale, 'editLiability') : t(locale, 'addLiability')}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="liab-name">{t(locale, 'liabilityName')}</Label>
            <Input
              id="liab-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t(locale, 'nwLiabilityNamePlaceholder')}
            />
            {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="liab-amount">{t(locale, 'nwAmountIdr')}</Label>
            <Input
              id="liab-amount"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="450000000"
            />
            {errors.amount && <p className="text-destructive text-xs">{errors.amount}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="liab-category">{t(locale, 'liabilityCategory')}</Label>
            <select
              id="liab-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as 'loan' | 'credit_card' | 'other')}
              className="border-input bg-background ring-offset-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
            >
              <option value="loan">{t(locale, 'loanType')}</option>
              <option value="credit_card">{t(locale, 'creditCardType')}</option>
              <option value="other">{t(locale, 'otherType')}</option>
            </select>
          </div>

          <div className="flex gap-2 pt-1">
            <Button onClick={submit} className="flex-1">
              {t(locale, 'save')}
            </Button>
            <Button variant="outline" onClick={close}>
              {t(locale, 'cancel')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

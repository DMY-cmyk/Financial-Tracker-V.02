'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { t, useLocale } from '@/lib/i18n';

function isLastDayOfMonth(date: Date): boolean {
  const tomorrow = new Date(date);
  tomorrow.setDate(date.getDate() + 1);
  return tomorrow.getMonth() !== date.getMonth();
}

function getStorageKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `eom-reminder-dismissed-${y}-${m}`;
}

export function EndOfMonthReminder() {
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const today = new Date();
    if (!isLastDayOfMonth(today)) return;
    const key = getStorageKey(today);
    if (localStorage.getItem(key)) return;
    const id = window.setTimeout(() => setOpen(true));
    return () => window.clearTimeout(id);
  }, []);

  const handleDismiss = () => {
    const key = getStorageKey(new Date());
    localStorage.setItem(key, '1');
    setOpen(false);
  };

  const handleGoToTransactions = () => {
    handleDismiss();
    router.push('/transactions');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleDismiss();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
            <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle>{t(locale, 'endOfMonthTitle')}</DialogTitle>
          <DialogDescription>{t(locale, 'endOfMonthBody')}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={handleDismiss}>
            {t(locale, 'dismiss')}
          </Button>
          <Button onClick={handleGoToTransactions}>{t(locale, 'goToTransactions')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

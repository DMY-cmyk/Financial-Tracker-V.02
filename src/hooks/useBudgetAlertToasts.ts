'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import type { BudgetAlert } from '@/lib/budget-alerts';

const SESSION_KEY = 'budget-alert-toasts-shown';

export function getShownIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function markShown(ids: string[]): void {
  try {
    const existing = getShownIds();
    ids.forEach((id) => existing.add(id));
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...existing]));
  } catch {
    // sessionStorage may be unavailable (SSR, private mode)
  }
}

export function clearShownIds(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

export function useBudgetAlertToasts(alerts: BudgetAlert[]): void {
  useEffect(() => {
    const shownIds = getShownIds();
    const newlyExceeded = alerts.filter(
      (a) => a.level === 'exceeded' && !shownIds.has(a.categoryId)
    );

    if (newlyExceeded.length === 1) {
      toast.warning(`${newlyExceeded[0].categoryName} is over budget this month`);
    } else if (newlyExceeded.length > 1) {
      toast.warning(`${newlyExceeded.length} categories are over budget this month`);
    }

    if (newlyExceeded.length > 0) {
      markShown(newlyExceeded.map((a) => a.categoryId));
    }
  }, [alerts]);
}

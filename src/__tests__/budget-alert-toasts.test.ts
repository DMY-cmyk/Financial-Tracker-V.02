// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BudgetAlert } from '@/lib/budget-alerts';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    warning: vi.fn(),
  },
}));

import { renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import {
  getShownIds,
  markShown,
  clearShownIds,
  useBudgetAlertToasts,
} from '@/hooks/useBudgetAlertToasts';

const exceededAlert = (id: string, name: string) => ({
  categoryId: id,
  categoryName: name,
  color: '#F00',
  budgetAmount: 1_000_000,
  spentAmount: 1_200_000,
  spentPct: 1.2,
  level: 'exceeded' as const,
});

const warningAlert = (id: string): BudgetAlert => ({
  categoryId: id,
  categoryName: 'Food',
  color: '#F00',
  budgetAmount: 1_000_000,
  spentAmount: 850_000,
  spentPct: 0.85,
  level: 'warning' as const,
});

describe('sessionStorage helpers', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('getShownIds returns empty set when storage is empty', () => {
    expect(getShownIds()).toEqual(new Set());
  });

  it('markShown saves ids to sessionStorage', () => {
    markShown(['cat-1', 'cat-2']);
    const ids = getShownIds();
    expect(ids.has('cat-1')).toBe(true);
    expect(ids.has('cat-2')).toBe(true);
  });

  it('markShown merges with existing ids', () => {
    markShown(['cat-1']);
    markShown(['cat-2']);
    const ids = getShownIds();
    expect(ids.has('cat-1')).toBe(true);
    expect(ids.has('cat-2')).toBe(true);
  });

  it('clearShownIds empties sessionStorage', () => {
    markShown(['cat-1']);
    clearShownIds();
    expect(getShownIds()).toEqual(new Set());
  });
});

describe('useBudgetAlertToasts', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('shows singular toast for one newly exceeded category', () => {
    renderHook(() => useBudgetAlertToasts([exceededAlert('cat-1', 'Dining')]));
    expect(toast.warning).toHaveBeenCalledWith('Dining is over budget this month');
  });

  it('shows plural toast for multiple newly exceeded categories', () => {
    renderHook(() =>
      useBudgetAlertToasts([exceededAlert('cat-1', 'Dining'), exceededAlert('cat-2', 'Shopping')])
    );
    expect(toast.warning).toHaveBeenCalledWith('2 categories over budget this month');
  });

  it('does not show toast for warning-level alerts', () => {
    renderHook(() => useBudgetAlertToasts([warningAlert('cat-1')]));
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it('does not re-show toast for already-shown category', () => {
    markShown(['cat-1']);
    renderHook(() => useBudgetAlertToasts([exceededAlert('cat-1', 'Dining')]));
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it('marks newly exceeded categories as shown in sessionStorage', () => {
    renderHook(() => useBudgetAlertToasts([exceededAlert('cat-1', 'Dining')]));
    expect(getShownIds().has('cat-1')).toBe(true);
  });
});

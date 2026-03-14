'use client';

import { useEffect, useCallback } from 'react';
import { useStore } from '@/store';

interface UseKeyboardShortcutsOptions {
  onNewTransaction?: () => void;
  onFocusSearch?: () => void;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const setMonth = useStore((s) => s.setMonth);
  const setYear = useStore((s) => s.setYear);
  const month = useStore((s) => s.ui.selectedMonth);
  const year = useStore((s) => s.ui.selectedYear);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      // Escape — close any open sheet/dialog (native behavior handles this)
      if (e.key === 'Escape') return;

      // Don't trigger shortcuts when typing in form fields
      if (isInput) return;

      // N — new transaction
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        options.onNewTransaction?.();
        return;
      }

      // / — focus search
      if (e.key === '/') {
        e.preventDefault();
        options.onFocusSearch?.();
        return;
      }

      // ← → — navigate months
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (month === 0) {
          setMonth(11);
          setYear(year - 1);
        } else {
          setMonth(month - 1);
        }
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (month === 11) {
          setMonth(0);
          setYear(year + 1);
        } else {
          setMonth(month + 1);
        }
        return;
      }
    },
    [month, year, setMonth, setYear, options]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

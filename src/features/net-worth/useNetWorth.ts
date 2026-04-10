'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api/client';
import { useStore } from '@/store';
import { useLocale, t } from '@/lib/i18n';
import type { Liability, NetWorthCurrent, NetWorthSnapshot } from '@/lib/types';

export function useNetWorth() {
  const locale = useLocale();
  const initialized = useStore((s) => s.initialized);

  // Data state
  const [current, setCurrent] = useState<NetWorthCurrent | null>(null);
  const [history, setHistory] = useState<NetWorthSnapshot[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [fetchKey, setFetchKey] = useState(0);
  const [loadedKey, setLoadedKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isLoading = loadedKey !== String(fetchKey);

  // Snapshot state
  const [isRecording, setIsRecording] = useState(false);

  // Form state (add/edit liability dialog)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLiability, setEditingLiability] = useState<Liability | null>(null);
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState<'loan' | 'credit_card' | 'other'>('other');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const reload = useCallback(() => setFetchKey((k) => k + 1), []);

  useEffect(() => {
    if (!initialized) return;
    let cancelled = false;

    Promise.all([api.netWorth.get(), api.liabilities.list()]).then(
      ([nwResult, liabResult]) => {
        if (cancelled) return;

        if (nwResult.data) {
          setCurrent(nwResult.data.current);
          setHistory(nwResult.data.history);
          setError(null);

          // Auto-snapshot: if no entry for current month, record one silently
          const now = new Date();
          const hasCurrentMonth = nwResult.data.history.some(
            (s) => s.month === now.getMonth() && s.year === now.getFullYear()
          );
          if (!hasCurrentMonth) {
            api.netWorth.recordSnapshot().then((snapResult) => {
              if (!cancelled && snapResult.data) {
                setHistory((prev) => {
                  const without = prev.filter(
                    (s) =>
                      !(
                        s.month === snapResult.data!.month &&
                        s.year === snapResult.data!.year
                      )
                  );
                  return [...without, snapResult.data!].sort((a, b) =>
                    a.year !== b.year ? a.year - b.year : a.month - b.month
                  );
                });
              }
            }).catch(() => {});
          }
        } else if (nwResult.error) {
          setError(nwResult.error.message);
        }

        if (liabResult.data) {
          setLiabilities(liabResult.data.liabilities);
        } else if (liabResult.error) {
          setError(liabResult.error.message);
        }
        setLoadedKey(String(fetchKey));
      }
    );

    return () => {
      cancelled = true;
    };
  }, [initialized, fetchKey]);

  // --- Snapshot ---

  const recordSnapshot = useCallback(async () => {
    setIsRecording(true);
    const result = await api.netWorth.recordSnapshot();
    setIsRecording(false);
    if (result.data) {
      setHistory((prev) => {
        const without = prev.filter(
          (s) => !(s.month === result.data!.month && s.year === result.data!.year)
        );
        return [...without, result.data!].sort((a, b) =>
          a.year !== b.year ? a.year - b.year : a.month - b.month
        );
      });
      // Also refresh current net worth after snapshot
      api.netWorth.get().then((r) => {
        if (r.data) setCurrent(r.data.current);
      });
      toast.success(t(locale, 'snapshotRecorded'));
    }
  }, [locale]);

  // --- Form helpers ---

  const resetForm = () => {
    setFormName('');
    setFormAmount('');
    setFormCategory('other');
    setFormErrors({});
    setEditingLiability(null);
  };

  const openAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (liability: Liability) => {
    setEditingLiability(liability);
    setFormName(liability.name);
    setFormAmount(String(liability.amount));
    setFormCategory(liability.category);
    setFormErrors({});
    setDialogOpen(true);
  };

  const closeForm = () => {
    setDialogOpen(false);
    resetForm();
  };

  const submitForm = async () => {
    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = t(locale, 'required');
    const amount = Number(formAmount);
    if (!formAmount || isNaN(amount) || amount < 0) errors.amount = t(locale, 'invalidAmount');
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const payload = { name: formName.trim(), amount, category: formCategory };
    const result = editingLiability
      ? await api.liabilities.update(editingLiability.id, payload)
      : await api.liabilities.create(payload);

    if (result.data) {
      toast.success(t(locale, 'liabilitySaved'));
      reload();
      closeForm();
    } else {
      toast.error(t(locale, 'failedSave'));
    }
  };

  // --- Delete ---

  const confirmDelete = async () => {
    if (!deleteId) return;
    const deletedLiability = liabilities.find((l) => l.id === deleteId);
    const result = await api.liabilities.delete(deleteId);
    if (result.data) {
      setLiabilities((prev) => prev.filter((l) => l.id !== deleteId));
      toast.success(t(locale, 'liabilityDeleted'), {
        action: deletedLiability
          ? {
              label: t(locale, 'undo'),
              onClick: async () => {
                await api.liabilities.create({
                  name: deletedLiability.name,
                  amount: deletedLiability.amount,
                  category: deletedLiability.category,
                });
                reload();
                toast.success(t(locale, 'itemRestored'));
              },
            }
          : undefined,
      });
    }
    setDeleteId(null);
  };

  return {
    current,
    history,
    liabilities,
    isLoading,
    error,
    reload,

    recordSnapshot,
    isRecording,

    form: {
      open: dialogOpen,
      editingLiability,
      name: formName,
      setName: setFormName,
      amount: formAmount,
      setAmount: setFormAmount,
      category: formCategory,
      setCategory: setFormCategory,
      errors: formErrors,
      openAdd,
      openEdit,
      close: closeForm,
      submit: submitForm,
    },

    deleteConfirm: {
      id: deleteId,
      setId: setDeleteId,
      confirm: confirmDelete,
    },
  };
}

'use client';

import { useCallback, useState } from 'react';
import { nanoid } from 'nanoid';

const PRESET_KEY = 'tx-filter-presets';
const MAX_PRESETS = 5;

export interface FilterPresetFilters {
  amountMin?: number;
  amountMax?: number;
  selectedCategories?: string[];
  dateFrom?: string;
  dateTo?: string;
  includeNotes?: boolean;
  type?: string;
  search?: string;
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: FilterPresetFilters;
  createdAt: string;
}

function loadPresets(): FilterPreset[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(PRESET_KEY);
    return stored ? (JSON.parse(stored) as FilterPreset[]) : [];
  } catch {
    return [];
  }
}

function persistPresets(presets: FilterPreset[]): void {
  localStorage.setItem(PRESET_KEY, JSON.stringify(presets));
}

interface UseFilterPresetsReturn {
  presets: FilterPreset[];
  savePreset: (name: string, filters: FilterPresetFilters) => void;
  deletePreset: (id: string) => void;
}

export function useFilterPresets(): UseFilterPresetsReturn {
  const [presets, setPresets] = useState<FilterPreset[]>(() => loadPresets());

  const savePreset = useCallback((name: string, filters: FilterPresetFilters) => {
    const newPreset: FilterPreset = {
      id: nanoid(),
      name: name.trim(),
      filters,
      createdAt: new Date().toISOString(),
    };
    setPresets((prev) => {
      const updated = [...prev, newPreset];
      if (updated.length > MAX_PRESETS) updated.shift();
      persistPresets(updated);
      return updated;
    });
  }, []);

  const deletePreset = useCallback((id: string) => {
    setPresets((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      persistPresets(updated);
      return updated;
    });
  }, []);

  return { presets, savePreset, deletePreset };
}

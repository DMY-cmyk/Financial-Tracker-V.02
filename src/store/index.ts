import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FinancialStore } from '@/lib/types';

const currentDate = new Date();

export const useStore = create<FinancialStore>()(
  persist(
    (set) => ({
      ui: {
        selectedMonth: currentDate.getMonth(),
        selectedYear: currentDate.getFullYear(),
        theme: 'system',
        locale: 'en',
      },
      initialized: false,

      // UI actions
      setMonth: (month: number) => set((state) => ({ ui: { ...state.ui, selectedMonth: month } })),

      setYear: (year: number) => set((state) => ({ ui: { ...state.ui, selectedYear: year } })),

      setTheme: (theme: 'light' | 'dark' | 'system') =>
        set((state) => ({ ui: { ...state.ui, theme } })),

      setLocale: (locale: 'en' | 'id') => set((state) => ({ ui: { ...state.ui, locale } })),

      // Lifecycle
      initialize: () => set({ initialized: true }),

      clearAllData: () =>
        set({
          initialized: false,
        }),
    }),
    {
      name: 'financial-tracker-v2',
    }
  )
);

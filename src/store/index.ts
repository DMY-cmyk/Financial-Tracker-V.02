import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FinancialStore, DashboardView } from '@/lib/types';

const currentDate = new Date();

export const useStore = create<FinancialStore>()(
  persist(
    (set) => ({
      ui: {
        selectedMonth: currentDate.getMonth(),
        selectedYear: currentDate.getFullYear(),
        theme: 'system',
        locale: 'en',
        sidebarCollapsed: false,
        dashboardView: 'years',
        dashboardViewDirection: 1,
      },
      initialized: false,

      // UI actions
      setMonth: (month: number) => set((state) => ({ ui: { ...state.ui, selectedMonth: month } })),

      setYear: (year: number) => set((state) => ({ ui: { ...state.ui, selectedYear: year } })),

      setTheme: (theme: 'light' | 'dark' | 'system') =>
        set((state) => ({ ui: { ...state.ui, theme } })),

      setLocale: (locale: 'en' | 'id') => set((state) => ({ ui: { ...state.ui, locale } })),

      setSidebarCollapsed: (collapsed: boolean) =>
        set((state) => ({ ui: { ...state.ui, sidebarCollapsed: collapsed } })),

      setDashboardView: (view: DashboardView) =>
        set((state) => {
          const depthMap: Record<DashboardView, number> = { years: 0, months: 1, dashboard: 2 };
          const prev = depthMap[state.ui.dashboardView];
          const next = depthMap[view];
          const dir = next >= prev ? 1 : -1;
          return {
            ui: { ...state.ui, dashboardView: view, dashboardViewDirection: dir as 1 | -1 },
          };
        }),

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

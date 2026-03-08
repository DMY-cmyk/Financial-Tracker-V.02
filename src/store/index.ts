import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import {
  FinancialStore,
  Transaction,
  Category,
  PaymentMethod,
  Bill,
  SavingsGoal,
} from '@/lib/types';

const currentDate = new Date();

export const useStore = create<FinancialStore>()(
  persist(
    (set) => ({
      transactions: [],
      categories: [],
      paymentMethods: [],
      bills: [],
      savingsGoals: [],
      ui: {
        selectedMonth: currentDate.getMonth(),
        selectedYear: currentDate.getFullYear(),
        theme: 'system',
        locale: 'en',
      },
      initialized: false,

      // Transaction actions
      addTransaction: (t: Omit<Transaction, 'id'>) =>
        set((state) => ({
          transactions: [...state.transactions, { ...t, id: nanoid() }],
        })),

      updateTransaction: (id: string, updates: Partial<Transaction>) =>
        set((state) => ({
          transactions: state.transactions.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),

      deleteTransaction: (id: string) =>
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        })),

      // Category actions
      addCategory: (c: Omit<Category, 'id'>) =>
        set((state) => ({
          categories: [...state.categories, { ...c, id: nanoid() }],
        })),

      updateCategory: (id: string, updates: Partial<Category>) =>
        set((state) => ({
          categories: state.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      deleteCategory: (id: string) =>
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        })),

      // Payment method actions
      addPaymentMethod: (p: Omit<PaymentMethod, 'id'>) =>
        set((state) => ({
          paymentMethods: [...state.paymentMethods, { ...p, id: nanoid() }],
        })),

      updatePaymentMethod: (id: string, updates: Partial<PaymentMethod>) =>
        set((state) => ({
          paymentMethods: state.paymentMethods.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),

      deletePaymentMethod: (id: string) =>
        set((state) => ({
          paymentMethods: state.paymentMethods.filter((p) => p.id !== id),
        })),

      // Bill actions
      addBill: (b: Omit<Bill, 'id'>) =>
        set((state) => ({
          bills: [...state.bills, { ...b, id: nanoid() }],
        })),

      updateBill: (id: string, updates: Partial<Bill>) =>
        set((state) => ({
          bills: state.bills.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        })),

      deleteBill: (id: string) =>
        set((state) => ({
          bills: state.bills.filter((b) => b.id !== id),
        })),

      toggleBillPaid: (id: string) =>
        set((state) => ({
          bills: state.bills.map((b) => (b.id === id ? { ...b, isPaid: !b.isPaid } : b)),
        })),

      // Savings actions
      addSavingsGoal: (s: Omit<SavingsGoal, 'id'>) =>
        set((state) => ({
          savingsGoals: [...state.savingsGoals, { ...s, id: nanoid() }],
        })),

      updateSavingsGoal: (id: string, updates: Partial<SavingsGoal>) =>
        set((state) => ({
          savingsGoals: state.savingsGoals.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        })),

      deleteSavingsGoal: (id: string) =>
        set((state) => ({
          savingsGoals: state.savingsGoals.filter((s) => s.id !== id),
        })),

      // UI actions
      setMonth: (month: number) => set((state) => ({ ui: { ...state.ui, selectedMonth: month } })),

      setYear: (year: number) => set((state) => ({ ui: { ...state.ui, selectedYear: year } })),

      setTheme: (theme: 'light' | 'dark' | 'system') =>
        set((state) => ({ ui: { ...state.ui, theme } })),

      setLocale: (locale: 'en' | 'id') => set((state) => ({ ui: { ...state.ui, locale } })),

      // Data actions
      initialize: (data) =>
        set({
          ...data,
          initialized: true,
        }),

      clearAllData: () =>
        set({
          transactions: [],
          categories: [],
          paymentMethods: [],
          bills: [],
          savingsGoals: [],
          initialized: false,
        }),
    }),
    {
      name: 'financial-tracker-v2',
    }
  )
);

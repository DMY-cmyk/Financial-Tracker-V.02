'use client';

import { createContext, useContext } from 'react';

export type Locale = 'en' | 'id';

type TranslationKeys = {
  dashboard: string;
  transactions: string;
  upload: string;
  export: string;
  settings: string;
  categories: string;
  netBalance: string;
  totalIncome: string;
  totalExpense: string;
  income: string;
  expense: string;
  budget: string;
  spent: string;
  remaining: string;
  cashFlow: string;
  categoryBreakdown: string;
  budgetProgress: string;
  paymentMethods: string;
  billsChecklist: string;
  savingsGoals: string;
  recentTransactions: string;
  viewAll: string;
  addTransaction: string;
  editTransaction: string;
  deleteTransaction: string;
  description: string;
  category: string;
  amount: string;
  date: string;
  paymentMethod: string;
  notes: string;
  save: string;
  cancel: string;
  search: string;
  filter: string;
  noData: string;
  paid: string;
  unpaid: string;
  overdue: string;
  dueDate: string;
  target: string;
  saved: string;
  of: string;
  all: string;
  thisMonth: string;
  language: string;
  theme: string;
  light: string;
  dark: string;
  system: string;
  exportData: string;
  importData: string;
  clearData: string;
  confirmDelete: string;
  ok: string;
  overBudget: string;
  onTrack: string;
  uploadReceipt: string;
};

const translations: Record<Locale, TranslationKeys> = {
  en: {
    dashboard: 'Dashboard',
    transactions: 'Transactions',
    upload: 'Upload',
    export: 'Export',
    settings: 'Settings',
    categories: 'Categories',
    netBalance: 'Net Balance',
    totalIncome: 'Total Income',
    totalExpense: 'Total Expense',
    income: 'Income',
    expense: 'Expense',
    budget: 'Budget',
    spent: 'Spent',
    remaining: 'Remaining',
    cashFlow: 'Cash Flow',
    categoryBreakdown: 'Category Breakdown',
    budgetProgress: 'Budget Progress',
    paymentMethods: 'Payment Methods',
    billsChecklist: 'Bills Checklist',
    savingsGoals: 'Savings Goals',
    recentTransactions: 'Recent Transactions',
    viewAll: 'View all',
    addTransaction: 'Add Transaction',
    editTransaction: 'Edit Transaction',
    deleteTransaction: 'Delete Transaction',
    description: 'Description',
    category: 'Category',
    amount: 'Amount',
    date: 'Date',
    paymentMethod: 'Payment Method',
    notes: 'Notes',
    save: 'Save',
    cancel: 'Cancel',
    search: 'Search',
    filter: 'Filter',
    noData: 'No data yet',
    paid: 'Paid',
    unpaid: 'Unpaid',
    overdue: 'Overdue',
    dueDate: 'Due Date',
    target: 'Target',
    saved: 'Saved',
    of: 'of',
    all: 'All',
    thisMonth: 'This Month',
    language: 'Language',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    exportData: 'Export Data',
    importData: 'Import Data',
    clearData: 'Clear Data',
    confirmDelete: 'Are you sure you want to delete this?',
    ok: 'OK',
    overBudget: 'Over Budget',
    onTrack: 'On Track',
    uploadReceipt: 'Upload Receipt',
  },
  id: {
    dashboard: 'Dasbor',
    transactions: 'Transaksi',
    upload: 'Unggah',
    export: 'Ekspor',
    settings: 'Pengaturan',
    categories: 'Kategori',
    netBalance: 'Saldo Bersih',
    totalIncome: 'Total Pemasukan',
    totalExpense: 'Total Pengeluaran',
    income: 'Pemasukan',
    expense: 'Pengeluaran',
    budget: 'Anggaran',
    spent: 'Terpakai',
    remaining: 'Tersisa',
    cashFlow: 'Arus Kas',
    categoryBreakdown: 'Rincian Kategori',
    budgetProgress: 'Progres Anggaran',
    paymentMethods: 'Metode Pembayaran',
    billsChecklist: 'Daftar Tagihan',
    savingsGoals: 'Target Tabungan',
    recentTransactions: 'Transaksi Terbaru',
    viewAll: 'Lihat semua',
    addTransaction: 'Tambah Transaksi',
    editTransaction: 'Edit Transaksi',
    deleteTransaction: 'Hapus Transaksi',
    description: 'Deskripsi',
    category: 'Kategori',
    amount: 'Jumlah',
    date: 'Tanggal',
    paymentMethod: 'Metode Pembayaran',
    notes: 'Catatan',
    save: 'Simpan',
    cancel: 'Batal',
    search: 'Cari',
    filter: 'Filter',
    noData: 'Belum ada data',
    paid: 'Lunas',
    unpaid: 'Belum Lunas',
    overdue: 'Terlambat',
    dueDate: 'Jatuh Tempo',
    target: 'Target',
    saved: 'Tersimpan',
    of: 'dari',
    all: 'Semua',
    thisMonth: 'Bulan Ini',
    language: 'Bahasa',
    theme: 'Tema',
    light: 'Terang',
    dark: 'Gelap',
    system: 'Sistem',
    exportData: 'Ekspor Data',
    importData: 'Impor Data',
    clearData: 'Hapus Data',
    confirmDelete: 'Yakin ingin menghapus ini?',
    ok: 'OK',
    overBudget: 'Melebihi Anggaran',
    onTrack: 'Sesuai',
    uploadReceipt: 'Unggah Struk',
  },
};

export function t(locale: Locale, key: keyof TranslationKeys): string {
  return translations[locale][key];
}

export const LocaleContext = createContext<Locale>('en');

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

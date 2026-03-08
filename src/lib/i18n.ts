'use client';

import { createContext, useContext } from 'react';

export type Locale = 'en' | 'id';

type TranslationKeys = {
  // Navigation
  dashboard: string;
  transactions: string;
  upload: string;
  export: string;
  settings: string;
  categories: string;

  // Dashboard
  netBalance: string;
  totalIncome: string;
  totalExpense: string;
  income: string;
  expense: string;
  budget: string;
  spent: string;
  remaining: string;
  savingsRate: string;
  cashFlow: string;
  categoryBreakdown: string;
  budgetProgress: string;
  paymentMethods: string;
  billsChecklist: string;
  savingsGoals: string;
  recentTransactions: string;
  viewAll: string;
  quickActions: string;

  // Transactions
  addTransaction: string;
  editTransaction: string;
  deleteTransaction: string;
  description: string;
  category: string;
  amount: string;
  date: string;
  paymentMethod: string;
  notes: string;

  // Common actions
  save: string;
  cancel: string;
  search: string;
  filter: string;
  ok: string;
  back: string;
  clear: string;
  confirm: string;

  // States
  noData: string;
  loading: string;
  success: string;
  error: string;

  // Bills
  paid: string;
  unpaid: string;
  overdue: string;
  dueDate: string;

  // Savings
  target: string;
  saved: string;
  of: string;

  // Filters
  all: string;
  thisMonth: string;

  // Settings
  language: string;
  theme: string;
  light: string;
  dark: string;
  system: string;
  appearance: string;
  dataManagement: string;

  // Export
  exportData: string;
  importData: string;
  clearData: string;
  confirmDelete: string;
  exportFormat: string;
  exportScope: string;
  exportOptions: string;
  exportPreview: string;
  includeSummary: string;
  groupByDate: string;
  downloadReady: string;

  // Upload & OCR
  uploadReceipt: string;
  extractData: string;
  extractedData: string;
  processing: string;
  uploadImage: string;
  dropHere: string;
  orClickBrowse: string;
  extractText: string;
  saveTransaction: string;
  confidence: string;
  reviewExtracted: string;

  // Budget
  overBudget: string;
  onTrack: string;

  // Validation
  required: string;
  invalidAmount: string;
  selectCategory: string;

  // Import
  importFile: string;
  importSuccess: string;
  importError: string;
  selectFile: string;
  supportedFormats: string;
  transactionsFound: string;
  rowsSkipped: string;
  importNow: string;
  tryAgain: string;

  // Navigation
  menu: string;
  newTransaction: string;
  collapse: string;

  // Toasts
  transactionSaved: string;
  transactionDeleted: string;
  exportSuccess: string;
  dataClearedToast: string;

  // Pages
  pageNotFound: string;
  somethingWentWrong: string;
  refreshPage: string;
  backToDashboard: string;

  // Misc
  type: string;
  net: string;
  noResults: string;
  clearFilters: string;
  and: string;
  more: string;
  delete: string;
  edit: string;
  add: string;
  name: string;
  transactionType: string;
  previousYear: string;
  nextYear: string;
  clearFile: string;
  receiptPreview: string;
  uploadAnother: string;
  failedExtract: string;
  noTransactionsMatch: string;
  backToTransactions: string;
  recordTransaction: string;
  transactionCount: string;
  expenseCategories: string;
  incomeSources: string;
  addCategory: string;
  categoryName: string;
  methodName: string;
  transactionUpdated: string;
  transactionAdded: string;
  failedSave: string;
  exportFailed: string;
  fixExtractedErrors: string;
  savedFromReceipt: string;
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
    savingsRate: 'Savings Rate',
    cashFlow: 'Cash Flow',
    categoryBreakdown: 'Category Breakdown',
    budgetProgress: 'Budget Progress',
    paymentMethods: 'Payment Methods',
    billsChecklist: 'Bills Checklist',
    savingsGoals: 'Savings Goals',
    recentTransactions: 'Recent Transactions',
    viewAll: 'View all',
    quickActions: 'Quick Actions',
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
    ok: 'OK',
    back: 'Back',
    clear: 'Clear',
    confirm: 'Confirm',
    noData: 'No data yet',
    loading: 'Loading...',
    success: 'Success',
    error: 'Something went wrong',
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
    appearance: 'Appearance',
    dataManagement: 'Data Management',
    exportData: 'Export Data',
    importData: 'Import Data',
    clearData: 'Clear All Data',
    confirmDelete: 'Are you sure? This will permanently delete all your data.',
    exportFormat: 'Format',
    exportScope: 'Scope',
    exportOptions: 'Options',
    exportPreview: 'Preview',
    includeSummary: 'Include summary totals',
    groupByDate: 'Group by date',
    downloadReady: 'Ready to download',
    uploadReceipt: 'Upload Receipt',
    extractData: 'Extract Data',
    extractedData: 'Extracted Data',
    processing: 'Processing...',
    uploadImage: 'Upload Image',
    dropHere: 'Drop receipt image here',
    orClickBrowse: 'or click to browse',
    extractText: 'Extract Text',
    saveTransaction: 'Save Transaction',
    confidence: 'Confidence',
    reviewExtracted: 'Review extracted data before saving',
    overBudget: 'Over Budget',
    onTrack: 'On Track',
    required: 'This field is required',
    invalidAmount: 'Enter a valid amount',
    selectCategory: 'Select a category',

    importFile: 'Import File',
    importSuccess: 'Import successful',
    importError: 'Import failed',
    selectFile: 'Choose or drag a file',
    supportedFormats: '.json, .csv',
    transactionsFound: 'transactions found',
    rowsSkipped: 'rows skipped',
    importNow: 'Import Now',
    tryAgain: 'Try Again',

    menu: 'Menu',
    newTransaction: 'New Transaction',
    collapse: 'Collapse',

    transactionSaved: 'Transaction saved',
    transactionDeleted: 'Transaction deleted',
    exportSuccess: 'Export successful',
    dataClearedToast: 'All data cleared',

    pageNotFound: 'Page Not Found',
    somethingWentWrong: 'Something went wrong',
    refreshPage: 'Refresh Page',
    backToDashboard: 'Back to Dashboard',

    type: 'Type',
    net: 'Net',
    noResults: 'No results found',
    clearFilters: 'Clear Filters',
    and: 'and',
    more: 'more',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    name: 'Name',
    transactionType: 'Transaction type',
    previousYear: 'Previous year',
    nextYear: 'Next year',
    clearFile: 'Clear file',
    receiptPreview: 'Receipt preview',
    uploadAnother: 'Upload Another',
    failedExtract: 'Failed to extract text',
    noTransactionsMatch: 'No transactions match your filters',
    backToTransactions: 'Back to Transactions',
    recordTransaction: 'Record a new income or expense transaction',
    transactionCount: 'transactions this month',
    expenseCategories: 'Expense Categories',
    incomeSources: 'Income Sources',
    addCategory: 'Add Category',
    categoryName: 'Category name',
    methodName: 'Method name',
    transactionUpdated: 'Transaction updated',
    transactionAdded: 'Transaction added',
    failedSave: 'Failed to save',
    exportFailed: 'Export failed',
    fixExtractedErrors: 'Please fix extracted data errors',
    savedFromReceipt: 'Transaction saved from receipt',
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
    savingsRate: 'Tingkat Tabungan',
    cashFlow: 'Arus Kas',
    categoryBreakdown: 'Rincian Kategori',
    budgetProgress: 'Progres Anggaran',
    paymentMethods: 'Metode Pembayaran',
    billsChecklist: 'Daftar Tagihan',
    savingsGoals: 'Target Tabungan',
    recentTransactions: 'Transaksi Terbaru',
    viewAll: 'Lihat semua',
    quickActions: 'Aksi Cepat',
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
    ok: 'OK',
    back: 'Kembali',
    clear: 'Hapus',
    confirm: 'Konfirmasi',
    noData: 'Belum ada data',
    loading: 'Memuat...',
    success: 'Berhasil',
    error: 'Terjadi kesalahan',
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
    appearance: 'Tampilan',
    dataManagement: 'Manajemen Data',
    exportData: 'Ekspor Data',
    importData: 'Impor Data',
    clearData: 'Hapus Semua Data',
    confirmDelete: 'Yakin? Semua data akan dihapus secara permanen.',
    exportFormat: 'Format',
    exportScope: 'Cakupan',
    exportOptions: 'Opsi',
    exportPreview: 'Pratinjau',
    includeSummary: 'Sertakan total ringkasan',
    groupByDate: 'Kelompokkan berdasarkan tanggal',
    downloadReady: 'Siap diunduh',
    uploadReceipt: 'Unggah Struk',
    extractData: 'Ekstrak Data',
    extractedData: 'Data Terekstrak',
    processing: 'Memproses...',
    uploadImage: 'Unggah Gambar',
    dropHere: 'Letakkan gambar struk di sini',
    orClickBrowse: 'atau klik untuk pilih file',
    extractText: 'Ekstrak Teks',
    saveTransaction: 'Simpan Transaksi',
    confidence: 'Kepercayaan',
    reviewExtracted: 'Periksa data terekstrak sebelum menyimpan',
    overBudget: 'Melebihi Anggaran',
    onTrack: 'Sesuai',
    required: 'Kolom ini wajib diisi',
    invalidAmount: 'Masukkan jumlah yang valid',
    selectCategory: 'Pilih kategori',

    importFile: 'Impor File',
    importSuccess: 'Impor berhasil',
    importError: 'Impor gagal',
    selectFile: 'Pilih atau seret file',
    supportedFormats: '.json, .csv',
    transactionsFound: 'transaksi ditemukan',
    rowsSkipped: 'baris dilewati',
    importNow: 'Impor Sekarang',
    tryAgain: 'Coba Lagi',

    menu: 'Menu',
    newTransaction: 'Transaksi Baru',
    collapse: 'Perkecil',

    transactionSaved: 'Transaksi disimpan',
    transactionDeleted: 'Transaksi dihapus',
    exportSuccess: 'Ekspor berhasil',
    dataClearedToast: 'Semua data dihapus',

    pageNotFound: 'Halaman Tidak Ditemukan',
    somethingWentWrong: 'Terjadi Kesalahan',
    refreshPage: 'Muat Ulang',
    backToDashboard: 'Kembali ke Dasbor',

    type: 'Tipe',
    net: 'Bersih',
    noResults: 'Tidak ada hasil',
    clearFilters: 'Hapus Filter',
    and: 'dan',
    more: 'lainnya',
    delete: 'Hapus',
    edit: 'Edit',
    add: 'Tambah',
    name: 'Nama',
    transactionType: 'Tipe transaksi',
    previousYear: 'Tahun sebelumnya',
    nextYear: 'Tahun berikutnya',
    clearFile: 'Hapus file',
    receiptPreview: 'Pratinjau struk',
    uploadAnother: 'Unggah Lagi',
    failedExtract: 'Gagal mengekstrak teks',
    noTransactionsMatch: 'Tidak ada transaksi yang cocok dengan filter',
    backToTransactions: 'Kembali ke Transaksi',
    recordTransaction: 'Catat transaksi baru',
    transactionCount: 'transaksi bulan ini',
    expenseCategories: 'Kategori Pengeluaran',
    incomeSources: 'Sumber Pemasukan',
    addCategory: 'Tambah Kategori',
    categoryName: 'Nama kategori',
    methodName: 'Nama metode',
    transactionUpdated: 'Transaksi diperbarui',
    transactionAdded: 'Transaksi ditambahkan',
    failedSave: 'Gagal menyimpan',
    exportFailed: 'Ekspor gagal',
    fixExtractedErrors: 'Periksa data yang diekstrak',
    savedFromReceipt: 'Transaksi disimpan dari struk',
  },
};

export function t(locale: Locale, key: keyof TranslationKeys): string {
  return translations[locale][key];
}

export const LocaleContext = createContext<Locale>('en');

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

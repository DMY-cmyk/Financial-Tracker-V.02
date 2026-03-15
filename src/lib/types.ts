export interface Transaction {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  description: string;
  category: string; // denormalized display name
  categoryId: string; // FK to categories.id
  type: 'income' | 'expense';
  amount: number;
  paymentMethod: string;
  notes: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
  budget: number;
}

export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  type: 'bank' | 'cash' | 'ewallet';
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: number; // day of month
  isPaid: boolean;
  isRecurring: boolean;
  month: number;
  year: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  color: string;
}

export interface RecurringTransaction {
  id: string;
  description: string;
  category: string;
  categoryId: string;
  type: 'income' | 'expense';
  amount: number;
  paymentMethod: string;
  notes: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate: string | null;
  nextDueDate: string;
  isActive: boolean;
}

export type DashboardView = 'years' | 'months' | 'dashboard';

export interface UIState {
  selectedMonth: number;
  selectedYear: number;
  theme: 'light' | 'dark' | 'system';
  locale: 'en' | 'id';
  sidebarCollapsed: boolean;
  dashboardView: DashboardView;
  dashboardViewDirection: 1 | -1;
}

export interface DashboardSummary {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  savingsRate: number;
  transactionCount: number;
}

export interface QuickAction {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: string;
}

export type ExtractionStatus =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'extracted'
  | 'saved'
  | 'error';

export interface ExtractionField {
  key: string;
  label: string;
  value: string;
  confidence: number; // 0-100
  editable: boolean;
}

export interface ExtractionResult {
  amount: string;
  description: string;
  date: string;
  category: string;
  paymentMethod: string;
  confidence: number; // overall 0-100
  status: ExtractionStatus;
}

// === Bulk Import Types ===

export interface BulkImportRow {
  rowIndex: number;
  date: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  paymentMethod: string;
  description: string;
  notes: string;
  isValid: boolean;
  errors: string[];
}

export interface BulkImportResult {
  rows: BulkImportRow[];
  validCount: number;
  invalidCount: number;
  totalIncome: number;
  totalExpense: number;
}

export type BulkImportSource = 'excel' | 'image';

export type BulkImportStatus = 'idle' | 'parsing' | 'preview' | 'importing' | 'complete' | 'error';

export type ExportFormat = 'csv' | 'json' | 'xlsx' | 'pdf';
export type ExportScope = 'current' | 'all' | 'range';

export interface ExportState {
  format: ExportFormat;
  scope: ExportScope;
  includeSummary: boolean;
  groupByDate: boolean;
  startDate?: string;
  endDate?: string;
}

export interface LanguageOption {
  code: 'en' | 'id';
  label: string;
  nativeLabel: string;
  flag: string;
}

export interface FinancialStore {
  ui: UIState;
  initialized: boolean;

  // UI actions
  setMonth: (month: number) => void;
  setYear: (year: number) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLocale: (locale: 'en' | 'id') => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setDashboardView: (view: DashboardView) => void;

  // Lifecycle
  initialize: () => void;
  clearAllData: () => void;
}

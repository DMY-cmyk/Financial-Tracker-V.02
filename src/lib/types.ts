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
  sourceRecurringId?: string;
  sourceDueDate?: string;
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
  beginningBalance: number;
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

export interface Liability {
  id: string;
  name: string;
  amount: number;
  category: 'loan' | 'credit_card' | 'other';
  createdAt: string;
}

export interface NetWorthCurrent {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  breakdown: {
    paymentMethodBalances: number;
    savingsGoals: number;
  };
}

export interface NetWorthSnapshot {
  id: string;
  month: number;
  year: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  snapshotData: {
    paymentMethodBalances: number;
    savingsGoals: number;
    liabilities: number;
  } | null;
  createdAt: string;
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

export interface MonthlyBudget {
  id: string;
  categoryId: string;
  month: number;  // 0–11
  year: number;
  budgetAmount: number;
}

export interface MonthlySpending {
  categoryId: string;
  month: number;  // 0–11
  spent: number;
}

export interface AnnualBudgetGridResponse {
  year: number;
  categories: Category[];
  overrides: MonthlyBudget[];
  spending: MonthlySpending[];
}

export interface UIState {
  selectedMonth: number;
  selectedYear: number;
  theme: 'light' | 'dark' | 'system';
  locale: 'en' | 'id';
  sidebarCollapsed: boolean;
  dashboardView: DashboardView;
  dashboardViewDirection: 1 | -1;
  collapsedGroups: Record<string, boolean>;
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

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';
export type ExportScope = 'current' | 'all' | 'range';

export interface ExportState {
  format: ExportFormat;
  scope: ExportScope;
  groupByDate: boolean;
  startDate?: string;
  endDate?: string;
}

export interface ExportReportInput {
  /** Human-readable scope label, e.g. "Januari 2026" or "Jan 2025 – Mar 2026" */
  scopeLabel: string;
  /** All transactions in scope */
  transactions: Transaction[];
  /** Sum of all income transactions */
  totalIncome: number;
  /** Sum of all expense transactions */
  totalExpense: number;
  /** totalIncome − totalExpense */
  totalAssets: number;
  /** Grouped income totals by category string */
  incomeCategories: { category: string; total: number }[];
  /** Grouped expense totals by category string (used for Rekap Pengeluaran + pie chart) */
  expenseCategories: { category: string; total: number }[];
  /**
   * Net balance per payment method over the selected scope.
   * Computed as: Σ income txs − Σ expense txs, grouped by tx.paymentMethod.
   * Section header reads "Saldo (periode ini)" to indicate this is not an all-time balance.
   */
  paymentMethodBalances: { name: string; balance: number }[];
  /**
   * Bills from REST API. Only populated for single-month (current) scope.
   * Empty array for annual or multi-month range exports.
   */
  bills: Bill[];
  /** Download filename including extension, e.g. "transactions-Januari-2026.xlsx" */
  filename: string;
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
  toggleNavGroup: (groupId: string) => void;

  // Lifecycle
  initialize: () => void;
  clearAllData: () => void;
}

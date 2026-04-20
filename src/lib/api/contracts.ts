import type {
  Transaction,
  Category,
  PaymentMethod,
  RecurringTransaction,
  Bill,
  Liability,
  NetWorthCurrent,
  NetWorthSnapshot,
  TransactionSplitInput,
} from '@/lib/types';

// === Request types ===

export interface CreateTransactionRequest {
  date: string;
  description: string;
  category: string;
  categoryId: string;
  type: 'income' | 'expense';
  amount: number;
  paymentMethod: string;
  notes: string;
  splits?: TransactionSplitInput[];
}

export interface BulkCreateTransactionRequest {
  transactions: CreateTransactionRequest[];
}

export interface BulkCreateTransactionResponse {
  created: number;
  duplicates: number;
  failed: number;
  errors: { index: number; message: string }[];
}

export interface BulkDeleteTransactionResponse {
  deleted: number;
}

export interface UpdateTransactionRequest {
  date?: string;
  description?: string;
  category?: string;
  categoryId?: string;
  type?: 'income' | 'expense';
  amount?: number;
  paymentMethod?: string;
  notes?: string;
  splits?: TransactionSplitInput[] | null;
}

export interface ListTransactionsParams {
  month?: number;
  year?: number;
  type?: 'income' | 'expense';
  categoryId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortOrder?: 'asc' | 'desc';
  allMonths?: boolean;
  yearOnly?: boolean;
}

export interface DashboardSummaryParams {
  month: number;
  year: number;
}

// === Response types ===

export interface ApiResponse<T> {
  data: T;
  error?: never;
}

export interface ApiError {
  data?: never;
  error: {
    message: string;
    code: string;
    details?: Record<string, string[]>;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

export interface TransactionListResponse {
  transactions: Transaction[];
  total: number;
  income: number;
  expense: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DashboardSummaryResponse {
  balance: number;
  income: number;
  expense: number;
  savingsRate: number;
  transactionCount: number;
  categoryTotals: Record<string, number>;
  paymentMethodTotals: Record<string, number>;
  cashFlow: { date: string; income: number; expense: number }[];
  recentTransactions: Transaction[];
}

// === Folder summary contracts ===

export interface YearSummary {
  year: number;
  count: number;
  income: number;
  expense: number;
}

export interface MonthSummary {
  month: number;
  count: number;
  income: number;
  expense: number;
}

export interface FolderSummaryResponse {
  years?: YearSummary[];
  months?: MonthSummary[];
}

// === Category contracts ===

export interface CategoryListResponse {
  categories: Category[];
}

// === Payment method contracts ===

export interface PaymentMethodListResponse {
  paymentMethods: PaymentMethod[];
}

// === Settings contracts ===

export interface SettingsResponse {
  settings: Record<string, string>;
}

// === Upload contracts ===

export interface UploadResponse {
  id: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  status: 'pending' | 'processing' | 'extracted' | 'saved' | 'error';
  extractedData: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UploadListResponse {
  uploads: UploadResponse[];
}

// === Export job contracts ===

export interface ExportJobResponse {
  id: string;
  format: string;
  scope: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  filters: string | null;
  options: string | null;
  filename: string | null;
  recordCount: number;
  createdAt: string;
  completedAt: string | null;
}

export interface ExportJobListResponse {
  jobs: ExportJobResponse[];
}

// === Bill contracts ===

export interface BillResponse {
  id: string;
  name: string;
  amount: number;
  dueDate: number;
  isPaid: boolean;
  isRecurring: boolean;
  month: number;
  year: number;
}

export interface BillListResponse {
  bills: BillResponse[];
}

export interface CreateBillRequest {
  name: string;
  amount: number;
  dueDate: number;
  isPaid?: boolean;
  isRecurring?: boolean;
  month: number;
  year: number;
}

export interface UpdateBillRequest {
  name?: string;
  amount?: number;
  dueDate?: number;
  isPaid?: boolean;
  isRecurring?: boolean;
}

// === Savings goal contracts ===

export interface SavingsGoalResponse {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  color: string;
}

export interface SavingsGoalListResponse {
  goals: SavingsGoalResponse[];
}

export interface CreateSavingsGoalRequest {
  name: string;
  targetAmount: number;
  savedAmount?: number;
  color: string;
}

export interface UpdateSavingsGoalRequest {
  name?: string;
  targetAmount?: number;
  savedAmount?: number;
  color?: string;
}

// === Recurring transaction contracts ===

export interface RecurringTransactionListResponse {
  recurringTransactions: RecurringTransaction[];
}

export interface CreateRecurringTransactionRequest {
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

export interface UpdateRecurringTransactionRequest {
  description?: string;
  category?: string;
  categoryId?: string;
  type?: 'income' | 'expense';
  amount?: number;
  paymentMethod?: string;
  notes?: string;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate?: string;
  endDate?: string | null;
  nextDueDate?: string;
  isActive?: boolean;
}

// === Due recurring / auto-generate contracts ===

export interface DueItem {
  id: string;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  frequency: string;
  paymentMethod: string;
  overdueCount: number;
  totalAmount: number;
}

export interface DueRecurringResponse {
  dueItems: DueItem[];
  totalTransactions: number;
  totalIncome: number;
  totalExpense: number;
}

export interface GenerateResult {
  generated: number;
  skipped: number;
  totalIncome: number;
  totalExpense: number;
}

// === Balance contracts ===

export interface PaymentMethodBalance {
  id: string;
  name: string;
  type: 'bank' | 'cash' | 'ewallet';
  icon: string;
  beginningBalance: number; // pm.beginning_balance + prior-month chain (monthly path); pm.beginning_balance alone (all-time path)
  income: number;
  expense: number;
  balance: number; // beginningBalance + income − expense
}

export interface BalanceListResponse {
  balances: PaymentMethodBalance[];
}

// === Report contracts ===

export interface MonthlyReportData {
  month: number;
  year: number;
  totalIncome: number;
  totalExpense: number;
  totalAssets: number;
  incomeTransactions: Transaction[];
  expenseTransactions: Transaction[];
  expenseSummaryByCategory: { category: string; total: number }[];
  incomeCategories: { category: string; total: number }[];
  expenseCategories: { category: string; total: number }[];
  paymentMethodBalances: PaymentMethodBalance[];
  bills: Bill[];
}

export interface AnnualReportData {
  // Existing fields — kept for report-generator.ts (XLSX download)
  year: number;
  totalIncome: number;
  totalExpense: number;
  totalAssets: number; // sum of all payment method all-time balances
  monthlyBreakdown: {
    month: number; // 0-based (0 = January)
    income: number;
    expense: number;
    net: number; // kept for report-generator.ts
    balance: number; // alias for net; used by AnnualSummary.tsx
    monthKey: string; // 'YYYY-MM', e.g. '2026-03'
  }[];
  topCategories: { category: string; type: 'income' | 'expense'; total: number }[];
  paymentMethodBalances: PaymentMethodBalance[];
  transactions: Transaction[];

  // New fields — consumed by AnnualSummary.tsx
  totalBalance: number; // totalIncome − totalExpense for the year
  transactionCount: number;
  savingsRate: number; // 0–100, rounded; 0 if totalIncome = 0 or net is negative
  topExpenseCategories: { category: string; amount: number }[];
  previousYear: {
    year: number;
    totalIncome: number;
    totalExpense: number;
    totalBalance: number;
    transactionCount: number;
    savingsRate: number;
  } | null;
  comparison: {
    incomeChange: number | null;
    expenseChange: number | null;
    balanceChange: number | null;
    savingsRateChange: number | null;
  } | null;
}

export interface MonthlyReportResponse {
  report: MonthlyReportData;
}

export type AnnualReportResponse = AnnualReportData;

// === Budget template contracts ===

export interface CategoryBudgetEntry {
  categoryId: string;
  categoryName: string;
  budget: number;
}

export interface BudgetTemplate {
  id: string;
  name: string;
  categoryCount: number;
  createdAt: string;
  preview: string[]; // first 3 category names
}

export interface BudgetSuggestion {
  categoryId: string;
  category: string;
  color: string;
  suggestedBudget: number;
  basedOnMonths: number;
}

export interface BudgetTemplateListResponse {
  templates: BudgetTemplate[];
}

export interface ApplyTemplateResponse {
  applied: number;
  skipped: number;
}

export interface BudgetSuggestionListResponse {
  suggestions: BudgetSuggestion[];
}

export interface CreateBudgetTemplateRequest {
  name: string;
}

// === Forecast contracts ===

export interface ForecastRecurringItem {
  description: string;
  type: 'income' | 'expense';
  amount: number;
  frequency: string;
  occurrences: number;
}

export interface ForecastMonth {
  month: number;
  year: number;
  projectedIncome: number;
  projectedExpense: number;
  projectedNet: number;
  recurringItems: ForecastRecurringItem[];
}

export interface ForecastCurrentMonth {
  month: number;
  year: number;
  actualIncome: number;
  actualExpense: number;
  projectedIncome: number;
  projectedExpense: number;
  projectedNet: number;
}

export interface ForecastResponse {
  currentMonth: ForecastCurrentMonth;
  forecast: ForecastMonth[];
}

// === Liability contracts ===

export interface LiabilityListResponse {
  liabilities: Liability[];
}

export interface CreateLiabilityRequest {
  name: string;
  amount: number;
  category?: 'loan' | 'credit_card' | 'other';
}

export interface UpdateLiabilityRequest {
  name?: string;
  amount?: number;
  category?: 'loan' | 'credit_card' | 'other';
}

// === Net Worth contracts ===

export interface NetWorthDataResponse {
  current: NetWorthCurrent;
  history: NetWorthSnapshot[];
}

// === Spending Insights contracts ===

export interface CategoryComparisonItem {
  categoryId: string;
  category: string;
  color: string;
  thisMonth: number;
  lastMonth: number;
  changePct: number | null;
  changeDelta: number;
}

export interface BiggestTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  color: string;
  paymentMethod: string;
}

export interface DayOfWeekItem {
  dayIndex: number;
  totalAmount: number;
  count: number;
  avgAmount: number;
}

export interface SpendingOutlier {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  color: string;
  categoryAvg: number;
  delta: number;
  multiplier: number;
}

export interface HealthScore {
  income: number;
  expense: number;
  savingsRate: number;
  lastMonthRate: number | null;
  rateChange: number | null;
}

export interface SpendingInsightsResponse {
  categoryComparison: CategoryComparisonItem[];
  biggestTransactions: BiggestTransaction[];
  dayOfWeekPattern: DayOfWeekItem[];
  outliers: SpendingOutlier[];
  healthScore: HealthScore;
  period: { month: number; year: number };
}

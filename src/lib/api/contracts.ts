import type { Transaction, Category, PaymentMethod, RecurringTransaction } from '@/lib/types';

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

export interface UpdateTransactionRequest {
  date?: string;
  description?: string;
  category?: string;
  categoryId?: string;
  type?: 'income' | 'expense';
  amount?: number;
  paymentMethod?: string;
  notes?: string;
}

export interface ListTransactionsParams {
  month?: number;
  year?: number;
  type?: 'income' | 'expense';
  categoryId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
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

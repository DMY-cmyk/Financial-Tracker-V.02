import type { Transaction, Category, PaymentMethod } from '@/lib/types';

// === Request types ===

export interface CreateTransactionRequest {
  date: string;
  description: string;
  category: string;
  type: 'income' | 'expense';
  amount: number;
  paymentMethod: string;
  notes: string;
}

export interface UpdateTransactionRequest {
  date?: string;
  description?: string;
  category?: string;
  type?: 'income' | 'expense';
  amount?: number;
  paymentMethod?: string;
  notes?: string;
}

export interface ListTransactionsParams {
  month?: number;
  year?: number;
  type?: 'income' | 'expense';
  category?: string;
  search?: string;
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

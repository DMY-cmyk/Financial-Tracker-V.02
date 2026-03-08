import type { Transaction } from '@/lib/types';

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

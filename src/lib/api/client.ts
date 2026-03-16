import type { Transaction, Category, PaymentMethod, RecurringTransaction } from '@/lib/types';
import type {
  CreateTransactionRequest,
  BulkCreateTransactionRequest,
  BulkCreateTransactionResponse,
  BulkDeleteTransactionResponse,
  UpdateTransactionRequest,
  TransactionListResponse,
  DashboardSummaryResponse,
  FolderSummaryResponse,
  CategoryListResponse,
  PaymentMethodListResponse,
  SettingsResponse,
  UploadListResponse,
  UploadResponse,
  ExportJobListResponse,
  ExportJobResponse,
  BillListResponse,
  BillResponse,
  CreateBillRequest,
  UpdateBillRequest,
  SavingsGoalListResponse,
  SavingsGoalResponse,
  CreateSavingsGoalRequest,
  UpdateSavingsGoalRequest,
  RecurringTransactionListResponse,
  CreateRecurringTransactionRequest,
  UpdateRecurringTransactionRequest,
  BalanceListResponse,
  MonthlyReportResponse,
  AnnualReportResponse,
  ApiResult,
} from './contracts';

const BASE_URL = '/api';

async function fetchApi<T>(url: string, options?: RequestInit): Promise<ApiResult<T>> {
  const response = await fetch(`${BASE_URL}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const json = await response.json();

  if (!response.ok) {
    return {
      error: json.error || { message: 'Unknown error', code: 'UNKNOWN' },
    };
  }

  return { data: json.data };
}

export const api = {
  transactions: {
    list(params?: {
      month?: number;
      year?: number;
      type?: string;
      categoryId?: string;
      paymentMethod?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    }) {
      const query = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== '') {
            query.set(key, String(value));
          }
        });
      }
      const qs = query.toString();
      return fetchApi<TransactionListResponse>(`/transactions${qs ? `?${qs}` : ''}`);
    },

    create(data: CreateTransactionRequest) {
      return fetchApi<Transaction>('/transactions', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update(id: string, data: UpdateTransactionRequest) {
      return fetchApi<Transaction>(`/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    delete(id: string) {
      return fetchApi<{ success: boolean }>(`/transactions/${id}`, {
        method: 'DELETE',
      });
    },

    bulkCreate(data: BulkCreateTransactionRequest) {
      return fetchApi<BulkCreateTransactionResponse>('/transactions/bulk', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    bulkDelete(ids: string[]) {
      return fetchApi<BulkDeleteTransactionResponse>('/transactions/bulk', {
        method: 'DELETE',
        body: JSON.stringify({ ids }),
      });
    },
  },

  dashboard: {
    summary(month: number, year: number) {
      return fetchApi<DashboardSummaryResponse>(`/dashboard/summary?month=${month}&year=${year}`);
    },

    folderSummary(year?: number) {
      const qs = year !== undefined ? `?year=${year}` : '';
      return fetchApi<FolderSummaryResponse>(`/dashboard/folder-summary${qs}`);
    },
  },

  categories: {
    list(type?: 'income' | 'expense') {
      const qs = type ? `?type=${type}` : '';
      return fetchApi<CategoryListResponse>(`/categories${qs}`);
    },

    create(data: Omit<Category, 'id'>) {
      return fetchApi<Category>('/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update(id: string, data: Partial<Category>) {
      return fetchApi<Category>(`/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    delete(id: string) {
      return fetchApi<{ success: boolean }>(`/categories/${id}`, {
        method: 'DELETE',
      });
    },
  },

  paymentMethods: {
    list() {
      return fetchApi<PaymentMethodListResponse>('/payment-methods');
    },

    create(data: Omit<PaymentMethod, 'id'>) {
      return fetchApi<PaymentMethod>('/payment-methods', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update(id: string, data: Partial<PaymentMethod>) {
      return fetchApi<PaymentMethod>(`/payment-methods/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    delete(id: string) {
      return fetchApi<{ success: boolean }>(`/payment-methods/${id}`, {
        method: 'DELETE',
      });
    },
  },

  settings: {
    get() {
      return fetchApi<SettingsResponse>('/settings');
    },

    update(data: Record<string, string>) {
      return fetchApi<SettingsResponse>('/settings', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
  },

  uploads: {
    list() {
      return fetchApi<UploadListResponse>('/uploads');
    },

    create(data: { filename: string; fileSize: number; mimeType: string }) {
      return fetchApi<UploadResponse>('/uploads', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update(id: string, data: { status?: string; extractedData?: string }) {
      return fetchApi<UploadResponse>(`/uploads/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
  },

  exportJobs: {
    list() {
      return fetchApi<ExportJobListResponse>('/export-jobs');
    },

    create(data: {
      format: string;
      scope: string;
      filters?: string;
      options?: string;
      recordCount?: number;
    }) {
      return fetchApi<ExportJobResponse>('/export-jobs', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  },

  bills: {
    list(params?: { month?: number; year?: number }) {
      const query = new URLSearchParams();
      if (params?.month !== undefined) query.set('month', String(params.month));
      if (params?.year !== undefined) query.set('year', String(params.year));
      const qs = query.toString();
      return fetchApi<BillListResponse>(`/bills${qs ? `?${qs}` : ''}`);
    },

    create(data: CreateBillRequest) {
      return fetchApi<BillResponse>('/bills', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update(id: string, data: UpdateBillRequest) {
      return fetchApi<BillResponse>(`/bills/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    delete(id: string) {
      return fetchApi<{ success: boolean }>(`/bills/${id}`, {
        method: 'DELETE',
      });
    },

    generateRecurring(month: number, year: number) {
      return fetchApi<{ generated: number }>('/bills/generate', {
        method: 'POST',
        body: JSON.stringify({ month, year }),
      });
    },
  },

  savings: {
    list() {
      return fetchApi<SavingsGoalListResponse>('/savings');
    },

    create(data: CreateSavingsGoalRequest) {
      return fetchApi<SavingsGoalResponse>('/savings', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update(id: string, data: UpdateSavingsGoalRequest) {
      return fetchApi<SavingsGoalResponse>(`/savings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    delete(id: string) {
      return fetchApi<{ success: boolean }>(`/savings/${id}`, {
        method: 'DELETE',
      });
    },
  },

  recurringTransactions: {
    list() {
      return fetchApi<RecurringTransactionListResponse>('/recurring-transactions');
    },

    create(data: CreateRecurringTransactionRequest) {
      return fetchApi<RecurringTransaction>('/recurring-transactions', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update(id: string, data: UpdateRecurringTransactionRequest) {
      return fetchApi<RecurringTransaction>(`/recurring-transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    delete(id: string) {
      return fetchApi<{ success: boolean }>(`/recurring-transactions/${id}`, {
        method: 'DELETE',
      });
    },

    generate() {
      return fetchApi<{ generated: number }>('/recurring-transactions/generate', {
        method: 'POST',
      });
    },
  },

  balances: {
    list() {
      return fetchApi<BalanceListResponse>('/payment-methods/balances');
    },
  },

  reports: {
    monthly(month: number, year: number) {
      return fetchApi<MonthlyReportResponse>(`/reports/monthly?month=${month}&year=${year}`);
    },

    annual(year: number) {
      return fetchApi<AnnualReportResponse>(`/reports/annual?year=${year}`);
    },
  },
};

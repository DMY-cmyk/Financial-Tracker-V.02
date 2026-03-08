import type { Transaction, Category, PaymentMethod } from '@/lib/types';
import type {
  CreateTransactionRequest,
  UpdateTransactionRequest,
  TransactionListResponse,
  DashboardSummaryResponse,
  CategoryListResponse,
  PaymentMethodListResponse,
  SettingsResponse,
  UploadListResponse,
  UploadResponse,
  ExportJobListResponse,
  ExportJobResponse,
  ApiResult,
} from './contracts';

const BASE_URL = '/api';

async function fetchApi<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResult<T>> {
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
      category?: string;
      search?: string;
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
      return fetchApi<TransactionListResponse>(
        `/transactions${qs ? `?${qs}` : ''}`
      );
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
  },

  dashboard: {
    summary(month: number, year: number) {
      return fetchApi<DashboardSummaryResponse>(
        `/dashboard/summary?month=${month}&year=${year}`
      );
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

    create(data: { format: string; scope: string; filters?: string; options?: string; recordCount?: number }) {
      return fetchApi<ExportJobResponse>('/export-jobs', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  },
};

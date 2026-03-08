import type { Transaction } from '@/lib/types';
import type {
  CreateTransactionRequest,
  UpdateTransactionRequest,
  TransactionListResponse,
  DashboardSummaryResponse,
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
};

// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { api } from '@/lib/api/client';
import { useStore } from '@/store';
import { useSavingsGoals } from '@/features/savings/useSavingsGoals';
import type { SavingsGoal } from '@/lib/types';

vi.mock('@/lib/api/client', () => ({
  api: {
    savings: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/store', () => ({
  useStore: vi.fn((selector: (s: { initialized: boolean }) => unknown) =>
    selector({ initialized: true })
  ),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/i18n', () => ({
  t: (_locale: string, key: string) => key,
  useLocale: () => 'en',
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.savings.list).mockResolvedValue({ data: { goals: [] } });
});

describe('useSavingsGoals — initial state', () => {
  it('returns isLoading=true and empty goals before fetch resolves', () => {
    vi.mocked(api.savings.list).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useSavingsGoals());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.goals).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});

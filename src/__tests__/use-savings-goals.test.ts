// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
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

describe('useSavingsGoals — data loading', () => {
  it('populates goals and sets isLoading=false after fetch resolves', async () => {
    const goal: SavingsGoal = {
      id: '1',
      name: 'Emergency Fund',
      targetAmount: 10_000_000,
      savedAmount: 5_000_000,
      color: '#2563EB',
    };
    vi.mocked(api.savings.list).mockResolvedValue({ data: { goals: [goal] } });

    const { result } = renderHook(() => useSavingsGoals());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.goals).toEqual([goal]);
    expect(result.current.error).toBeNull();
  });

  it('does not call api.savings.list when initialized=false', () => {
    vi.mocked(useStore).mockImplementation(
      (selector: (s: { initialized: boolean }) => unknown) =>
        selector({ initialized: false })
    );
    renderHook(() => useSavingsGoals());
    expect(api.savings.list).not.toHaveBeenCalled();
    // Restore default so subsequent tests get initialized=true
    vi.mocked(useStore).mockImplementation(
      (selector: (s: { initialized: boolean }) => unknown) =>
        selector({ initialized: true })
    );
  });

  it('sets error when API returns an error', async () => {
    vi.mocked(api.savings.list).mockResolvedValue({
      error: { message: 'Network error', code: 'FETCH_ERROR' },
    });

    const { result } = renderHook(() => useSavingsGoals());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Network error');
    expect(result.current.goals).toEqual([]);
  });

  it('reload() triggers a new fetch', async () => {
    const goal: SavingsGoal = {
      id: '2',
      name: 'Vacation',
      targetAmount: 5_000_000,
      savedAmount: 1_000_000,
      color: '#10B981',
    };
    vi.mocked(api.savings.list)
      .mockResolvedValueOnce({ data: { goals: [] } })
      .mockResolvedValueOnce({ data: { goals: [goal] } });

    const { result } = renderHook(() => useSavingsGoals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.goals).toEqual([]);

    act(() => result.current.reload());

    await waitFor(() => expect(result.current.goals).toEqual([goal]));
  });
});

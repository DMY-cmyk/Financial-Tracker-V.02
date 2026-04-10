// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { api } from '@/lib/api/client';
import { useStore } from '@/store';
import { useSavingsGoals } from '@/features/savings/useSavingsGoals';
import type { SavingsGoal } from '@/lib/types';
import { toast } from 'sonner';

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

    await act(() => result.current.reload());

    await waitFor(() => expect(result.current.goals).toEqual([goal]));
  });
});

describe('useSavingsGoals — form.openAdd', () => {
  it('openAdd sets form.open=true and clears all fields', async () => {
    vi.mocked(api.savings.list).mockResolvedValue({ data: { goals: [] } });
    const { result } = renderHook(() => useSavingsGoals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.form.open).toBe(false);

    act(() => result.current.form.openAdd());

    expect(result.current.form.open).toBe(true);
    expect(result.current.form.editingGoal).toBeNull();
    expect(result.current.form.name).toBe('');
    expect(result.current.form.target).toBe('');
    expect(result.current.form.saved).toBe('');
    expect(result.current.form.color).toBe('#2563EB');
    expect(result.current.form.errors).toEqual({});
  });

  it('form.close sets form.open=false and clears fields', async () => {
    vi.mocked(api.savings.list).mockResolvedValue({ data: { goals: [] } });
    const { result } = renderHook(() => useSavingsGoals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.form.openAdd());
    act(() => result.current.form.setName('My Goal'));
    act(() => result.current.form.close());

    expect(result.current.form.open).toBe(false);
    expect(result.current.form.name).toBe('');
    expect(result.current.form.editingGoal).toBeNull();
    expect(result.current.form.color).toBe('#2563EB');
  });
});

describe('useSavingsGoals — form.openEdit', () => {
  it('openEdit pre-populates all fields from the goal', async () => {
    const goal: SavingsGoal = {
      id: '1',
      name: 'Emergency Fund',
      targetAmount: 10_000_000,
      savedAmount: 5_000_000,
      color: '#EF4444',
    };
    vi.mocked(api.savings.list).mockResolvedValue({ data: { goals: [goal] } });
    const { result } = renderHook(() => useSavingsGoals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.form.openEdit(goal));

    expect(result.current.form.open).toBe(true);
    expect(result.current.form.editingGoal).toEqual(goal);
    expect(result.current.form.name).toBe('Emergency Fund');
    expect(result.current.form.target).toBe('10000000');
    expect(result.current.form.saved).toBe('5000000');
    expect(result.current.form.color).toBe('#EF4444');
  });
});

describe('useSavingsGoals — form.submit validation', () => {
  it('sets errors.name when name is empty and does not call API', async () => {
    vi.mocked(api.savings.list).mockResolvedValue({ data: { goals: [] } });
    const { result } = renderHook(() => useSavingsGoals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.form.openAdd());
    // name is empty, target is also empty
    await act(async () => { await result.current.form.submit(); });

    expect(result.current.form.errors.name).toBe('required');
    expect(api.savings.create).not.toHaveBeenCalled();
  });

  it('sets errors.target when target is zero and does not call API', async () => {
    vi.mocked(api.savings.list).mockResolvedValue({ data: { goals: [] } });
    const { result } = renderHook(() => useSavingsGoals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.form.openAdd());
    act(() => result.current.form.setName('My Goal'));
    act(() => result.current.form.setTarget('0'));
    await act(async () => { await result.current.form.submit(); });

    expect(result.current.form.errors.target).toBe('invalidAmount');
    expect(api.savings.create).not.toHaveBeenCalled();
  });
});

describe('useSavingsGoals — form.submit create', () => {
  it('calls api.savings.create with form data and closes form on success', async () => {
    vi.mocked(api.savings.list).mockResolvedValue({ data: { goals: [] } });
    vi.mocked(api.savings.create).mockResolvedValue({
      data: { id: '99', name: 'New Goal', targetAmount: 5_000_000, savedAmount: 0, color: '#2563EB' },
    });

    const { result } = renderHook(() => useSavingsGoals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.form.openAdd());
    act(() => result.current.form.setName('New Goal'));
    act(() => result.current.form.setTarget('5000000'));

    await act(async () => { await result.current.form.submit(); });

    expect(api.savings.create).toHaveBeenCalledWith({
      name: 'New Goal',
      targetAmount: 5_000_000,
      savedAmount: 0,
      color: '#2563EB',
    });
    expect(result.current.form.open).toBe(false);
    expect(toast.success).toHaveBeenCalled();
  });

  it('keeps form open and shows error toast when create API fails', async () => {
    vi.mocked(api.savings.list).mockResolvedValue({ data: { goals: [] } });
    vi.mocked(api.savings.create).mockResolvedValue({
      error: { message: 'Server error', code: 'INTERNAL_ERROR' },
    });

    const { result } = renderHook(() => useSavingsGoals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.form.openAdd());
    act(() => result.current.form.setName('New Goal'));
    act(() => result.current.form.setTarget('5000000'));

    await act(async () => { await result.current.form.submit(); });

    expect(result.current.form.open).toBe(true);
    expect(toast.error).toHaveBeenCalled();
  });
});

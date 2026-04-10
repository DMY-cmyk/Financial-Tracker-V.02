# Savings Goals Hook Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract all state and logic from `src/app/savings/page.tsx` into a dedicated `useSavingsGoals()` hook with a namespaced return shape, leaving the page as a pure render tree.

**Architecture:** A single hook at `src/features/savings/useSavingsGoals.ts` owns all data fetching, CRUD mutations, form state, delete confirmation, and inline quick-edit state. It returns three namespaced sub-objects (`form`, `deleteConfirm`, `quickEdit`) plus top-level data fields. The savings page is then rewritten to destructure from the hook with zero local state.

**Tech Stack:** React 19 hooks (`useState`, `useEffect`, `useCallback`), Vitest + `@testing-library/react` (`renderHook`, `act`, `waitFor`), Zustand (`useStore` for `initialized` flag only), `api.savings.*` typed fetch client, Sonner toasts, `t()`/`useLocale()` for i18n.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/features/savings/useSavingsGoals.ts` | **Create** | All hook logic: data, form, deleteConfirm, quickEdit |
| `src/__tests__/use-savings-goals.test.ts` | **Create** | ~15 tests covering all hook behaviour |
| `src/app/savings/page.tsx` | **Modify** | Remove all state/logic; destructure from hook; render only |

---

## Reference Types

```typescript
// src/lib/types.ts — already exists, do not change
interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  color: string;
}
```

---

### Task 1: Hook skeleton + first failing test

**Files:**
- Create: `src/features/savings/useSavingsGoals.ts`
- Create: `src/__tests__/use-savings-goals.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/use-savings-goals.test.ts`:

```typescript
// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { api } from '@/lib/api/client';
import { useStore } from '@/store';
import { useSavingsGoals } from '@/features/savings/useSavingsGoals';

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
    // list never resolves in this test — stays pending
    vi.mocked(api.savings.list).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useSavingsGoals());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.goals).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/use-savings-goals.test.ts
```

Expected: FAIL — `Cannot find module '@/features/savings/useSavingsGoals'`

- [ ] **Step 3: Create the hook skeleton**

Create `src/features/savings/useSavingsGoals.ts`:

```typescript
'use client';

import { useState } from 'react';
import type { SavingsGoal } from '@/lib/types';

export const COLOR_OPTIONS = [
  '#2563EB',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#F97316',
];

export function useSavingsGoals() {
  const [goals] = useState<SavingsGoal[]>([]);
  const [error] = useState<string | null>(null);

  return {
    goals,
    isLoading: true,
    error,
    reload: () => {},
    form: {
      open: false,
      editingGoal: null as SavingsGoal | null,
      name: '',
      setName: (_v: string) => {},
      target: '',
      setTarget: (_v: string) => {},
      saved: '',
      setSaved: (_v: string) => {},
      color: COLOR_OPTIONS[0],
      setColor: (_v: string) => {},
      errors: {} as Record<string, string>,
      openAdd: () => {},
      openEdit: (_goal: SavingsGoal) => {},
      close: () => {},
      submit: async () => {},
    },
    deleteConfirm: {
      id: null as string | null,
      setId: (_id: string | null) => {},
      confirm: async () => {},
    },
    quickEdit: {
      goalId: null as string | null,
      value: '',
      open: (_goal: SavingsGoal) => {},
      close: () => {},
      setValue: (_v: string) => {},
      submit: async (_goal: SavingsGoal) => {},
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/use-savings-goals.test.ts
```

Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/features/savings/useSavingsGoals.ts src/__tests__/use-savings-goals.test.ts
git commit -m "feat: scaffold useSavingsGoals hook and test file"
```

---

### Task 2: Data loading — goals populated + isLoading clears

**Files:**
- Modify: `src/features/savings/useSavingsGoals.ts`
- Modify: `src/__tests__/use-savings-goals.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/__tests__/use-savings-goals.test.ts` inside a new describe block after the existing one:

```typescript
import { waitFor } from '@testing-library/react';

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
  });
});
```

Add the `SavingsGoal` type import at the top of the file:
```typescript
import type { SavingsGoal } from '@/lib/types';
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/use-savings-goals.test.ts
```

Expected: FAIL — `isLoading` stays `true`, never clears; API call test fails.

- [ ] **Step 3: Implement data fetching**

Replace the full content of `src/features/savings/useSavingsGoals.ts`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { useStore } from '@/store';
import { useLocale } from '@/lib/i18n';
import type { SavingsGoal } from '@/lib/types';

export const COLOR_OPTIONS = [
  '#2563EB',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#F97316',
];

export function useSavingsGoals() {
  const locale = useLocale();
  const initialized = useStore((s) => s.initialized);

  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [fetchKey, setFetchKey] = useState(0);
  const [loadedKey, setLoadedKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isLoading = loadedKey !== String(fetchKey);

  useEffect(() => {
    if (!initialized) return;
    let cancelled = false;
    setError(null);
    api.savings.list().then((result) => {
      if (cancelled) return;
      if (result.data) {
        setGoals(result.data.goals);
      } else if (result.error) {
        setError(result.error.message);
      }
      setLoadedKey(String(fetchKey));
    });
    return () => {
      cancelled = true;
    };
  }, [initialized, fetchKey]);

  void locale; // used in later tasks

  return {
    goals,
    isLoading,
    error,
    reload: () => setFetchKey((k) => k + 1),
    form: {
      open: false,
      editingGoal: null as SavingsGoal | null,
      name: '',
      setName: (_v: string) => {},
      target: '',
      setTarget: (_v: string) => {},
      saved: '',
      setSaved: (_v: string) => {},
      color: COLOR_OPTIONS[0],
      setColor: (_v: string) => {},
      errors: {} as Record<string, string>,
      openAdd: () => {},
      openEdit: (_goal: SavingsGoal) => {},
      close: () => {},
      submit: async () => {},
    },
    deleteConfirm: {
      id: null as string | null,
      setId: (_id: string | null) => {},
      confirm: async () => {},
    },
    quickEdit: {
      goalId: null as string | null,
      value: '',
      open: (_goal: SavingsGoal) => {},
      close: () => {},
      setValue: (_v: string) => {},
      submit: async (_goal: SavingsGoal) => {},
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/use-savings-goals.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/savings/useSavingsGoals.ts src/__tests__/use-savings-goals.test.ts
git commit -m "feat: implement data fetching with initialized guard in useSavingsGoals"
```

---

### Task 3: Error state + reload

**Files:**
- Modify: `src/__tests__/use-savings-goals.test.ts`
- No hook change needed — error path already wired in Task 2

- [ ] **Step 1: Write the failing tests**

Add to `src/__tests__/use-savings-goals.test.ts` in the `data loading` describe block:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/use-savings-goals.test.ts
```

Expected: FAIL — error test fails because `result.error` is undefined shape, reload test fails because reload is a stub.

- [ ] **Step 3: Fix reload stub**

In `src/features/savings/useSavingsGoals.ts`, replace the `reload` line in the return:

```typescript
    reload: () => setFetchKey((k) => k + 1),
```

This is already correct from Task 2. The error test should also already pass since `result.error` is wired. Run the tests — if both pass, no code change is needed.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/use-savings-goals.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/use-savings-goals.test.ts
git commit -m "test: add error state and reload tests for useSavingsGoals"
```

---

### Task 4: form namespace — field state + openAdd + openEdit

**Files:**
- Modify: `src/features/savings/useSavingsGoals.ts`
- Modify: `src/__tests__/use-savings-goals.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/__tests__/use-savings-goals.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/use-savings-goals.test.ts
```

Expected: FAIL — form fields are stubs, openAdd/close/openEdit don't update state.

- [ ] **Step 3: Implement form field state**

Replace the full content of `src/features/savings/useSavingsGoals.ts`:

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { useStore } from '@/store';
import { useLocale } from '@/lib/i18n';
import type { SavingsGoal } from '@/lib/types';

export const COLOR_OPTIONS = [
  '#2563EB',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#F97316',
];

export function useSavingsGoals() {
  const locale = useLocale();
  const initialized = useStore((s) => s.initialized);

  // Data state
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [fetchKey, setFetchKey] = useState(0);
  const [loadedKey, setLoadedKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isLoading = loadedKey !== String(fetchKey);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [formName, setFormName] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formSaved, setFormSaved] = useState('');
  const [formColor, setFormColor] = useState(COLOR_OPTIONS[0]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Quick edit state
  const [quickEditGoalId, setQuickEditGoalId] = useState<string | null>(null);
  const [quickEditValue, setQuickEditValue] = useState('');

  useEffect(() => {
    if (!initialized) return;
    let cancelled = false;
    setError(null);
    api.savings.list().then((result) => {
      if (cancelled) return;
      if (result.data) {
        setGoals(result.data.goals);
      } else if (result.error) {
        setError(result.error.message);
      }
      setLoadedKey(String(fetchKey));
    });
    return () => {
      cancelled = true;
    };
  }, [initialized, fetchKey]);

  const reload = useCallback(() => setFetchKey((k) => k + 1), []);

  const resetForm = () => {
    setFormName('');
    setFormTarget('');
    setFormSaved('');
    setFormColor(COLOR_OPTIONS[0]);
    setFormErrors({});
    setEditingGoal(null);
  };

  const openAdd = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setFormName(goal.name);
    setFormTarget(String(goal.targetAmount));
    setFormSaved(String(goal.savedAmount));
    setFormColor(goal.color);
    setFormErrors({});
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    resetForm();
  };

  void locale; // used in Tasks 5-6

  return {
    goals,
    isLoading,
    error,
    reload,

    form: {
      open: formOpen,
      editingGoal,
      name: formName,
      setName: setFormName,
      target: formTarget,
      setTarget: setFormTarget,
      saved: formSaved,
      setSaved: setFormSaved,
      color: formColor,
      setColor: setFormColor,
      errors: formErrors,
      openAdd,
      openEdit,
      close: closeForm,
      submit: async () => {},
    },

    deleteConfirm: {
      id: deleteId,
      setId: setDeleteId,
      confirm: async () => {},
    },

    quickEdit: {
      goalId: quickEditGoalId,
      value: quickEditValue,
      open: (_goal: SavingsGoal) => {},
      close: () => {},
      setValue: setQuickEditValue,
      submit: async (_goal: SavingsGoal) => {},
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/use-savings-goals.test.ts
```

Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/savings/useSavingsGoals.ts src/__tests__/use-savings-goals.test.ts
git commit -m "feat: implement form field state, openAdd, openEdit, close in useSavingsGoals"
```

---

### Task 5: form.submit — validation

**Files:**
- Modify: `src/features/savings/useSavingsGoals.ts`
- Modify: `src/__tests__/use-savings-goals.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/__tests__/use-savings-goals.test.ts`:

```typescript
describe('useSavingsGoals — form.submit validation', () => {
  it('sets errors.name when name is empty and does not call API', async () => {
    vi.mocked(api.savings.list).mockResolvedValue({ data: { goals: [] } });
    const { result } = renderHook(() => useSavingsGoals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.form.openAdd());
    // name is empty, target is also empty
    await act(async () => result.current.form.submit());

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
    await act(async () => result.current.form.submit());

    expect(result.current.form.errors.target).toBe('invalidAmount');
    expect(api.savings.create).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/use-savings-goals.test.ts
```

Expected: FAIL — `submit` is a no-op, errors never set.

- [ ] **Step 3: Implement validateForm + wire submit stub**

In `src/features/savings/useSavingsGoals.ts`, add after `closeForm`:

```typescript
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = t(locale, 'required');
    const target = Number(formTarget);
    if (!formTarget || isNaN(target) || target <= 0) errors.target = t(locale, 'invalidAmount');
    const saved = Number(formSaved || '0');
    if (isNaN(saved) || saved < 0) errors.saved = t(locale, 'invalidAmount');
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submit = async () => {
    if (!validateForm()) return;
    // create/update implemented in Task 6 and 7
  };
```

Also add the import of `t` at the top:

```typescript
import { useLocale, t } from '@/lib/i18n';
```

Remove the `void locale` placeholder line.

Update the `form` return to use `submit` instead of `async () => {}`:

```typescript
      submit,
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/use-savings-goals.test.ts
```

Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/savings/useSavingsGoals.ts src/__tests__/use-savings-goals.test.ts
git commit -m "feat: add form validation to useSavingsGoals"
```

---

### Task 6: form.submit — create flow

**Files:**
- Modify: `src/features/savings/useSavingsGoals.ts`
- Modify: `src/__tests__/use-savings-goals.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/__tests__/use-savings-goals.test.ts`:

```typescript
import { toast } from 'sonner';

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

    await act(async () => result.current.form.submit());

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

    await act(async () => result.current.form.submit());

    expect(result.current.form.open).toBe(true);
    expect(toast.error).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/use-savings-goals.test.ts
```

Expected: FAIL — `submit` does nothing after validation passes.

- [ ] **Step 3: Implement create path in submit**

In `src/features/savings/useSavingsGoals.ts`, replace the `submit` function:

```typescript
  const submit = async () => {
    if (!validateForm()) return;

    if (editingGoal) {
      const result = await api.savings.update(editingGoal.id, {
        name: formName.trim(),
        targetAmount: Number(formTarget),
        savedAmount: Number(formSaved || '0'),
        color: formColor,
      });
      if (result.data) {
        toast.success(t(locale, 'goalSaved'));
        reload();
        closeForm();
      } else {
        toast.error(t(locale, 'failedSave'));
      }
    } else {
      const result = await api.savings.create({
        name: formName.trim(),
        targetAmount: Number(formTarget),
        savedAmount: Number(formSaved || '0'),
        color: formColor,
      });
      if (result.data) {
        toast.success(t(locale, 'goalSaved'));
        reload();
        closeForm();
      } else {
        toast.error(t(locale, 'failedSave'));
      }
    }
  };
```

Add `toast` import at the top:

```typescript
import { toast } from 'sonner';
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/use-savings-goals.test.ts
```

Expected: PASS (12 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/savings/useSavingsGoals.ts src/__tests__/use-savings-goals.test.ts
git commit -m "feat: implement form create and update flows in useSavingsGoals"
```

---

### Task 7: form.submit — edit/update flow

**Files:**
- Modify: `src/__tests__/use-savings-goals.test.ts`
- Hook already implements update path from Task 6 — verify with tests

- [ ] **Step 1: Write the failing test**

Add to `src/__tests__/use-savings-goals.test.ts`:

```typescript
describe('useSavingsGoals — form.submit update', () => {
  it('calls api.savings.update with goal id in edit mode', async () => {
    const goal: SavingsGoal = {
      id: 'goal-1',
      name: 'Old Name',
      targetAmount: 5_000_000,
      savedAmount: 1_000_000,
      color: '#10B981',
    };
    vi.mocked(api.savings.list).mockResolvedValue({ data: { goals: [goal] } });
    vi.mocked(api.savings.update).mockResolvedValue({
      data: { ...goal, name: 'New Name' },
    });

    const { result } = renderHook(() => useSavingsGoals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.form.openEdit(goal));
    act(() => result.current.form.setName('New Name'));

    await act(async () => result.current.form.submit());

    expect(api.savings.update).toHaveBeenCalledWith('goal-1', {
      name: 'New Name',
      targetAmount: 5_000_000,
      savedAmount: 1_000_000,
      color: '#10B981',
    });
    expect(result.current.form.open).toBe(false);
    expect(api.savings.create).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/use-savings-goals.test.ts
```

Expected: FAIL — update path is stubbed, api.savings.update not called with correct data.

- [ ] **Step 3: Verify update path is already implemented**

The `submit` function from Task 6 already contains the `editingGoal` branch calling `api.savings.update`. No code change needed — the test should guide you to confirm this is correct. If it fails, check that `formSaved` correctly carries the pre-populated value from `openEdit`.

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/use-savings-goals.test.ts
```

Expected: PASS (13 tests)

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/use-savings-goals.test.ts
git commit -m "test: add edit/update flow test for useSavingsGoals"
```

---

### Task 8: deleteConfirm namespace

**Files:**
- Modify: `src/features/savings/useSavingsGoals.ts`
- Modify: `src/__tests__/use-savings-goals.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/__tests__/use-savings-goals.test.ts`:

```typescript
describe('useSavingsGoals — deleteConfirm', () => {
  it('confirm() calls api.savings.delete and removes goal from list', async () => {
    const goal: SavingsGoal = {
      id: 'del-1',
      name: 'Goal To Delete',
      targetAmount: 1_000_000,
      savedAmount: 0,
      color: '#EF4444',
    };
    vi.mocked(api.savings.list).mockResolvedValue({ data: { goals: [goal] } });
    vi.mocked(api.savings.delete).mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useSavingsGoals());
    await waitFor(() => expect(result.current.goals).toEqual([goal]));

    act(() => result.current.deleteConfirm.setId('del-1'));
    expect(result.current.deleteConfirm.id).toBe('del-1');

    await act(async () => result.current.deleteConfirm.confirm());

    expect(api.savings.delete).toHaveBeenCalledWith('del-1');
    expect(result.current.goals).toEqual([]);
    expect(result.current.deleteConfirm.id).toBeNull();
  });

  it('confirm() does nothing when id is null', async () => {
    vi.mocked(api.savings.list).mockResolvedValue({ data: { goals: [] } });
    const { result } = renderHook(() => useSavingsGoals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => result.current.deleteConfirm.confirm());

    expect(api.savings.delete).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/use-savings-goals.test.ts
```

Expected: FAIL — `confirm` is a no-op stub.

- [ ] **Step 3: Implement deleteConfirm**

In `src/features/savings/useSavingsGoals.ts`, add after `submit`:

```typescript
  const confirmDelete = async () => {
    if (!deleteId) return;
    const deletedGoal = goals.find((g) => g.id === deleteId);
    const result = await api.savings.delete(deleteId);
    if (result.data) {
      setGoals((prev) => prev.filter((g) => g.id !== deleteId));
      toast.success(t(locale, 'goalDeleted'), {
        action: deletedGoal
          ? {
              label: t(locale, 'undo'),
              onClick: async () => {
                await api.savings.create({
                  name: deletedGoal.name,
                  targetAmount: deletedGoal.targetAmount,
                  savedAmount: deletedGoal.savedAmount,
                  color: deletedGoal.color,
                });
                reload();
                toast.success(t(locale, 'itemRestored'));
              },
            }
          : undefined,
      });
    }
    setDeleteId(null);
  };
```

Update the `deleteConfirm` return:

```typescript
    deleteConfirm: {
      id: deleteId,
      setId: setDeleteId,
      confirm: confirmDelete,
    },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/use-savings-goals.test.ts
```

Expected: PASS (15 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/savings/useSavingsGoals.ts src/__tests__/use-savings-goals.test.ts
git commit -m "feat: implement deleteConfirm namespace in useSavingsGoals"
```

---

### Task 9: quickEdit namespace

**Files:**
- Modify: `src/features/savings/useSavingsGoals.ts`
- Modify: `src/__tests__/use-savings-goals.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/__tests__/use-savings-goals.test.ts`:

```typescript
describe('useSavingsGoals — quickEdit', () => {
  const goal: SavingsGoal = {
    id: 'qe-1',
    name: 'Quick Goal',
    targetAmount: 10_000_000,
    savedAmount: 3_000_000,
    color: '#8B5CF6',
  };

  it('open() sets goalId and pre-fills value from goal.savedAmount', async () => {
    vi.mocked(api.savings.list).mockResolvedValue({ data: { goals: [goal] } });
    const { result } = renderHook(() => useSavingsGoals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.quickEdit.open(goal));

    expect(result.current.quickEdit.goalId).toBe('qe-1');
    expect(result.current.quickEdit.value).toBe('3000000');
  });

  it('close() clears goalId and value', async () => {
    vi.mocked(api.savings.list).mockResolvedValue({ data: { goals: [goal] } });
    const { result } = renderHook(() => useSavingsGoals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.quickEdit.open(goal));
    act(() => result.current.quickEdit.close());

    expect(result.current.quickEdit.goalId).toBeNull();
    expect(result.current.quickEdit.value).toBe('');
  });

  it('submit() patches savedAmount and updates local goals list', async () => {
    vi.mocked(api.savings.list).mockResolvedValue({ data: { goals: [goal] } });
    vi.mocked(api.savings.update).mockResolvedValue({
      data: { ...goal, savedAmount: 4_000_000 },
    });

    const { result } = renderHook(() => useSavingsGoals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.quickEdit.open(goal));
    act(() => result.current.quickEdit.setValue('4000000'));

    await act(async () => result.current.quickEdit.submit(goal));

    expect(api.savings.update).toHaveBeenCalledWith('qe-1', { savedAmount: 4_000_000 });
    expect(result.current.goals[0].savedAmount).toBe(4_000_000);
    expect(result.current.quickEdit.goalId).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/use-savings-goals.test.ts
```

Expected: FAIL — `open`, `close`, `submit` are stubs.

- [ ] **Step 3: Implement quickEdit namespace**

In `src/features/savings/useSavingsGoals.ts`, add after `confirmDelete`:

```typescript
  const openQuickEdit = (goal: SavingsGoal) => {
    setQuickEditGoalId(goal.id);
    setQuickEditValue(String(goal.savedAmount));
  };

  const closeQuickEdit = () => {
    setQuickEditGoalId(null);
    setQuickEditValue('');
  };

  const submitQuickEdit = async (goal: SavingsGoal) => {
    const newAmount = Number(quickEditValue);
    if (isNaN(newAmount) || newAmount < 0) return;
    const result = await api.savings.update(goal.id, { savedAmount: newAmount });
    if (result.data) {
      setGoals((prev) =>
        prev.map((g) => (g.id === goal.id ? { ...g, savedAmount: newAmount } : g))
      );
      toast.success(t(locale, 'goalSaved'));
    }
    closeQuickEdit();
  };
```

Update the `quickEdit` return:

```typescript
    quickEdit: {
      goalId: quickEditGoalId,
      value: quickEditValue,
      open: openQuickEdit,
      close: closeQuickEdit,
      setValue: setQuickEditValue,
      submit: submitQuickEdit,
    },
```

- [ ] **Step 4: Run the full test suite**

```bash
npx vitest run src/__tests__/use-savings-goals.test.ts
```

Expected: PASS (18 tests)

Then run the full suite:

```bash
npm run test
```

Expected: All existing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/savings/useSavingsGoals.ts src/__tests__/use-savings-goals.test.ts
git commit -m "feat: implement quickEdit namespace in useSavingsGoals"
```

---

### Task 10: Refactor savings page to use the hook

**Files:**
- Modify: `src/app/savings/page.tsx`

- [ ] **Step 1: Replace the page content**

Rewrite `src/app/savings/page.tsx` in full:

```typescript
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { fadeInUp, staggerGrid, staggerGridItem } from '@/lib/motion';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ProgressRing } from '@/components/shared/ProgressRing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Plus, Pencil, Trash2, PiggyBank } from 'lucide-react';
import { useSavingsGoals, COLOR_OPTIONS } from '@/features/savings/useSavingsGoals';

export default function SavingsPage() {
  const locale = useLocale();
  const { goals, isLoading, form, deleteConfirm, quickEdit } = useSavingsGoals();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t(locale, 'savingsPage')} />
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-border bg-card h-40 animate-pulse rounded-2xl border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <motion.div {...fadeInUp}>
        <PageHeader
          title={t(locale, 'savingsPage')}
          description={
            goals.length > 0
              ? `${goals.length} ${locale === 'id' ? 'target' : 'goals'}`
              : undefined
          }
        >
          <Button onClick={form.openAdd} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t(locale, 'addSavingsGoal')}</span>
            <span className="sm:hidden">{t(locale, 'add')}</span>
          </Button>
        </PageHeader>
      </motion.div>

      <div className="mx-auto max-w-2xl">
        <AnimatePresence mode="wait">
          {goals.length === 0 ? (
            <motion.div key="empty" {...fadeInUp}>
              <EmptyState
                title={t(locale, 'noSavingsGoals')}
                icon={<PiggyBank className="h-12 w-12" />}
              >
                <Button onClick={form.openAdd} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t(locale, 'addSavingsGoal')}
                </Button>
              </EmptyState>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              variants={staggerGrid}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              {goals.map((goal) => {
                const pct =
                  goal.targetAmount > 0
                    ? Math.round((goal.savedAmount / goal.targetAmount) * 100)
                    : 0;

                return (
                  <motion.div
                    key={goal.id}
                    variants={staggerGridItem}
                    className="border-border bg-card group hover:bg-muted/50 rounded-2xl border p-5 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <ProgressRing
                        percentage={pct}
                        size={56}
                        strokeWidth={6}
                        color={goal.color}
                      >
                        <span className="text-[10px] font-bold">{pct}%</span>
                      </ProgressRing>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate text-sm font-medium">{goal.name}</p>
                          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => form.openEdit(goal)}
                              aria-label={t(locale, 'edit')}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive h-7 w-7"
                              onClick={() => deleteConfirm.setId(goal.id)}
                              aria-label={t(locale, 'delete')}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-muted-foreground mt-0.5 font-mono text-xs">
                          {formatCurrency(goal.savedAmount)} {t(locale, 'of')}{' '}
                          {formatCurrency(goal.targetAmount)}
                        </p>

                        {quickEdit.goalId === goal.id ? (
                          <div className="mt-2 flex gap-1.5">
                            <Input
                              type="number"
                              value={quickEdit.value}
                              onChange={(e) => quickEdit.setValue(e.target.value)}
                              className="h-7 text-xs"
                              min={0}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') quickEdit.submit(goal);
                                if (e.key === 'Escape') quickEdit.close();
                              }}
                            />
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => quickEdit.submit(goal)}
                            >
                              {t(locale, 'save')}
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => quickEdit.open(goal)}
                            className="text-primary mt-1.5 text-[11px] font-medium hover:underline"
                          >
                            {t(locale, 'updateSaved')}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add/Edit Sheet */}
      <Sheet open={form.open} onOpenChange={(o) => !o && form.close()}>
        <SheetContent className="overflow-y-auto" aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle>
              {form.editingGoal ? t(locale, 'editSavingsGoal') : t(locale, 'addSavingsGoal')}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goal-name">{t(locale, 'goalName')}</Label>
              <Input
                id="goal-name"
                value={form.name}
                onChange={(e) => form.setName(e.target.value)}
                placeholder={locale === 'id' ? 'cth. Dana Darurat' : 'e.g. Emergency Fund'}
              />
              {form.errors.name && (
                <p className="text-destructive text-xs">{form.errors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-target">{t(locale, 'targetAmount')}</Label>
              <Input
                id="goal-target"
                type="number"
                value={form.target}
                onChange={(e) => form.setTarget(e.target.value)}
                placeholder="10000000"
                min={0}
              />
              {form.errors.target && (
                <p className="text-destructive text-xs">{form.errors.target}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-saved">{t(locale, 'savedAmount')}</Label>
              <Input
                id="goal-saved"
                type="number"
                value={form.saved}
                onChange={(e) => form.setSaved(e.target.value)}
                placeholder="0"
                min={0}
              />
              {form.errors.saved && (
                <p className="text-destructive text-xs">{form.errors.saved}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t(locale, 'goalColor')}</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => form.setColor(color)}
                    className={cn(
                      'h-8 w-8 rounded-full border-2 transition-transform',
                      form.color === color
                        ? 'border-foreground scale-110'
                        : 'border-transparent hover:scale-105'
                    )}
                    style={{ backgroundColor: color }}
                    aria-label={color}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={form.submit} className="flex-1">
                {t(locale, 'save')}
              </Button>
              <Button variant="outline" onClick={form.close}>
                {t(locale, 'cancel')}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteConfirm.id}
        onOpenChange={(open) => !open && deleteConfirm.setId(null)}
        title={t(locale, 'deleteSavingsGoal')}
        description={t(locale, 'deleteConfirmDescription')}
        confirmLabel={t(locale, 'delete')}
        cancelLabel={t(locale, 'cancel')}
        onConfirm={deleteConfirm.confirm}
      />

      {/* Mobile FAB */}
      <button
        onClick={form.openAdd}
        className="bg-primary text-primary-foreground fixed right-4 bottom-20 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 lg:bottom-6 lg:hidden"
        aria-label={t(locale, 'addSavingsGoal')}
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: No errors.

- [ ] **Step 3: Run the full test suite**

```bash
npm run test
```

Expected: All tests pass (existing 312 + 18 new = 330 total).

- [ ] **Step 4: Run preflight**

```bash
npm run preflight
```

Expected: format check, typecheck, lint, and build all pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/savings/page.tsx
git commit -m "refactor: replace inline state in savings page with useSavingsGoals hook"
```

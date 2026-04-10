---
feature: Savings Goals Hook Extraction
type: spec
date: 2026-04-10
status: approved
tier: 1
replaces: 2026-03-27-migrate-savings-goals-api-design.md
---

# Savings Goals Hook Extraction — Design Spec

## Overview

The savings page (`src/app/savings/page.tsx`) already reads and writes via `api.savings.*` — no Zustand migration is needed. The remaining gap is that all state management (data fetching, CRUD, form fields, validation, delete confirmation, inline editor) is inlined directly in the page component. This spec covers extracting that logic into a dedicated `useSavingsGoals()` hook with a namespaced return shape.

## Goals

- Extract all state and logic from `src/app/savings/page.tsx` into `src/features/savings/useSavingsGoals.ts`
- Page becomes a pure render tree — no useState, no useEffect, no handlers
- Hook returns namespaced sub-objects for clean page-side destructuring
- Hook is fully tested with `renderHook` + mocked API client

## Non-Goals

- No redesign of the savings goals UI
- No new fields (no deadlines, no categories, no notes)
- No localStorage migration banner (no Zustand savings data ever existed in v2)
- No changes to dashboard widget, API routes, services, or repository

## Confirmed Current State

| Area | State |
|------|-------|
| `src/app/savings/page.tsx` | Already calls `api.savings.*` — no Zustand |
| `src/store/index.ts` | No savings slice — UI state only |
| `src/features/dashboard/useDashboardData.ts` | Already calls `api.savings.list()` |
| `src/features/dashboard/SavingsGoals.tsx` | Pure display component, receives props |
| `src/store/selectors.ts` | Does not exist |

## Approach

Single hook `useSavingsGoals()` with a namespaced return shape (Approach C). One import from the page, organized sub-objects for each concern.

## Design

### New Hook: `src/features/savings/useSavingsGoals.ts`

`COLOR_OPTIONS` constant is defined and exported from this file.

The hook reads `initialized` from Zustand (UI state only) and defers the first fetch until `initialized === true`, consistent with other pages.

**Return shape:**

```ts
export function useSavingsGoals() {
  return {
    // Data
    goals: SavingsGoal[]
    isLoading: boolean
    error: string | null
    reload: () => void

    // Sheet form (add / edit)
    form: {
      open: boolean
      editingGoal: SavingsGoal | null
      name: string
      setName: (v: string) => void
      target: string                        // string for controlled input
      setTarget: (v: string) => void
      saved: string
      setSaved: (v: string) => void
      color: string
      setColor: (v: string) => void
      errors: Record<string, string>
      openAdd: () => void                   // resets fields, opens sheet
      openEdit: (goal: SavingsGoal) => void // populates fields, opens sheet
      close: () => void                     // resets fields, closes sheet
      submit: () => Promise<void>           // validate → create/update → reload → close
    }

    // Delete confirmation dialog
    deleteConfirm: {
      id: string | null
      setId: (id: string | null) => void
      confirm: () => Promise<void>          // delete → update local list → undo toast
    }

    // Inline saved-amount editor
    quickEdit: {
      goalId: string | null
      value: string
      open: (goal: SavingsGoal) => void     // sets goalId, pre-fills value
      close: () => void
      setValue: (v: string) => void
      submit: (goal: SavingsGoal) => Promise<void>  // PATCH savedAmount → update local list
    }
  }
}
```

**Mutation behaviors:**

- `form.submit()` — validates first; on invalid, sets `errors` and returns early. On success: `reload()`, `close()`, `toast.success`. On API error: `toast.error`, keeps sheet open.
- `deleteConfirm.confirm()` — removes goal from local list immediately (optimistic); undo toast action calls `api.savings.create()` then `reload()`.
- `quickEdit.submit()` — updates local `goals` list directly (optimistic, avoids round-trip for single field change).

### Page Update: `src/app/savings/page.tsx`

Remove all `useState`, `useEffect`, `useCallback`, and handler functions. Replace with:

```ts
const { goals, isLoading, form, deleteConfirm, quickEdit } = useSavingsGoals()
```

Page retains: JSX render tree, motion wrappers, layout classes, color picker render loop.

`COLOR_OPTIONS` import moves from inline definition to import from `useSavingsGoals`.

## File Changes

| File | Action |
|------|--------|
| `src/features/savings/useSavingsGoals.ts` | **Create** |
| `src/__tests__/use-savings-goals.test.ts` | **Create** |
| `src/app/savings/page.tsx` | **Modify** — remove state/logic, destructure from hook |

## Testing Plan

File: `src/__tests__/use-savings-goals.test.ts`
Approach: `renderHook` + `vi.mock('@/lib/api/client')`

| Group | Tests |
|-------|-------|
| Data loading | Fetches on mount after `initialized`; `isLoading` transitions; skips fetch before `initialized`; sets `error` on failure |
| `form` — add | `openAdd()` clears fields; invalid name sets `errors.name`; invalid target sets `errors.target`; valid submit calls `create`, closes, reloads |
| `form` — edit | `openEdit(goal)` pre-populates all fields; submit calls `update` with goal id |
| `deleteConfirm` | `confirm()` calls `delete`, removes from local list; no-op when `id = null` |
| `quickEdit` | `open(goal)` sets goalId + value; `submit()` calls `update`, updates local list; `close()` clears state |

**~15 tests total.** Existing `savings-goal.service.test.ts` is untouched.

## i18n

No new keys required. All strings used by the savings page are already present in `src/lib/i18n.ts`.

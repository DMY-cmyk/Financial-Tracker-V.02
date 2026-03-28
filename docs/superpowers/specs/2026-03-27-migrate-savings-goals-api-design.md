---
feature: Migrate Savings Goals to API
type: spec
date: 2026-03-27
status: draft
tier: 1
---

# Migrate Savings Goals to API — Design Spec

## Overview

Savings goals are described in project memory as stored in Zustand/localStorage. The `/api/savings` backend exists with full CRUD. Investigation of the actual codebase may show partial API usage already — this spec covers completing the migration so all savings data is API-backed and the savings page uses a clean `useSavingsGoals()` hook.

## Goals

- Savings goals persisted in database (survives localStorage clear, works cross-device)
- Savings page driven by a dedicated `useSavingsGoals()` hook (CRUD in hook, not inlined in page)
- Dashboard `SavingsGoals` widget reads from same API-backed source
- Savings data included in export/reports (already feeds from DB once migration done)
- Zero Zustand savings state remaining after migration

## Non-Goals

- No redesign of the savings goals UI
- No new fields (no deadlines, no categories, no notes)
- No savings contribution history/ledger

## Current State Analysis

The project memory states savings goals "remain in Zustand (localStorage)". However, the actual codebase may already partially use the API. The key question is:

1. Does `src/app/savings/page.tsx` call `api.savings.*` or read from Zustand?
2. Does `src/store/index.ts` have a savings slice?
3. Does `src/store/selectors.ts` have savings selectors?

**Regardless of current state**, the migration target is:
- No Zustand savings slice
- No localStorage savings data
- All reads/writes via `/api/savings`

**Existing API (fully built):**
- `GET /api/savings` — list all goals
- `POST /api/savings` — create `{ name, targetAmount, savedAmount, color }`
- `PATCH /api/savings/[id]` — update any fields
- `DELETE /api/savings/[id]` — delete goal

## Approaches

### Option A — Replace Zustand slice with API hook (Recommended)
Create `useSavingsGoals()` hook that wraps all API calls. Update savings page and dashboard widget to use it. Remove any Zustand savings slice.

**Pros:** Clean single source of truth, follows existing Bills migration pattern.
**Cons:** If page already uses API, work is smaller (just extracting the hook).

### Option B — Keep Zustand as optimistic cache, sync to API
Write to Zustand immediately, then persist to API in background.

**Pros:** Instant UI feedback.
**Cons:** Two sources of truth, unnecessary complexity. API responses are fast enough for optimistic updates within the hook.

### Option C — Server-side rendering with revalidation
Load savings via RSC, revalidate on mutation.

**Cons:** Mixing RSC and client interactions poorly — this is a client-heavy CRUD page. Not appropriate.

**Recommendation: Option A.** Match the Bills migration pattern exactly.

## Design

### New Hook: `src/features/savings/useSavingsGoals.ts`

```typescript
export function useSavingsGoals() {
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => { /* GET /api/savings */ }
  const createGoal = async (data: CreateSavingsGoalInput) => { /* POST */ }
  const updateGoal = async (id: string, data: Partial<SavingsGoal>) => { /* PATCH */ }
  const deleteGoal = async (id: string) => { /* DELETE */ }

  useEffect(() => { load() }, [])

  return { goals, isLoading, error, createGoal, updateGoal, deleteGoal, reload: load }
}
```

All mutations call `load()` after success to keep list fresh. Optimistic updates optional (not required for v1).

### Savings Page Updates (`src/app/savings/page.tsx`)
- Replace any Zustand reads with `useSavingsGoals()` hook
- All CRUD actions via hook methods
- Loading/empty/error states from hook

### Dashboard Widget Updates
- `SavingsGoals` widget in `src/features/dashboard/`: read from `useDashboardData()` which fetches `/api/dashboard/summary`
- The dashboard summary API already returns savings goals data from DB
- No change needed if `useDashboardData()` already hits the API

### Zustand Store Cleanup (`src/store/index.ts`)
- Remove `savingsGoals` slice if it exists
- Remove `addSavingsGoal`, `updateSavingsGoal`, `deleteSavingsGoal` actions if present
- Remove from `persist` middleware whitelist

### Selectors Cleanup (`src/store/selectors.ts`)
- Remove any savings-related memoized selectors

### LocalStorage Migration

On first load after the update, any existing localStorage savings data (Zustand persist format) is orphaned. Options:
1. **Silent discard** — localStorage data is cleared on next Zustand persist flush; DB has fresh empty state. Users lose data. Acceptable only if the Zustand schema was different from DB schema (likely).
2. **One-time migration banner** — On savings page, if localStorage has savings data and DB has none, show: "We found N savings goals in your browser. Migrate them to your account?" with [Migrate] button.

**Recommendation:** Implement one-time migration banner. Read the Zustand persist key on mount, if data exists and DB is empty, offer migration. After migration or dismissal, clear the localStorage key.

### LocalStorage Key
Zustand persist key for savings (likely `financial-tracker-storage` or similar — check `src/store/index.ts` `name` field).

## i18n Keys

| Key | EN | ID |
|-----|----|----|
| `migrateSavingsData` | "Migrate savings goals from local storage?" | "Migrasikan tujuan tabungan dari penyimpanan lokal?" |
| `migrateConfirm` | "Migrate" | "Migrasi" |
| `migrateDismiss` | "Discard" | "Abaikan" |

## Testing

- `useSavingsGoals()` hook: mock `api.savings.*`, test CRUD operations and state updates
- Savings page: renders loading state, then goal list from hook
- Migration banner: shows when localStorage has data and API returns empty; hides after action
- Service tests for `/api/savings` already exist

## Edge Cases & Risks

| Risk | Mitigation |
|------|-----------|
| Zustand persist key different than expected | Check `src/store/index.ts` `name` field before implementing migration |
| API already partially used (page already calls api.savings) | If so, work reduces to: extract hook, clean up any remaining Zustand usage, add migration banner |
| Dashboard widget already reads from API | No change needed — skip dashboard widget work |
| User has zero localStorage savings | Migration banner never shows |
| Color values differ between localStorage and DB format | Map colors during migration |

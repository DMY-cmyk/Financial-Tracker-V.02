---
feature: Recurring Transaction Auto-Generate
type: spec
date: 2026-03-27
status: draft
tier: 3
---

# Recurring Transaction Auto-Generate — Design Spec

## Overview

The recurring transactions feature is useless if users must manually navigate to `/recurring` and click "Generate" every month. Most users forget it exists. This feature adds two complementary mechanisms: a dashboard banner that prompts generation when items are past-due, and a Vercel Cron Job that auto-generates daily at 1am. Together they ensure recurring transactions are always up-to-date with zero user friction.

## Goals

- Due recurring transactions are automatically generated daily (Vercel Cron)
- Dashboard shows a dismissable banner with a one-click generate action when items are overdue
- Generate action is idempotent (running twice doesn't create duplicate transactions)
- Cron endpoint is secured against unauthorized calls

## Non-Goals

- No real-time push or email notifications
- No per-item schedule configuration beyond existing frequency/start/end dates
- No preview of what will be generated before generating

## Approaches

### Option A — Due Items Banner on Dashboard (no background jobs)
On dashboard load, check if any recurring transactions are past `next_due_date`. If so, show a dismissable banner: "3 recurring transactions are due — Generate now?" with one-click generate.

**Pros:** No Vercel config needed, works on free plan, user stays informed.
**Cons:** Passive users who never visit the dashboard still miss generation.

### Option B — Vercel Cron Job (fully automatic)
Configure `vercel.json` with a daily cron that calls a secured `POST /api/cron/generate-recurring`. Automatically generates all due items at 1am WIB (18:00 UTC).

**Pros:** Zero user action required. Items always fresh.
**Cons:** Requires Vercel Pro for multiple cron jobs; single cron is free tier.

### Option C — Banner + Cron (Recommended)
Both mechanisms together. Cron auto-generates for passive users; banner provides immediate feedback when items are overdue (e.g., after a cron failure, or after a new recurring item is added mid-month).

**Recommendation: Option C.** The cron is free for a single job on Vercel. The banner catches edge cases. Together they cover all scenarios.

## Design

### Part 1: Dashboard Due-Items Banner

#### Data: `dueRecurringItems`
In `useDashboardData()` (or via `GET /api/dashboard/summary`), compute:
```
dueRecurringItems = recurring_transactions WHERE next_due_date <= today AND is_active = 1
```

This can be a lightweight count from the existing `/api/dashboard/summary` endpoint — add `dueRecurringCount: number` to the response, or query the API separately.

#### New API: `GET /api/recurring-transactions/due-count`
Simple endpoint:
```typescript
// Returns { count: number, items: Array<{ id, description, frequency }> }
// Where next_due_date <= today AND is_active = 1
```

#### Component: `RecurringDueBanner`
Location: `src/features/dashboard/RecurringDueBanner.tsx`

```tsx
interface RecurringDueBannerProps {
  dueItems: Array<{ description: string; frequency: string }>
  onGenerate: () => Promise<void>
  onDismiss: () => void
}
```

Behavior:
- Hidden when `dueItems.length === 0`
- Hidden when user dismissed this session (sessionStorage key `recurring-banner-dismissed-{YYYY-MM-DD}`)
- Shows: "You have {N} recurring transactions due: Gaji, Netflix, Listrik. Generate them now?"
- [Generate] button → calls `POST /api/recurring-transactions/generate` → success toast "Rp X.XXX total generated" → banner hides
- [×] dismiss button → hides for today (sessionStorage)
- Placement: above all other widgets in dashboard
- Animation: `fadeInUp` from `src/lib/motion.ts`
- Loading state on Generate button while API call in flight

#### Dashboard hook update (`useDashboardData`):
Add `dueRecurringItems` to returned data. Fetch from new due-count endpoint or extend summary endpoint.

### Part 2: Vercel Cron Job

#### New API Route: `POST /api/cron/generate-recurring`

Security: Vercel Cron requests include `Authorization: Bearer {CRON_SECRET}` header. Reject all others.

```typescript
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await recurringTransactionService.generateDueTransactions()
  return Response.json({ generated: result.data?.generated ?? 0 })
}
```

#### `vercel.json` addition:
```json
{
  "crons": [
    {
      "path": "/api/cron/generate-recurring",
      "schedule": "0 18 * * *"
    }
  ]
}
```
`0 18 * * *` = 18:00 UTC = 01:00 WIB (UTC+7).

#### Environment variable:
`CRON_SECRET=<random 32-char string>` — add to `.env.local` and Vercel dashboard.

### Idempotency (Critical)

`generateDueTransactions()` in the service layer must be idempotent. Current implementation updates `next_due_date` after generation. To prevent duplicates:
1. Check if a transaction with the same `description`, `amount`, `category_id`, and `date` (the `next_due_date`) already exists before inserting
2. If it exists, skip and still advance `next_due_date`
3. Return count of actually-created vs skipped

This ensures that running generate twice (banner + cron same day) doesn't double-create.

### Dismiss Logic

Banner dismissal key: `recurring-banner-dismissed-{YYYY-MM-DD}` in sessionStorage.
- Key includes today's date so the banner reappears the next day if items are still overdue
- After successful generate: hide banner (no sessionStorage write — it's handled by UI state)

## i18n Keys

| Key | EN | ID |
|-----|----|----|
| `recurringDue` | "recurring transactions due" | "transaksi berulang jatuh tempo" |
| `generateNow` | "Generate Now" | "Buat Sekarang" |
| `recurringGenerated` | "{n} transactions generated" | "{n} transaksi dibuat" |
| `dueToday` | "due today" | "jatuh tempo hari ini" |
| `recurringDismiss` | "Dismiss" | "Tutup" |

## Testing

- Banner: shows when `dueItems.length > 0`, hides after generate, hides after dismiss
- Generate button: shows loading state, calls correct API, shows success toast
- Dismiss: writes to sessionStorage with today's date, banner hides
- Cron endpoint: returns 401 without correct `CRON_SECRET`, returns 200 with it
- Idempotency: calling generate twice on the same day creates transactions once, not twice
- `generateDueTransactions()` service: skips already-existing transactions, advances `next_due_date` regardless

## Edge Cases & Risks

| Risk | Mitigation |
|------|-----------|
| No recurring transactions | Banner never shows; cron runs but generates nothing (no error) |
| Recurring transaction with `end_date` before today | Service already handles: skip if `end_date` passed; mark inactive |
| Cron fails (Vercel outage) | Banner catches missed generations on next dashboard visit |
| User already generated via `/recurring` page | Idempotency check prevents duplicates when cron runs later |
| `CRON_SECRET` not set in production | Cron will get 401, fail silently; add startup check log warning |
| Multiple users (future) | When multi-user is added, cron needs to generate per-user; defer for now |

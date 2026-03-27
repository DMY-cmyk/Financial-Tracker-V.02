---
feature: Budget Copy & Templates
type: spec
date: 2026-03-27
status: draft
tier: 2
---

# Budget Copy & Templates — Design Spec

## Overview

The budget page requires users to manually set budget amounts every month. Since budgets are stored on categories (not per-month), this means re-entering the same numbers repeatedly. This feature adds three capabilities: save named budget templates, apply a template to restore budget amounts in bulk, and smart-suggest budgets based on actual spending averages.

## Goals

- Save current category budget amounts as a named template
- Apply a template to bulk-update all category budgets
- Smart-suggest budget amounts based on 3-month spending averages
- Templates persisted in the database (not localStorage)

## Non-Goals

- No per-month budget storage change (budgets remain on `categories.budget`)
- No budget rolling/carry-forward between months
- No multi-currency handling
- No template sharing between users

## Architecture Analysis

**Current budget storage:** `categories.budget REAL` — one value per category, not per-month.

**Implication:** "Copy from last month" in this context means: snapshot the current category budget amounts into a named template. A template is a record containing `[{ categoryId, categoryName, budgetAmount }]`. Applying a template does a bulk `PATCH /api/categories/[id]` for each category's budget amount.

This is the right approach for v1. A future "Yearly Budget Planning" feature (Feature 14) can add per-month budget storage; templates will continue to work as monthly defaults.

## Approaches

### Option A — New `budget_templates` DB table (Recommended)
Templates stored in a new table. Full persistence, cross-device access, included in DB backups.

**Pros:** Durable, no data loss risk, consistent with project architecture.
**Cons:** New DB table and migration needed.

### Option B — Templates in Zustand/localStorage
No new table needed; simpler implementation.

**Cons:** Templates lost on localStorage clear; doesn't persist across devices; inconsistent with project's API-backed data architecture.

### Option C — Add per-month budgets to DB now
Proper long-term solution: `monthly_budgets (category_id, month, year, budget_amount)`.

**Cons:** Large scope change, affects budget page rendering, out of scope for this feature. Reserve for Feature 14.

**Recommendation: Option A.** Matches project architecture. Option C is filed as Feature 14.

## Design

### New DB Table

```sql
CREATE TABLE budget_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category_budgets TEXT NOT NULL,  -- JSON: [{ categoryId, categoryName, budget }]
  created_at TEXT DEFAULT (datetime('now'))
);
```

`category_budgets` stores a snapshot including `categoryName` so the template remains readable even if a category is later renamed or deleted.

### New API Routes

**`GET /api/budget-templates`**
Returns: `[{ id, name, categoryCount, createdAt, preview: first 3 category names }]`

**`POST /api/budget-templates`**
Body: `{ name: string }`
Action: Reads all categories with `budget > 0`, snapshots into `category_budgets` JSON, inserts row.
Returns: created template

**`DELETE /api/budget-templates/[id]`**
Deletes template. 404 if not found.

**`POST /api/budget-templates/[id]/apply`**
For each `{ categoryId, budget }` in the template's `category_budgets`:
- Find the category by ID
- If it exists: `PATCH /api/categories/[id]` with `{ budget }`
- If it doesn't exist: skip (category was deleted)
Returns: `{ applied: number, skipped: number }`

**`GET /api/budget/suggestions?months=3`**
For each expense category, compute `AVG(monthly_total)` over last `months` months.
Returns: `[{ categoryId, category, color, suggestedBudget, basedOnMonths }]`

### Service: `src/server/services/budget-template.service.ts`

```typescript
createTemplate(name: string): ServiceResult<BudgetTemplate>
listTemplates(): ServiceResult<BudgetTemplate[]>
deleteTemplate(id: string): ServiceResult<void>
applyTemplate(id: string): ServiceResult<{ applied: number; skipped: number }>
getBudgetSuggestions(months: number): ServiceResult<BudgetSuggestion[]>
```

### Repository: `src/server/repositories/budget-template.repository.ts`

Standard CRUD + apply logic (reads categories, does bulk update via categoryRepository).

### Budget Page UI Changes (`src/app/budget/page.tsx`)

Add an action bar at the top of the budget page with three buttons:

```
[Save as Template]  [Apply Template ▼]  [Smart Suggest]
```

**Save as Template** → opens `SaveTemplateDialog`:
- Text input: template name (required, max 50 chars)
- Preview: "Saving X categories with budgets"
- [Save] / [Cancel]
- On save: `POST /api/budget-templates` → success toast "Template saved"

**Apply Template** → opens `ApplyTemplateSheet` (slide-over):
- List of saved templates as cards
- Each card: name, category count, created date, [Apply] button
- On [Apply]: confirm dialog "This will overwrite all current budget amounts. Continue?" → `POST /api/budget-templates/[id]/apply` → success toast "X budgets updated"
- Empty state: "No templates saved yet"
- [Delete] button on each card with confirm dialog

**Smart Suggest** → opens `BudgetSuggestionSheet`:
- "Suggested budgets based on your last 3 months of spending"
- List of categories with suggested amounts
- User can adjust each amount (editable inputs)
- [Apply Suggestions] → bulk PATCH all categories → success toast

### New Components (`src/components/budget/`)

- `SaveTemplateDialog.tsx`
- `ApplyTemplateSheet.tsx`
- `TemplateCard.tsx`
- `BudgetSuggestionSheet.tsx`
- `BudgetSuggestionRow.tsx` (category + suggested amount + editable override input)

### New Hook: `useBudgetTemplates()`

```typescript
export function useBudgetTemplates() {
  // state: templates, isLoading, error
  // actions: saveTemplate(name), applyTemplate(id), deleteTemplate(id), loadSuggestions()
}
```

## i18n Keys

| Key | EN | ID |
|-----|----|----|
| `saveAsTemplate` | "Save as Template" | "Simpan sebagai Template" |
| `applyTemplate` | "Apply Template" | "Terapkan Template" |
| `smartSuggest` | "Smart Suggest" | "Saran Cerdas" |
| `templateName` | "Template Name" | "Nama Template" |
| `budgetTemplates` | "Budget Templates" | "Template Anggaran" |
| `applyConfirm` | "This will overwrite all current budget amounts. Continue?" | "Ini akan menimpa semua anggaran saat ini. Lanjutkan?" |
| `templateApplied` | "{n} budgets updated" | "{n} anggaran diperbarui" |
| `suggestionsBasedOn` | "Based on last {n} months" | "Berdasarkan {n} bulan terakhir" |
| `noTemplates` | "No templates saved yet" | "Belum ada template tersimpan" |
| `applySuggestions` | "Apply Suggestions" | "Terapkan Saran" |

## Testing

- `createTemplate`: snapshots all categories with budget > 0
- `applyTemplate`: updates each category's budget; skips deleted categories
- `getBudgetSuggestions`: returns correct averages for last N months
- Apply template with all-deleted categories: `{ applied: 0, skipped: N }` — not an error
- Suggestion with 0 months of data for a category: `suggestedBudget = 0`

## Edge Cases & Risks

| Risk | Mitigation |
|------|-----------|
| Template applied when no categories have budgets | `POST /api/budget-templates` with empty snapshot — allow with warning: "No categories have budgets set" |
| Category renamed after template saved | Template stores `categoryName` at snapshot time — OK for display; applies by `categoryId` |
| Category deleted after template saved | `applyTemplate` skips missing IDs, returns skipped count |
| Smart suggest with < 1 month of data | Returns `suggestedBudget: 0` with note "Not enough data"; UI shows explanation |
| Many templates (>10) | No hard limit; just display list; add delete to manage |

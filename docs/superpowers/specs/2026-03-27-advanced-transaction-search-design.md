---
feature: Advanced Transaction Search
type: spec
date: 2026-03-27
status: draft
tier: 3
---

# Advanced Transaction Search — Design Spec

## Overview

With 100+ transactions per month, the current single search box becomes insufficient. This feature adds an "Advanced Filters" slide-over panel with amount range, multi-category selection, custom date range (overriding month/year), notes field search inclusion, and filter presets saved to localStorage. The existing transaction API is extended to support new query parameters.

## Goals

- Filter by amount range (min/max)
- Select multiple categories simultaneously
- Filter by custom date range (overrides month/year selector)
- Include notes field in keyword search
- Save filter combinations as named presets (localStorage, max 5)
- Active filter count badge on the "Filters" button

## Non-Goals

- No SQLite FTS5 full-text indexing
- No regular expression or semantic search
- No filter presets synced to the database (localStorage only)
- No bulk-edit from filtered results

## Approaches

### Option A — Expand inline filter bar (more filter fields inline)
Add fields directly to the `TransactionFilters` component bar.

**Cons:** UI becomes crowded on mobile; current bar is already full.

### Option B — Collapsible "Advanced" panel below filters bar
Slides down below the filter bar when toggled.

**Pros:** No modal needed.
**Cons:** Pushes content down, disorienting on mobile.

### Option C — Filter Sheet / Slide-over panel (Recommended)
"Filters (N)" button opens a right-side Sheet. Main content stays in place.

**Pros:** Mobile-friendly, doesn't displace content, matches existing Sheet pattern (bills, etc.), N badge shows active filter count.
**Cons:** One extra tap to access filters.

**Recommendation: Option C.** Consistent with app's sheet pattern; cleanest mobile UX.

## Design

### API Changes

New query params for `GET /api/transactions`:
| Param | Type | Description |
|-------|------|-------------|
| `amountMin` | number | Minimum transaction amount (inclusive) |
| `amountMax` | number | Maximum transaction amount (inclusive) |
| `categories` | string | Comma-separated category IDs: `cat1,cat2,cat3` |
| `dateFrom` | string | ISO date `YYYY-MM-DD` — custom range start |
| `dateTo` | string | ISO date `YYYY-MM-DD` — custom range end |
| `includeNotes` | boolean | If true, search also matches `notes` field |

**Mutual exclusivity:** If `dateFrom` + `dateTo` are both provided, `month` and `year` params are ignored.

**Multi-category replaces single-category:** If `categories` is provided (even with one value), it takes priority over the legacy `category` param.

**Zod schema additions in `src/lib/api/validation.ts`:**
```typescript
amountMin: z.coerce.number().min(0).optional()
amountMax: z.coerce.number().min(0).optional()
categories: z.string().optional()  // parsed as comma-split array in service
dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
includeNotes: z.coerce.boolean().optional()
```

**Cross-field validation:**
- If both `amountMin` and `amountMax` are provided: `amountMin <= amountMax` (400 if violated)
- If only one of `dateFrom`/`dateTo` is provided: 400 error

### Repository Changes (`transaction.repository.ts`)

New WHERE clauses added to `findFiltered()`:
```sql
-- Amount range
AND amount >= :amountMin   (if amountMin provided)
AND amount <= :amountMax   (if amountMax provided)

-- Multi-category (IN clause)
AND category_id IN (:cat1, :cat2, :cat3)   (if categories provided)

-- Custom date range (replaces month/year filter)
AND date >= :dateFrom AND date <= :dateTo   (if dateFrom + dateTo provided)

-- Notes search inclusion
AND (description LIKE '%:search%' OR notes LIKE '%:search%')   (if includeNotes)
-- vs current:
AND description LIKE '%:search%'
```

SQLite's parameterized IN clauses require building the query string dynamically (e.g., `IN (${ids.map(() => '?').join(',')})`) — standard practice, not SQL injection risk when IDs are validated UUIDs.

### Hook Changes (`useAllTransactions.ts`)

New state fields:
```typescript
amountMin: string        // string for controlled input, parsed to number for API
amountMax: string
selectedCategories: string[]  // array of category IDs
dateFrom: string              // 'YYYY-MM-DD' or ''
dateTo: string
includeNotes: boolean

// Computed
activeAdvancedFilterCount: number  // count of non-default advanced filter values
```

New actions:
```typescript
setAmountMin, setAmountMax
toggleCategory(id: string), clearCategories()
setDateFrom, setDateTo
setIncludeNotes
clearAdvancedFilters()
```

Date range + month/year mutual exclusivity:
- When `dateFrom` + `dateTo` are both set: month/year params NOT sent to API
- When either date is cleared: fall back to month/year

### New Component: `TransactionFilterSheet`

Location: `src/features/transactions/TransactionFilterSheet.tsx`

```tsx
interface TransactionFilterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // filter state and setters passed as props from useAllTransactions
  amountMin, amountMax, setAmountMin, setAmountMax
  selectedCategories, toggleCategory, clearCategories
  dateFrom, dateTo, setDateFrom, setDateTo
  includeNotes, setIncludeNotes
  categories: Category[]
  onClearAll: () => void
}
```

Sheet layout:
1. **Amount Range** — two IDR-formatted inputs (Min / Max), validation: min ≤ max
2. **Categories** — scrollable checkbox list (all expense categories if type=expense selected; both otherwise)
3. **Date Range** — two date inputs (`dateFrom`, `dateTo`); note: "Overrides month/year selector when set"
4. **Include Notes** — checkbox: "Include notes field in keyword search"
5. **Saved Presets** — horizontal chip row: saved preset names, click to apply; "Save current" button

Footer: `[Clear All]` `[Close]` (apply is live as user changes filters)

### Updated `TransactionFilters` Component

- "Filters" button replaces or extends existing filter UI
- Shows badge: `Filters (3)` when `activeAdvancedFilterCount > 0`
- Opens `TransactionFilterSheet` on click

### Filter Presets (localStorage)

```typescript
interface FilterPreset {
  id: string
  name: string
  filters: {
    amountMin?: number, amountMax?: number
    selectedCategories?: string[]
    dateFrom?: string, dateTo?: string
    includeNotes?: boolean
    type?: string
    search?: string
  }
  createdAt: string
}
```

Storage key: `tx-filter-presets` in localStorage.
Max 5 presets. When a 6th is added, the oldest is removed (shift array).

New hook: `useFilterPresets()`:
```typescript
{ presets, savePreset(name, filters), applyPreset(id), deletePreset(id) }
```

## i18n Keys

| Key | EN | ID |
|-----|----|----|
| `advancedFilters` | "Advanced Filters" | "Filter Lanjutan" |
| `amountRange` | "Amount Range" | "Rentang Jumlah" |
| `minAmount` | "Minimum" | "Minimum" |
| `maxAmount` | "Maximum" | "Maksimum" |
| `multiCategory` | "Categories" | "Kategori" |
| `dateRange` | "Date Range" | "Rentang Tanggal" |
| `dateFrom` | "From" | "Dari" |
| `dateTo` | "To" | "Sampai" |
| `includeNotes` | "Include notes in search" | "Sertakan catatan dalam pencarian" |
| `filterPresets` | "Saved Filters" | "Filter Tersimpan" |
| `savePreset` | "Save current filters" | "Simpan filter saat ini" |
| `presetName` | "Preset name" | "Nama preset" |
| `clearAllFilters` | "Clear All" | "Hapus Semua" |
| `activeFilters` | "Filters ({n})" | "Filter ({n})" |
| `dateRangeOverridesMonth` | "Overrides month selector" | "Menimpa pemilih bulan" |

## Testing

- Repository: amount range filter returns only matching transactions
- Repository: multi-category IN clause returns transactions for all selected categories
- Repository: date range overrides month/year when both provided
- Repository: notes search matches in notes field when `includeNotes=true`
- API validation: `amountMin > amountMax` returns 400
- API validation: only one of `dateFrom`/`dateTo` provided returns 400
- Hook: `activeAdvancedFilterCount` correctly counts non-default values
- Filter preset: save/apply/delete cycle works; max 5 enforced
- Preset with deleted category: applying a preset that includes a deleted category ID — API returns 0 results for that category (not an error)

## Edge Cases & Risks

| Risk | Mitigation |
|------|-----------|
| Multi-category with empty selection | Treat as "no category filter" — show all (don't send `categories` param) |
| amountMin = 0 | Treat as "no minimum" (don't add WHERE clause for 0 minimum) |
| Date range spanning many years | Pagination still applies; no special handling needed |
| Preset contains deleted category ID | API silently returns 0 results for that category; user may notice and re-save preset |
| Mobile: sheet too tall | Sheet is scrollable; sticky footer with Clear/Close |
| Param collision: `categories` + `category` both sent | Prefer `categories` (multi); ignore legacy `category` param when both present |

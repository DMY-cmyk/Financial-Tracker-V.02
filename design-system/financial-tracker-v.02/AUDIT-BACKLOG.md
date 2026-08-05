# UI/UX Audit Backlog — 2026-08-05

Deferred findings from the five-area UI audit (layout/nav, dashboard/charts, transactions/upload, budget/bills/savings, settings/export/shared). Critical and most high-severity items were fixed the same day; this file tracks what remains, roughly ordered by impact. See `MASTER.md` for the design rules these violate.

## High-impact functional

- **Dead PeriodTabs controls** — `src/app/page.tsx` (Daily/Weekly/Monthly) and `src/app/transactions/page.tsx` (four-tab variant) render period tabs whose state is read by nothing. Wire them to actually filter, or remove them. (Product decision.)
- **Category drag-reorder not persisted** — `src/app/settings/categories/page.tsx` `handleReorderExpense/Income` only set local state; order is lost on reload. Needs a `sortOrder` field + API.
- **Inline budget input PATCHes on every keystroke** — `src/app/settings/categories/page.tsx` (~line 310) fires `handleUpdateBudget` per keystroke with no debounce, and failures are silently discarded. Debounce on blur + error toast.
- **`groupByDate` export option is a no-op** — `src/features/export/useExport.ts` stores it but never passes it to exportCSV/Excel/PDF.
- **Bulk-import row editing unreachable** — `ImportPreview.tsx` accepts `onUpdateRow` but never renders editing UI; invalid rows can only be deleted, never corrected. Also "Remove invalid" bulk-deletes with no confirm and no destructive styling.
- **Mobile transaction rows have no actions** — `AllTransactionsView` passes only `onTap` to `TransactionRowMobile`; delete/duplicate/bulk-select are unreachable below `md`.
- **TransactionRowMobile shows bogus time** — `format(new Date(tx.date), 'HH:mm – MMM dd')` on a date-only string renders a timezone artifact (e.g. "07:00").
- **Forecast/upload-history error handling** — `useForecastData` error ignored on `/reports`; upload-history fetch on `/upload` treats failure as empty. Same pattern as the fixed dashboard/bills cases.
- **Search input not debounced** — `useAllTransactions` puts `search` straight into the query key; every keystroke refires a network request.

## i18n sweep (mediums, mechanical)

- Inline `locale === 'id' ? … : …` ternaries instead of `t()` across: DashboardContent, register/login/forgot/reset pages, export page, ImportDialog, bills/savings pages, TransactionForm/Table, upload pages, BalanceGrid/BalanceCard.
- Hardcoded English strings: upload error messages (`useBulkImport`, `useUpload`, `useImport`), `ExtractionStatusBadge`, `ConfidenceBar`, `EmptyState`/`NoResults`/`InlineError` defaults, `ConfirmDialog` default labels, `ForecastBreakdownList` month names, payment-method type options (`Bank`/`Cash`/`E-Wallet`), raw enum badges (`m.type`, `item.frequency`).
- `formatCurrency(amount, locale)` — every dashboard call site omits the locale arg; `formatCurrencyShort` uses English `M`/`K` suffixes (should be `jt`/`rb` in ID) and breaks on negatives; `RecurringDueBanner` and `ImportPreview` hand-roll their own IDR formatters.

## Token/theme sweep (mediums, mechanical)

- Raw Tailwind palette instead of `--pos`/`--neg`/`--warn`/`*-soft` tokens: BudgetCategoryCard, BudgetOverview, BudgetCell (focus glow), AnnualBudgetSummary, BudgetProgress bars, bills page status colors, TransactionForm/Table/Summary, ImportPreview, ExportPreview (`text-emerald-600` no dark variant), AnnualSummary, ImportDialog success panel, `InlineError` (red-50/red-200), WelcomeHero (white/gray-900 literals), RecurringDueBanner (slate/blue litter), NetWorthDashboardWidget hex gradient.
- Category color fallbacks `'#888'` / `'#6B7280'` in AllTransactionsView, CategoryBreakdown, RecentTransactions.

## Motion preset consolidation (mediums)

Replace inline `initial/animate/transition` objects with `src/lib/motion.ts` presets in: DashboardContent, all dashboard widgets (CashFlowChart, CategoryBreakdown, BudgetProgress, RecentTransactions, BillsChecklist, SavingsGoals, PaymentMethods), EmptyState (5 configs), reports page, transactions/new page, ImportProgress, TransactionTable rowVariants. Note per-widget `delay` values currently double-stagger against `staggerContainer`.

## Accessibility (remaining)

- Progress bars lack `role="progressbar"` + aria-value* (BudgetOverview, BudgetCategoryCard, BudgetProgress, BudgetCell).
- `PeriodTabs` uses `role="tablist"` without tabpanel/arrow-key support; settings radiogroups lack roving tabindex.
- Color swatch / icon pickers on categories & savings pages: no aria-label/aria-pressed, 24–32px targets (IconPicker.tsx is the correct model).
- Checkbox rows in TransactionTable lack per-row aria-labels; filter segmented controls lack radio semantics; several Labels missing htmlFor/id pairs (OcrPreview, TransactionFilterSheet, bills/savings sheets — errors also need `aria-describedby`).
- Charts: `role="img"` hides all data; add text/table fallback. SavingsRingCard has no tooltip/legend/label. Skeletons lack `role="status"`.
- Sub-44px touch targets remain in dense areas: BudgetCell controls (~18px), row action buttons (28–32px), ImportPreview row remove (24px), shared `Input` h-8.

## Layout/UX polish (lows)

- Skeletons don't match loaded layouts (reports page, categories page spinner, dashboard PageSkeleton vs full grid) → CLS on load.
- Five dashboard widgets share a bare "No data yet" div; use `EmptyState` with explanation + CTA. Export empty state has no action.
- CashFlowChart drops zero-activity days (non-uniform X axis); tooltip uses lossy `formatCurrencyShort`.
- Data-reset dialog could require type-to-confirm; bills/savings sheet forms are `<div>`s (no Enter-to-submit); `MonthSelector.tsx` is dead code; `EndOfMonthReminder` writes ad-hoc localStorage.
- Login/register submit buttons: no spinner, `disabled:cursor-default` only.

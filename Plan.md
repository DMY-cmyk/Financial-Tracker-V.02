# Financial Tracker V.02 - Implementation Plan

## Overview

A modern, premium financial tracking dashboard using a **Modular Bento Grid** layout. Every data domain (balance, transactions, budgets, bills, savings) lives in its own self-contained card arranged in an asymmetric grid. Built with Next.js 16, Tailwind CSS v4, shadcn/ui, Zustand, Recharts, and Framer Motion. See [BLUEPRINT.md](./BLUEPRINT.md) for full production specifications.

## Architecture

```
data/workbook.json  -->  seed script  -->  Database (Neon Postgres / SQLite)
                                                |
                                           Repositories  -->  Services  -->  API Routes (/api/*)
                                                                                  |
                                           Zustand (UI only)  <---  API Client  -->  React UI
                                                |
                                           localStorage (theme, locale, month/year)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, server-rendered) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui (base-nova) |
| Database | Neon Postgres (production) / SQLite (dev/tests) |
| State | Zustand (UI only: theme, locale, month/year) — all data via REST API |
| Validation | Zod (API request/response validation) |
| Testing | Vitest (241 tests: validation, all services, balance, reports) |
| Charts | Recharts (area, pie, bars) |
| Animations | Framer Motion (spring counters, stagger, transitions) |
| Fonts | Plus Jakarta Sans + JetBrains Mono |
| OCR | Tesseract.js (client-side, lazy-loaded) |
| Export | CSV (native) + ExcelJS (XLSX write, Chart.js charts) + xlsx (read-only, bulk-import) + PDF (jspdf) |
| Hosting | Vercel (auto-deploys from GitHub, Neon Postgres via DATABASE_URL) |

## Status: ✅ DEPLOYED

The app is live on Vercel with Neon Postgres. All implementation phases complete.

---

## Implementation Checklist

### Phase 1: Core Structure (Foundation)

- [x] Next.js 16 + TypeScript + Tailwind v4 + static export
- [x] shadcn/ui initialization (14 primitives: button, card, dialog, input, label, select, checkbox, progress, tabs, badge, separator, sheet, dropdown-menu, tooltip)
- [x] Plus Jakarta Sans + JetBrains Mono fonts
- [x] Custom design system color palette in globals.css (light + dark)
- [x] Zustand store with all slices (transactions, categories, paymentMethods, bills, savings, ui)
- [x] localStorage persistence middleware
- [x] Data migration from workbook.json (cell format -> typed objects)
- [x] i18n system with EN/ID translation dictionary
- [x] Root layout with StoreProvider (theme + locale + data seed)
- [x] Navbar (desktop horizontal top nav with glass effect)
- [x] BottomNav (mobile 5-tab bottom bar, lg breakpoint)
- [x] PageHeader component (enhanced with responsive flex layout)
- [x] All 7 page route files created
- [x] GitHub Actions workflow updated for Next.js build
- [x] .gitignore updated (node_modules, .next, out)
- [x] Sidebar (collapsible desktop sidebar with nav, quick-add, settings)
- [x] Topbar (month navigation with prev/next, mobile logo)
- [x] AppShell (sidebar + topbar + content shell with h-screen layout)
- [x] SectionCard (generic section wrapper with title/action/content)
- [x] StatBadge (colored metric badge component)
- [x] QuickActionButton (CTA action card with icon/label/description)
- [x] FilterBar (reusable filter container wrapper)
- [x] Mock data constants (quick actions, empty state messages)
- [x] DashboardSummary + QuickAction TypeScript interfaces

### Phase 2: Dashboard Analytics (Bento Grid)

- [x] NetBalanceCard with AnimatedCounter (Framer Motion spring)
- [x] MonthSelector (4x3 pill grid with year chevron navigation)
- [x] CashFlowChart (Recharts dual-series area chart, gradient fills)
- [x] CategoryBreakdown (Recharts donut chart, 60% cutout, legend with percentages)
- [x] BudgetProgress (horizontal progress bars, green/amber/red color coding)
- [x] PaymentMethodsSummary (horizontal bars normalized to max)
- [x] BillsChecklist (interactive shadcn checkboxes, paid strikethrough)
- [x] SavingsGoals (SVG ProgressRing, percentage center text)
- [x] RecentTransactions (mini list, category color dots, "View all" link)
- [x] Responsive 3/2/1 column CSS Grid layout
- [x] Framer Motion stagger entrance (60ms per card, y:12->0, 400ms)
- [x] Empty states for all widgets
- [x] Dark mode for all widgets
- [x] Dashboard page with sectioned layout (summary cards, charts, budget, activity, quick actions)
- [x] 4 SummaryCard metrics (balance, income, expense, savings rate) with icon backgrounds
- [x] Quick Actions section (add transaction, upload receipt, export data)
- [x] Decorative background blur circles on hero card
- [x] Chart clip-path wipe entrance animation

### Phase 3: Transaction Management

- [x] TransactionFilters (search input, type toggle, category dropdown)
- [x] TransactionTable (date-grouped sections, hover action buttons)
- [x] TransactionForm (type toggle, amount with live IDR formatting, all fields)
- [x] Summary strip (income/expense/net in 3-cell card) → TransactionSummary component
- [x] Sheet slide-over for add/edit
- [x] CategoryChip (colored dot + name badge)
- [x] Delete transaction
- [x] Standalone /transactions/new page (with back navigation + description)
- [x] Empty state with CTA button when no transactions match filters
- [x] Toast notifications (save/delete feedback via Sonner)
- [x] Delete confirmation dialog (shadcn AlertDialog via ConfirmDialog component)
- [x] Form validation with inline field errors and bilingual messages
- [x] FAB button on mobile for quick add
- [x] Framer Motion entrance animations on page sections
- [x] Payment method filter in filter bar
- [x] Description autocomplete from previous entries
- [x] AnimatePresence for row add/remove transitions

### Phase 4: Upload & Extraction (OCR)

- [x] Drop zone (drag-and-drop + click-to-browse)
- [x] Image preview display
- [x] Tesseract.js integration (lazy-loaded dynamic import)
- [x] Amount extraction (Rp patterns, dot/comma separators)
- [x] Date extraction (DD/MM/YYYY patterns)
- [x] Extracted fields review form (amount, description, date, category)
- [x] Save as transaction
- [x] Extract DropZone into separate component (enhanced with drag state feedback)
- [x] Extract OcrPreview into separate component
- [x] ProcessingOverlay component (spinner on image)
- [x] ConfidenceBar component (green/amber/red)
- [x] ExtractionStatusBadge component (idle/uploading/processing/extracted/saved/error)
- [x] UploadedFileCard component (file name, preview, clear, processing overlay)
- [x] Upload page rewrite using modular components
- [x] Status-driven UI flow (idle -> processing -> extracted -> saved)
- [x] Error/empty states with contextual messaging
- [x] Category auto-suggestion from merchant text matching
- [x] Upload history list
- [x] Progress percentage display during OCR

### Phase 5: Export System

- [x] CSV export (native string generation)
- [x] JSON export
- [x] Scope selector (current month / all data)
- [x] Format selection cards (click to select, blue border)
- [x] Direct browser download trigger
- [x] Export options toggles (include summary, group by date)
- [x] Export preview table (first 5 rows with "and N more" indicator)
- [x] Extract into FormatCard/ScopeSelector/ExportOptions/ExportPreview components
- [x] ExportActionBar component (transaction count, format label, download button)
- [x] Export page rewrite using modular components with full pipeline
- [x] "Coming soon" overlay for unavailable formats (xlsx, pdf)
- [x] SheetJS (xlsx) installed and integrated for Excel export
- [x] Excel export with formatted headers, column widths, and summary sheet
- [x] jsPDF + jspdf-autotable installed and integrated for PDF export
- [x] PDF export with styled table, summary section, and metadata
- [x] Export utilities in `src/lib/export-utils.ts`
- [x] All 4 formats working (CSV, JSON, Excel, PDF)
- [x] Toast feedback for export success/failure
- [x] Framer Motion entrance animations on export sections
- [x] Custom date range picker (start/end)

### Phase 6: Categories & Settings

- [x] Expense category list with color dots and inline budget editing
- [x] Income source list with color dots
- [x] Payment method list with type badges
- [x] Add category form (type, name, color palette, budget)
- [x] Add payment method form (name, type dropdown)
- [x] Delete category/payment method
- [x] Theme selector (Light/Dark/System cards)
- [x] Language toggle (English/Bahasa Indonesia cards)
- [x] Clear all data with confirmation
- [x] SettingsSection component (reusable settings group wrapper)
- [x] LanguageSwitcher component (compact EN/ID pill toggle)
- [x] Settings page rewrite with SaaS-style sectioned layout
- [x] Data management section (export link, import, clear)
- [x] Import data dialog (JSON/CSV file upload with validation and preview)
- [x] Expanded i18n coverage (~110+ translation keys covering all pages)
- [x] Category icon selection
- [x] Drag-to-reorder categories
- [x] Quick language switcher in sidebar

### Cross-cutting: Motion & Localization Foundations (Batch 2)

- [x] Motion presets library (`src/lib/motion.ts`) — fadeIn, fadeInUp, stagger, tapScale, counterSpring, DURATION, EASE
- [x] MotionWrapper component (reusable Framer Motion animation wrapper with delay)
- [x] ExtractionStatus, ExtractionField, ExtractionResult types
- [x] ExportFormat, ExportScope, ExportState types
- [x] LanguageOption type
- [x] LANGUAGE_OPTIONS, EXPORT_FORMATS, UPLOAD constants in mock-data
- [x] i18n expanded to ~80+ keys (navigation, dashboard, actions, states, settings, export, upload, validation)

### Batch 3: Polish & Production Foundations

- [x] Sonner Toaster integrated in root layout (save/delete/export feedback)
- [x] ConfirmDialog component (reusable AlertDialog for destructive actions)
- [x] Replace all `window.confirm()` with ConfirmDialog
- [x] Skeleton loading states (PageSkeleton, SummaryCardSkeleton, ChartCardSkeleton, ListSkeleton, CardSkeleton, TransactionRowSkeleton)
- [x] EmptyState, NoResults, and InlineError shared components
- [x] Form validation library (`src/lib/validation.ts`) with bilingual messages
- [x] TransactionForm validation with inline field errors
- [x] Export utilities (`src/lib/export-utils.ts`) — CSV, JSON, Excel, PDF
- [x] API boundary placeholders (`src/lib/services.ts`)
- [x] Custom hooks: useDashboardData, useTransactions, useUpload, useExport
- [x] Enhanced motion presets (staggerGrid, staggerList, hoverLift, panelVariants)
- [x] StaggerList/StaggerItem components for reusable list animation
- [x] Motion applied to Dashboard, Transactions, Upload, Export, Settings pages
- [x] Accessibility: ARIA labels, role attributes, aria-checked, aria-invalid, aria-describedby
- [x] Responsive refinement: mobile padding, grid gaps, form layouts, FAB placement
- [x] CLAUDE.md project instruction draft
- [x] shadcn/ui alert-dialog and sonner primitives added

### Batch 4: Production Hardening

- [x] Category auto-suggest engine (`src/lib/category-suggest.ts`) — keyword matching for Indonesian & English receipt terms
- [x] Import utilities (`src/lib/import-utils.ts`) — JSON/CSV parsing with validation
- [x] useImport hook (`src/hooks/useImport.ts`) — import state management
- [x] ImportDialog component (`src/components/settings/ImportDialog.tsx`) — drag-and-drop import flow with preview
- [x] Import wired into settings page (replaces disabled button)
- [x] Category auto-suggest wired into useUpload hook (OCR -> category suggestion)
- [x] App-level error boundary (`src/app/error.tsx`)
- [x] Custom 404 page (`src/app/not-found.tsx`)
- [x] Skip link for keyboard navigation (root layout)
- [x] Expanded i18n to ~110+ keys (import, navigation, toasts, pages, misc)
- [x] Sidebar i18n (all labels translated based on locale)
- [x] BottomNav i18n (all labels translated based on locale)
- [x] Topbar a11y (ARIA labels on month navigation buttons)
- [x] Navigation a11y (aria-current="page", aria-label on nav landmarks)
- [x] Enhanced metadata (title template, OG tags, keywords)
- [x] `id="main-content"` on main element for skip link target

### Batch 5: Launch Readiness & Final Polish

#### Tooling & Code Quality
- [x] Prettier configured (`.prettierrc`, `.prettierignore`, `prettier-plugin-tailwindcss`)
- [x] ESLint tightened (legacy files excluded, all warnings resolved)
- [x] Package scripts: `format`, `format:check`, `typecheck`, `validate`, `preflight`
- [x] All source files auto-formatted with Prettier
- [x] Zero lint warnings/errors

#### CI/CD
- [x] CI workflow (`.github/workflows/ci.yml`) — typecheck, lint, format, build, verify export
- [x] Deploy workflow updated with quality gates (typecheck + lint before deploy)
- [x] Concurrency control (cancel redundant CI runs)
- [x] Static export verification step in CI

#### Environment & Config
- [x] `.env.example` with documented variables
- [x] Typed env access (`src/lib/env.ts`)
- [x] No secrets required — fully client-side

#### Responsive & Visual QA
- [x] Dashboard i18n (all labels, summary cards, quick actions translated)
- [x] SummaryCard responsive fix (mobile padding, font sizes, truncation for long IDR)
- [x] Dashboard header responsive typography (text-xl/text-2xl)
- [x] `prefers-reduced-motion` CSS support
- [x] Dark mode `color-scheme: dark` for native UI elements
- [x] Content shift prevention (`overflow-y: scroll` on html)

#### Accessibility
- [x] Skip link for keyboard navigation
- [x] Sidebar, BottomNav, Topbar ARIA labels
- [x] `prefers-reduced-motion` disables all CSS animations
- [x] Focus rings visible in dark mode

#### Documentation
- [x] Release guide (`docs/RELEASE.md`) — setup, deploy, env, checklists
- [x] QA checklist (`docs/QA-CHECKLIST.md`) — responsive, dark mode, cross-browser, smoke tests
- [x] CLAUDE.md updated with tooling and conventions

#### Phase 7 Polish (completed)
- [x] Lint warnings resolved (unused vars, img element, legacy files)
- [x] Static export verified (9 HTML files, all pages present, 404 included)
- [x] Dark mode audit (CSS variables verified, color-scheme set, contrast checked)
- [x] Responsive breakpoint pass (mobile card sizing, typography, padding)
- [x] Cross-browser readiness documented (QA-CHECKLIST.md)

### Final Cleanup & Audit

#### i18n Consistency
- [x] Added 25+ new i18n keys (delete, edit, add, name, transactionType, previousYear, nextYear, etc.)
- [x] Replaced 30+ inline `locale === 'id' ? ... : ...` ternaries with `t()` calls
- [x] All toast messages now use i18n keys
- [x] Export components (ExportActionBar, ScopeSelector, ExportOptions, ExportPreview) fully translated
- [x] ImportDialog fully translated using existing i18n keys
- [x] OcrPreview save button and select placeholder translated
- [x] Error page translated using i18n keys
- [x] i18n dictionary expanded to ~140+ keys

#### Accessibility
- [x] All icon-only buttons have `aria-label` (TransactionTable edit/delete, MonthSelector year nav, UploadedFileCard clear, Categories delete)
- [x] TransactionForm type radiogroup aria-label translated
- [x] DropZone converted to keyboard-accessible (role="button", tabIndex, onKeyDown, aria-label)
- [x] Transaction table action buttons visible on keyboard focus (`group-focus-within:opacity-100`)
- [x] TransactionFilters category select has `aria-label`
- [x] Decorative icons marked with `aria-hidden="true"` in DropZone

#### Dead Code Removal
- [x] Removed 15 unused files:
  - Components: NetBalanceCard, AnimatedCounter, LoadingSkeleton, LanguageSwitcher, AmountDisplay, StatBadge, FilterBar, Navbar, MotionWrapper, StaggerList, ChartCard, SectionCard
  - Lib: design-tokens.ts, storage.ts, env.ts
- [x] Zero broken imports after removal
- [x] Build verified (9 HTML files, all routes present)

#### Codebase Consistency
- [x] Card styling pattern consistent (`rounded-2xl border p-6`)
- [x] Hook usage consistent (custom hooks for complex logic, direct store for simple UI state)
- [x] Type safety verified (no `any` types except justified JSON import)
- [x] Zero lint warnings/errors
- [x] All files formatted with Prettier

### Backend Batch 1: Transaction API Integration

#### Architecture & Contracts
- [x] Removed `output: 'export'` from next.config.ts (API routes require server runtime)
- [x] Installed Zod for API validation, Vitest for testing
- [x] API contracts (`src/lib/api/contracts.ts`) — request/response types for all endpoints
- [x] Zod validation schemas (`src/lib/api/validation.ts`) — create, update, list, dashboard
- [x] Typed API client (`src/lib/api/client.ts`) — fetch wrapper with error handling

#### Server Layer
- [x] In-memory data store (`src/server/db/store.ts`) — persists across requests, resets on restart
- [x] Seed module (`src/server/db/seed.ts`) — auto-seeds from workbook.json on first request
- [x] Transaction repository (`src/server/repositories/transaction.repository.ts`) — CRUD with clean interface
- [x] Transaction service (`src/server/services/transaction.service.ts`) — validation + business logic
- [x] Dashboard service (`src/server/services/dashboard.service.ts`) — aggregation (balance, totals, cash flow)

#### API Routes
- [x] `GET /api/transactions` — list with filters (month, year, type, category, search)
- [x] `POST /api/transactions` — create with Zod validation
- [x] `PATCH /api/transactions/[id]` — partial update
- [x] `DELETE /api/transactions/[id]` — delete by ID
- [x] `GET /api/dashboard/summary` — aggregated dashboard data (balance, income, expense, savings rate, category totals, payment method totals, cash flow, recent transactions)

#### Frontend Integration
- [x] `useTransactions` hook rewritten to fetch from API (with refetch on mutations)
- [x] `useDashboardData` hook rewritten to fetch summary from API (budget status computed client-side from API data + Zustand categories)
- [x] `TransactionForm` uses API client for create/update (syncs to Zustand for dashboard widget compatibility)
- [x] `StoreProvider` seeds Zustand transactions from API on init (same IDs as server)
- [x] Optimistic delete (removes from local state + Zustand immediately, API call in background)
- [x] Zustand `setTransactions` action added for API sync

#### Testing
- [x] Vitest configured (`vitest.config.ts`) with path aliases
- [x] Validation schema tests (16 tests — all create/update/list/dashboard schemas)
- [x] Transaction service tests (13 tests — create, list, filter, update, delete)
- [x] Dashboard service tests (7 tests — summary, totals, cash flow, empty month, errors)
- [x] All 36 tests passing

#### What's Still Mocked / In Zustand (After Batch 1)
- ~~Categories, payment methods remain in Zustand~~ (moved to API in Batch 2)
- Bills, savings goals remain in Zustand (localStorage)
- ~~Dashboard widgets read from Zustand selectors~~ (refactored to props in Batch 2)
- ~~Dual-write pattern~~ (removed in Batch 2)
- ~~In-memory server store~~ (replaced by SQLite in Batch 2)

### Backend Batch 2: Full Backend Integration + SQLite

#### SQLite Persistence
- [x] Installed better-sqlite3 + @types/better-sqlite3
- [x] SQLite module (`src/server/db/sqlite.ts`) — WAL mode, schema init (8 tables)
- [x] Schema: transactions, categories, payment_methods, bills, savings_goals, settings, uploads, export_jobs
- [x] Seed module rewritten for SQLite (`src/server/db/seed.ts`) — bulk insert with transactions
- [x] Test helpers: `resetDb()`, `resetSeeded()`, `markSeeded()` for clean test isolation
- [x] Removed old in-memory store (`src/server/db/store.ts`)

#### Repositories (SQLite-backed)
- [x] Transaction repository rewritten for SQLite (LIKE prefix for month filtering)
- [x] Category repository (`src/server/repositories/category.repository.ts`) — full CRUD
- [x] Payment method repository (`src/server/repositories/payment-method.repository.ts`) — full CRUD
- [x] Settings repository (`src/server/repositories/settings.repository.ts`) — key-value store
- [x] Upload repository (`src/server/repositories/upload.repository.ts`) — metadata persistence
- [x] Export job repository (`src/server/repositories/export-job.repository.ts`) — job tracking

#### Services
- [x] Category service — listCategories, createCategory, updateCategory, deleteCategory
- [x] Payment method service — listPaymentMethods, createPaymentMethod, updatePaymentMethod, deletePaymentMethod
- [x] Settings service — getSettings, updateSettings
- [x] Upload service — listUploads, createUpload, updateUpload
- [x] Export job service — listExportJobs, createExportJob (marks completed immediately)

#### Validation Schemas (Zod)
- [x] createCategorySchema, updateCategorySchema
- [x] createPaymentMethodSchema, updatePaymentMethodSchema
- [x] updateSettingsSchema (record of strings, non-empty)
- [x] createUploadSchema, updateUploadSchema
- [x] createExportJobSchema

#### API Routes
- [x] `GET/POST /api/categories` — list (with type filter) + create
- [x] `PATCH/DELETE /api/categories/[id]` — update + delete
- [x] `GET/POST /api/payment-methods` — list + create
- [x] `PATCH/DELETE /api/payment-methods/[id]` — update + delete
- [x] `GET/PATCH /api/settings` — get all + update settings
- [x] `GET/POST /api/uploads` — list + create
- [x] `PATCH /api/uploads/[id]` — update status/extracted data
- [x] `GET/POST /api/export-jobs` — list + create

#### API Client Extensions
- [x] `api.categories` — list, create, update, delete
- [x] `api.paymentMethods` — list, create, update, delete
- [x] `api.settings` — get, update
- [x] `api.uploads` — list, create, update
- [x] `api.exportJobs` — list, create
- [x] Contract types: CategoryListResponse, PaymentMethodListResponse, SettingsResponse, UploadResponse, ExportJobResponse

#### Frontend Integration
- [x] Dashboard widgets refactored to receive data via props (CashFlowChart, CategoryBreakdown, BudgetProgress, PaymentMethods, RecentTransactions, BillsChecklist, SavingsGoals)
- [x] Dashboard page passes all data from `useDashboardData()` to widgets
- [x] Categories page rewritten to use API (fetch, create, update budget, delete)
- [x] TransactionForm fetches categories/payment methods from API instead of Zustand
- [x] StoreProvider simplified — no longer syncs transactions from API
- [x] Removed dual-write pattern from useTransactions (no more Zustand sync)

#### Testing
- [x] Existing tests migrated from old store to SQLite (`resetDb()` + `markSeeded()`)
- [x] Category service tests (13 tests — CRUD, filtering, validation, edge cases)
- [x] Payment method service tests (10 tests — CRUD, validation, defaults)
- [x] Settings service tests (6 tests — get, update, preserve, validation)
- [x] Export job service tests (7 tests — create, list, validation)
- [x] Validation tests expanded (12 new tests for new schemas)
- [x] All 84 tests passing (expanded to 243 in V.02 improvements)

#### What's Still In Zustand
- Bills and savings goals remain in Zustand (localStorage)
- UI state (month, year, theme, locale) remains in Zustand
- These will move to API in a future batch

---

## Project Structure

```
src/
  app/
    layout.tsx                # Root layout (fonts, providers, nav)
    page.tsx                  # Dashboard (bento grid)
    globals.css               # Tailwind v4 + design tokens
    api/
      transactions/
        route.ts              # GET (list) + POST (create)
        [id]/route.ts         # PATCH (update) + DELETE
      categories/
        route.ts              # GET (list) + POST (create)
        [id]/route.ts         # PATCH (update) + DELETE
      payment-methods/
        route.ts              # GET (list) + POST (create)
        [id]/route.ts         # PATCH (update) + DELETE
      settings/route.ts       # GET + PATCH
      uploads/
        route.ts              # GET (list) + POST (create)
        [id]/route.ts         # PATCH (update status)
      export-jobs/route.ts    # GET (list) + POST (create)
      dashboard/
        summary/route.ts      # GET (aggregated dashboard data)
    transactions/
      page.tsx                # Transaction list + filters
      new/page.tsx            # Add transaction (standalone)
    upload/page.tsx           # OCR receipt upload
    export/page.tsx           # Export center
    error.tsx                 # App-level error boundary
    not-found.tsx             # Custom 404 page
    settings/
      page.tsx                # General settings
      categories/page.tsx     # Category & payment method management
  server/
    db/
      sqlite.ts               # SQLite connection + schema (better-sqlite3)
      seed.ts                 # Auto-seed from workbook.json into SQLite
    repositories/
      transaction.repository.ts   # Transaction CRUD (SQLite)
      category.repository.ts      # Category CRUD (SQLite)
      payment-method.repository.ts # Payment method CRUD (SQLite)
      settings.repository.ts      # Settings key-value store (SQLite)
      upload.repository.ts        # Upload metadata (SQLite)
      export-job.repository.ts    # Export job tracking (SQLite)
    services/
      transaction.service.ts  # Transaction business logic + validation
      dashboard.service.ts    # Dashboard aggregation service
      category.service.ts     # Category CRUD service
      payment-method.service.ts # Payment method CRUD service
      settings.service.ts     # Settings service
      upload.service.ts       # Upload metadata service
      export-job.service.ts   # Export job service
  components/
    ui/                       # shadcn/ui primitives (16 components incl. alert-dialog, sonner)
    layout/                   # AppShell, Sidebar, Topbar, BottomNav, PageHeader
    dashboard/                # 8 bento widgets
    transactions/             # Table, Form, Filters, CategoryChip, TransactionSummary
    upload/                   # DropZone, OcrPreview, ProcessingOverlay, ConfidenceBar, ExtractionStatusBadge, UploadedFileCard
    export/                   # FormatCard, ScopeSelector, ExportOptions, ExportPreview, ExportActionBar
    settings/                 # SettingsSection, ImportDialog
    shared/                   # SummaryCard, EmptyState, NoResults, InlineError, Skeletons, ConfirmDialog, QuickActionButton, ProgressRing
    providers/                # StoreProvider (seeds from API + manages theme/locale)
  lib/
    api/
      contracts.ts            # API request/response types
      validation.ts           # Zod schemas for all endpoints
      client.ts               # Typed fetch wrapper (frontend API client)
    types.ts                  # TypeScript interfaces
    constants.ts              # Colors, defaults, nav items
    formatters.ts             # Currency/date formatting (IDR)
    calculations.ts           # Financial computation functions
    data-migration.ts         # workbook.json -> typed objects
    i18n.ts                   # EN/ID translations + context
    mock-data.ts              # Quick actions, empty messages, language options
    motion.ts                 # Framer Motion animation presets
    export-utils.ts           # CSV/Excel/PDF generation
    import-utils.ts           # JSON/CSV import parsing + validation
    category-suggest.ts       # OCR category auto-suggestion
    validation.ts             # Form validation schemas (bilingual)
    services.ts               # API boundary placeholders
    utils.ts                  # cn() utility (shadcn)
  hooks/
    useDashboardData.ts       # Dashboard data (fetches from API)
    useTransactions.ts        # Transactions CRUD + filters (fetches from API)
    useUpload.ts              # Upload/OCR state hook
    useExport.ts              # Export jobs hook
    useImport.ts              # Import data hook
  store/
    index.ts                  # Zustand store (persist middleware)
    selectors.ts              # Memoized computed selectors
  __tests__/
    validation.test.ts            # Zod schema tests (28 tests)
    transaction.service.test.ts   # Transaction service tests (13 tests)
    dashboard.service.test.ts     # Dashboard service tests (7 tests)
    category.service.test.ts      # Category service tests (13 tests)
    payment-method.service.test.ts # Payment method service tests (10 tests)
    settings.service.test.ts      # Settings service tests (6 tests)
    export-job.service.test.ts    # Export job service tests (7 tests)
  data/
    sample-data.ts            # Workbook migration entry point
```

## Build & Deploy

```bash
npm run dev          # http://localhost:3000
npm run build        # Production build (static pages + API routes)
npm run test         # Run vitest tests
```

Deployment: Vercel, Railway, or any Node.js host (API routes require server runtime).
Static-only GitHub Pages deployment no longer supported due to API routes.

---

## V.02 Improvements (post-launch features)

### Balance Service & Clickable Cards
- [x] `beginning_balance` column on `payment_methods` (DDL + ALTER TABLE migration, DEFAULT 0)
- [x] Balance formula: `beginning_balance + income − expense`
- [x] Saldo Awal field on payment method create form in Settings
- [x] Edit Dialog (pencil button per row) — update name, type, beginning balance
- [x] `monthlyFlow` added to balance service — net income/expense for a given month
- [x] Clickable balance cards on dashboard — click to reveal monthly flow overlay
- [x] `GET /api/payment-methods/balances?month=N&year=YYYY` — monthly flow param

### Reports
- [x] `/reports` page with monthly and annual XLSX download
- [x] `GET /api/reports/monthly?month=N&year=YYYY` — monthly report data
- [x] `GET /api/reports/annual?year=YYYY` — annual report data with YoY comparison
- [x] XLSX generator (ExcelJS) — monthly: Indonesian template format; annual: 2-sheet workbook

### Export Template Redesign

- [x] Replaced SheetJS with **ExcelJS** for all XLSX writing (reports + export pages)
- [x] Added **Chart.js** (`chart.js/auto`) for off-screen canvas chart rendering
- [x] `src/lib/chart-renderer.ts` — `renderDonutChart`, `renderCashflowChart`, `renderExpensePieChart` (all return PNG base64)
- [x] `ExportReportInput` interface in `src/lib/types.ts` — single typed input replacing old 4-argument export signatures
- [x] XLSX template: Indonesian-style layout with positioned header, summary block, 3 embedded Chart.js charts
- [x] Annual XLSX: two sheets — "Ringkasan Tahunan" (monthly breakdown) + "Detail Transaksi"
- [x] PDF template: A4 portrait, 3 embedded chart images, bills checklist (current month only)
- [x] `xlsx` package retained as explicit dependency for bulk-import XLSX reading
- [x] `ExportOptions` simplified — removed `includeSummary` toggle (groupByDate only)
- [x] `src/lib/formatters.ts` extended — `formatDateID`, `formatDatetimeID`, `MONTH_NAMES_ID`

### Export Template Redesign v2

- [x] Added `jszip@^3.10.1` as explicit dependency (already transitive via ExcelJS)
- [x] Created `src/lib/xlsx-template-builder.ts` — shared Laporan sheet builder: 20-col A–T layout, Indonesian label fixes, Deskripsi column, "✓ Lunas"/"○ Belum" bill status, optional `ringkasanSheet` field for annual reports
- [x] Created `src/lib/chart-xml-injector.ts` — JSZip OpenXML injection: donut chart (income/expense), cashflow bar chart, expense pie chart; Grafik first-tab worksheet with KPI header + helper data rows (44–46); null guards on required ZIP entries; `hasPieData` guard for zero expense categories
- [x] Rewired `exportExcel` in `export-utils.ts` to delegate to `buildXlsxWorkbook` + `injectCharts`
- [x] Rewrote `exportCSV` in `export-utils.ts`: UTF-8 BOM, scope+totals comment rows, Indonesian headers/type values, `formatDateID` dates, formatted amounts; updated call sites in `useExport.ts` and `transactions/page.tsx`
- [x] Rewrote `exportPDF` in `export-utils.ts`: dark gradient header (20-strip `#1E3A8A→#3B82F6`), full 45mm header with 3 KPI boxes (page 1), 12mm condensed header (page 2+), two-pass page numbers, income category breakdown side-by-side, Deskripsi column, bill status "Lunas"/"Belum" plain text
- [x] Rewrote `generateMonthlyReport` and `generateAnnualReport` in `report-generator.ts` to delegate to shared builder+injector — removes ~400 lines of duplicated layout code

### Load-More Transactions
- [x] `useAllTransactions` with `useInfiniteQuery` (50/page, load-more button)
- [x] `GET /api/transactions?allMonths=true&yearOnly=true` query params

### Collapsible Sidebar Navigation
- [x] Grouped nav (Overview, Finance, Tools) with animated height collapse
- [x] `useNavGroups` hook — guards against collapsing group with active route
- [x] `SidebarGroup` component — ChevronRight rotation, rail mode (icons only)

### Testing
- [x] 241 tests total (up from 84) — balance service (15), PM service (16), report service (20), bulk-import (57)

## Reference Documents

| Document | Purpose |
|----------|---------|
| [BLUEPRINT.md](./BLUEPRINT.md) | Full production blueprint (15 sections: concept, IA, nav, page specs, design system, motion, i18n, components, roadmap) |
| [WIREFRAMES.md](./WIREFRAMES.md) | Wireframe definitions, ASCII wireframes, component map, folder tree, build recommendations |
| [README.md](./README.md) | Project overview, getting started, tech stack |
| `data/workbook.json` | Source data (12 monthly sheets, cell-based format) |
| `scripts/extract_xlsx.py` | XLSX to JSON extraction pipeline |

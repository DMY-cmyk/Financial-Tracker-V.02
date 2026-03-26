# Financial Tracker V.02

🔗 **[Live Demo → financial-tracker-v-02.vercel.app](https://financial-tracker-v-02.vercel.app/)**

A modern personal finance tracking dashboard using a **Modular Bento Grid** layout. Built with Next.js 16, featuring animated widgets, interactive charts, and full transaction management. Designed for Indonesian Rupiah (IDR) budgeting with bilingual support (EN/ID).

## Concept

Card-based, widget-driven financial dashboard. Every data domain (balance, transactions, budgets, bills, savings) lives in its own self-contained tile arranged in an asymmetric bento grid. Interactions happen inline or in slide-over panels. Inspired by Mercury, Copilot Money, and Wise.

## Features

### App Shell
- [x] Collapsible sidebar navigation (desktop, 260px/72px)
- [x] Top bar with month navigation (prev/next)
- [x] Bottom navigation for mobile (5 tabs)
- [x] Full-height layout with internal content scrolling

### Dashboard
- [x] 4 summary metric cards (balance, income, expense, savings rate)
- [x] 9 bento widgets: cash flow chart, category donut, budget bars, payment methods, bills checklist, savings rings, recent transactions
- [x] Clickable balance cards — show monthly flow overlay on click
- [x] Quick Actions section (add transaction, upload receipt, export data)
- [x] Animated counter with Framer Motion spring
- [x] Responsive sectioned layout with visual hierarchy
- [x] Stagger entrance animations

### Transactions
- [x] Full CRUD (add, edit, delete)
- [x] Search, type filter (income/expense/all), category filter
- [x] Date-grouped list with category color chips
- [x] Slide-over Sheet form with live IDR formatting
- [x] TransactionSummary component (income / expense / net balance)
- [x] Empty state and no-results state with clear filters
- [x] Form validation with inline field errors (bilingual)
- [x] Delete confirmation dialog (AlertDialog)
- [x] Toast feedback (save/delete)
- [x] Mobile FAB for quick add
- [x] Framer Motion entrance animations

### Upload & OCR
- [x] Drag-and-drop receipt image upload (enhanced DropZone with drag state feedback)
- [x] Client-side OCR via Tesseract.js (lazy-loaded)
- [x] Auto-extract amount, date, description
- [x] Review and correct extracted fields before saving
- [x] Status-driven flow (idle -> processing -> extracted -> saved)
- [x] Confidence indicator bar (High/Medium/Low)
- [x] Modular components (DropZone, UploadedFileCard, ExtractionStatusBadge, ConfidenceBar, OcrPreview)

### Export
- [x] CSV and JSON export
- [x] Scope: current month or all data
- [x] Format selection (CSV, JSON, Excel, PDF)
- [x] Export options (group by date)
- [x] Transaction preview table
- [x] Excel export via ExcelJS + JSZip — Indonesian-style template with 3 **native live** Excel charts (income/expense donut, cash flow bar, expense category pie); "Grafik" tab opens first
- [x] PDF export via jsPDF — A4 portrait with dark gradient header, KPI boxes, page numbers, income/expense breakdown, Deskripsi column
- [x] Toast feedback for export success/failure
- [x] Modular components (FormatCard, ScopeSelector, ExportOptions, ExportPreview, ExportActionBar)
- [x] Custom date range
- [x] Downloadable monthly and annual XLSX reports (`/reports`)

### Export Template Redesign

The `/export` and `/reports` pages generate publication-quality XLSX and PDF documents with embedded charts, replacing the original flat SheetJS workbook.

**XLSX output** (ExcelJS):
- Indonesian-style template — positioned header, summary block, transaction table
- 3 embedded charts: income/expense donut, monthly cash flow bar, expense category pie
- Charts rendered off-screen via Chart.js canvas → PNG base64 → workbook cells
- Annual report: two sheets — "Ringkasan Tahunan" + "Detail Transaksi"

**PDF output** (jsPDF):
- A4 portrait with the same 3 charts embedded as images
- jsPDF-autotable for transaction rows with alternating row colors
- Bills checklist section (current month scope only)

**Architecture highlights:**
- `src/lib/chart-renderer.ts` — three async functions returning PNG base64 (`renderDonutChart`, `renderCashflowChart`, `renderExpensePieChart`)
- `ExportReportInput` typed interface — single input for both Excel and PDF generators
- `xlsx` package kept for bulk-import reading; ExcelJS used exclusively for writing

<!-- Screenshots: capture from /export and /reports after deployment -->
![XLSX export template](docs/screenshots/export-xlsx-template.png)
![PDF export template](docs/screenshots/export-pdf-template.png)

### Export Template Redesign v2

Native live Excel charts, polished PDF, and Windows-friendly CSV — replacing all static PNG embeds.

**XLSX output** (ExcelJS + JSZip OpenXML):
- Native live Excel charts: donut (income vs expense), cashflow bar, expense category pie — injected via JSZip + DrawingML; charts update when data changes, no static images
- "Grafik" tab opens first when the file loads — 2×1 chart grid + KPI header rows with formulas referencing the Laporan data sheet
- Shared layout builder (`xlsx-template-builder.ts`) — single source of truth for both `/export` and `/reports`; eliminates ~400 lines of duplicated layout code
- Fixes: "Laporan Bulanan"/"Laporan Tahunan" titles, "Metode" column header, "Saldo (periode ini)" section label, "✓ Lunas"/"○ Belum" bill status text, new Deskripsi column in transaction tables

**PDF output** (jsPDF):
- Dark blue gradient header (20-strip simulation `#1E3A8A → #3B82F6`): 45mm full header with 3 KPI boxes on page 1; 12mm condensed header on page 2+
- Two-pass page numbering: "Halaman X / N" footer on every page
- "Rekap Pemasukan" income category table rendered side-by-side with "Rekap Pengeluaran"
- Deskripsi column added to both income and expense transaction tables
- Bill status as "Lunas" (green) / "Belum" (red) plain text (replaces broken Unicode checkboxes)

**CSV output:**
- UTF-8 BOM prepended — Indonesian characters render correctly in Excel on Windows
- Two quoted comment header rows: scope+date and totals summary
- Indonesian column names: Tanggal, Deskripsi, Kategori, Tipe, Jumlah, Metode Pembayaran, Catatan
- Formatted dates ("1 Maret 2026") and amounts ("Rp 5.200.000")

**Architecture highlights:**
- `src/lib/xlsx-template-builder.ts` — shared Laporan sheet builder; chart contract cells H10/H12/B13/D18:D{n}/E18:E{n} locked for chart XML references
- `src/lib/chart-xml-injector.ts` — JSZip post-processor: injects 3 DrawingML charts + Grafik worksheet into the XLSX buffer

### Settings
- [x] Theme: Light / Dark / System
- [x] Language: English / Bahasa Indonesia
- [x] Category & payment method management (CRUD, color picker, budget)
- [x] Beginning Balance (Saldo Awal) per payment method — real-world account starting balance
- [x] Edit dialog for payment methods (name, type, beginning balance)
- [x] Data management section (export, import, clear/reset)
- [x] Import data from JSON/CSV with validation and preview
- [x] SaaS-style sectioned layout with SettingsSection component
- [x] Delete confirmation dialog (replaces browser confirm)
- [x] Toast feedback for data clear

### Design System
- [x] Custom color palette (Blue primary, Emerald income, Red expense, Amber warning)
- [x] Plus Jakarta Sans (UI) + JetBrains Mono (currency)
- [x] Light and dark mode with CSS variable theming
- [x] Consistent card styles (rounded-2xl, border, shadow hierarchy)
- [x] Motion presets library (fadeIn, stagger, spring, panel variants, ease curves)
- [x] Motion presets (fadeIn, stagger, spring, panel variants, ease curves)
- [x] i18n dictionary with ~140+ keys (EN/ID bilingual)
- [x] Skeleton loading states (page, card, chart, list, transaction row)
- [x] Empty/NoResults/InlineError shared state components
- [x] ConfirmDialog for destructive actions
- [x] Sonner toast system for feedback
- [x] Form validation with bilingual error messages
- [x] Custom hooks (useDashboardData, useTransactions, useUpload, useExport, useImport)
- [x] API boundary placeholders (services.ts)
- [x] Category auto-suggestion for OCR (keyword matching, EN/ID)
- [x] App-level error boundary and custom 404 page
- [x] Skip link for keyboard navigation
- [x] ARIA landmarks, aria-current, aria-label on all interactive elements
- [x] Keyboard-accessible drop zones and action buttons
- [x] Enhanced metadata (title template, OG tags)

## Tech Stack

| | |
|---|---|
| **Framework** | Next.js 16 (App Router, server-rendered) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS v4 + shadcn/ui |
| **State** | Zustand (UI only: theme, locale, month/year) — all data via REST API |
| **Database** | Neon Postgres (`@neondatabase/serverless`) in production, better-sqlite3 in dev/tests |
| **Validation** | Zod (API request/response schemas) |
| **Testing** | Vitest (241 tests: validation, all services, balance, reports) |
| **Charts** | Recharts (area, pie) + Chart.js (off-screen PNG rendering for export) |
| **Animations** | Framer Motion |
| **OCR** | Tesseract.js |
| **Export** | ExcelJS (XLSX write) · JSZip (OpenXML chart injection) · Chart.js (PDF chart rendering) · xlsx (bulk-import read) · jsPDF (PDF) · native CSV/JSON |
| **Deploy** | Vercel (auto-deploys from GitHub) |
| **Toasts** | Sonner |
| **Fonts** | Plus Jakarta Sans + JetBrains Mono |

## Getting Started

```bash
npm install
cp .env.example .env.local   # Configure DATABASE_URL for Neon Postgres (optional)
npm run dev                  # http://localhost:3000 (uses SQLite if no DATABASE_URL)
npm run build                # Production build
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Production | Neon Postgres connection string. Leave empty to use SQLite (dev/tests). |
| `NEXT_PUBLIC_BASE_PATH` | No | Base path for deployment |
| `NEXT_PUBLIC_APP_TITLE` | No | Override app display title |

### Quality Scripts

```bash
npm run test         # Run tests (Vitest, 241 tests)
npm run test:watch   # Run tests in watch mode
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint
npm run format       # Prettier auto-format
npm run format:check # Verify formatting
npm run validate     # typecheck + lint + build
npm run preflight    # Full CI-equivalent check
```

On first load, the app seeds sample data from `data/workbook.json` (12 months of transactions, bills, and savings goals).

## Project Structure

```
src/
  app/
    page.tsx                  # Dashboard (bento grid)
    api/                      # REST API routes (all data is API-backed)
      transactions/           # GET (list) + POST (create), [id] PATCH/DELETE
      categories/             # GET (list) + POST, [id] PATCH/DELETE
      payment-methods/        # GET (list) + POST, [id] PATCH/DELETE
      settings/               # GET + PATCH
      uploads/                # GET (list) + POST, [id] PATCH
      export-jobs/            # GET (list) + POST
      dashboard/summary/      # GET (aggregated summary)
    transactions/page.tsx     # Transaction list + filters
    transactions/new/page.tsx # Add transaction form
    bills/page.tsx            # Bills management
    savings/page.tsx          # Savings goals
    upload/page.tsx           # OCR receipt upload
    export/page.tsx           # Multi-format export
    settings/page.tsx         # Theme, language, data
    settings/categories/      # Category & payment method CRUD
  server/
    db/                       # Database connection (Neon Postgres or SQLite) + seed
    repositories/             # CRUD repositories (transaction, category, payment-method, settings, upload, export-job)
    services/                 # Business logic (transaction, dashboard, category, payment-method, settings, upload, export-job)
  components/
    dashboard/                # 8 bento widgets
    transactions/             # Table, form, filters, category chip
    upload/                   # DropZone, OcrPreview, ProcessingOverlay, ConfidenceBar
    export/                   # FormatCard, ScopeSelector, ExportOptions, ExportPreview, ExportActionBar
    settings/                 # SettingsSection, ImportDialog
    layout/                   # AppShell, Sidebar, Topbar, BottomNav, PageHeader
    shared/                   # SummaryCard, EmptyState, NoResults, Skeletons, ConfirmDialog
    providers/                # StoreProvider (API sync + theme + locale)
    ui/                       # 16 shadcn/ui primitives
  lib/
    api/                      # Contracts, validation (Zod), API client
    ...                       # Types, formatters, calculations, i18n, validation, motion, export-utils
  hooks/                      # useDashboardData, useTransactions, useUpload, useExport, useImport
  store/                      # Zustand store (UI state only) + memoized selectors
  __tests__/                  # Vitest tests (84 tests: validation, transaction, dashboard, category, payment-method, settings, export-job)
```

## Documentation

| Document | Description |
|----------|-------------|
| [BLUEPRINT.md](./BLUEPRINT.md) | Full production blueprint - concept rationale, information architecture, navigation, detailed page specs, design system, motion system, bilingual UX, component architecture, folder structure, implementation roadmap, dashboard layout specification |
| [WIREFRAMES.md](./WIREFRAMES.md) | Wireframe definitions, ASCII wireframes, component map (37 components), folder tree, build recommendations |
| [Plan.md](./Plan.md) | Implementation checklist with phase-by-phase status tracking |
| [CLAUDE.md](./CLAUDE.md) | Project instructions for Claude Code — product goals, UX constraints, coding conventions, anti-patterns |
| [docs/RELEASE.md](./docs/RELEASE.md) | Release guide — deployment, environment variables, QA checklists |
| [docs/QA-CHECKLIST.md](./docs/QA-CHECKLIST.md) | QA checklist — responsive, dark mode, cross-browser, smoke tests |

## Data Pipeline

```
Financial Tracker.xlsx  -->  extract_xlsx.py  -->  workbook.json  -->  seed script  -->  Database
```

```bash
pip install openpyxl
python scripts/extract_xlsx.py
```

## CI/CD

### PR Validation (`.github/workflows/ci.yml`)
Runs on pushes to `main` and PRs to `main`: `npm ci` → typecheck → lint → format check → test → build

### Deployment
Deploy via **Vercel** — connects to the GitHub repo and auto-deploys on push. Set `DATABASE_URL` in Vercel environment variables pointing to your Neon Postgres instance.

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production (deployed to Vercel) |

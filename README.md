# Financial Tracker V.02

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
- [x] Export options (include summary, group by date)
- [x] Transaction preview table
- [x] Excel export via SheetJS (formatted workbook with summary sheet)
- [x] PDF export via jsPDF (styled report with summary and table)
- [x] Toast feedback for export success/failure
- [x] Modular components (FormatCard, ScopeSelector, ExportOptions, ExportPreview, ExportActionBar)
- [ ] Custom date range

### Settings
- [x] Theme: Light / Dark / System
- [x] Language: English / Bahasa Indonesia
- [x] Category & payment method management (CRUD, color picker, budget)
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
| **Framework** | Next.js 16 (App Router, static export) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS v4 + shadcn/ui |
| **State** | Zustand (localStorage persistence) |
| **Charts** | Recharts (area, pie) |
| **Animations** | Framer Motion |
| **OCR** | Tesseract.js |
| **Export** | SheetJS (xlsx), jsPDF (pdf), native CSV/JSON |
| **Toasts** | Sonner |
| **Fonts** | Plus Jakarta Sans + JetBrains Mono |

## Getting Started

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # Static export to out/
```

### Quality Scripts

```bash
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
  app/                        # 7 page routes
    page.tsx                  #   Dashboard (bento grid)
    transactions/page.tsx     #   Transaction list + filters
    transactions/new/page.tsx #   Add transaction form
    upload/page.tsx           #   OCR receipt upload
    export/page.tsx           #   CSV/JSON export
    settings/page.tsx         #   Theme, language, data
    settings/categories/      #   Category & payment method CRUD
  components/
    dashboard/                # 8 bento widgets
    transactions/             # Table, form, filters, category chip
    upload/                   # DropZone, OcrPreview, ProcessingOverlay, ConfidenceBar, ExtractionStatusBadge, UploadedFileCard
    export/                   # FormatCard, ScopeSelector, ExportOptions, ExportPreview, ExportActionBar
    settings/                 # SettingsSection, ImportDialog
    layout/                   # AppShell, Sidebar, Topbar, BottomNav, PageHeader
    shared/                   # SummaryCard, EmptyState, NoResults, InlineError, Skeletons, ConfirmDialog, QuickActionButton, ProgressRing
    providers/                # StoreProvider (state + theme + locale)
    ui/                       # 16 shadcn/ui primitives (incl. alert-dialog, sonner)
  hooks/                      # useDashboardData, useTransactions, useUpload, useExport, useImport
  lib/                        # Types, formatters, calculations, i18n, validation, motion, services, export-utils, import-utils, category-suggest, mock-data
  store/                      # Zustand store + memoized selectors
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
Financial Tracker.xlsx  -->  extract_xlsx.py  -->  workbook.json  -->  data-migration.ts  -->  Zustand Store
```

```bash
pip install openpyxl
python scripts/extract_xlsx.py
```

## CI/CD

### PR Validation (`.github/workflows/ci.yml`)
Runs on pushes to `redesign` and PRs: `npm ci` -> typecheck -> lint -> format check -> build -> verify export

### Deployment (`.github/workflows/deploy-pages.yml`)
Runs on pushes to `main`: `npm ci` -> typecheck -> lint -> build -> Deploy `out/` to GitHub Pages

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production (original spreadsheet clone preserved) |
| `redesign` | Modular Bento Grid redesign (active development) |

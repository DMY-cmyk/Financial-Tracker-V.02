# Financial Tracker V.02

A modern personal finance tracking dashboard using a **Modular Bento Grid** layout. Built with Next.js 16, featuring animated widgets, interactive charts, and full transaction management. Designed for Indonesian Rupiah (IDR) budgeting with bilingual support (EN/ID).

## Concept

Card-based, widget-driven financial dashboard. Every data domain (balance, transactions, budgets, bills, savings) lives in its own self-contained tile arranged in an asymmetric bento grid. Interactions happen inline or in slide-over panels. Inspired by Mercury, Copilot Money, and Wise.

## Features

### Dashboard
- [x] 9-widget Bento Grid: balance hero, cash flow chart, category donut, budget bars, payment methods, bills checklist, savings rings, recent transactions
- [x] Animated counter with Framer Motion spring for balance
- [x] Month selector (4x3 pill grid with year navigation)
- [x] Responsive 3/2/1 column layout
- [x] Stagger entrance animations

### Transactions
- [x] Full CRUD (add, edit, delete)
- [x] Search, type filter (income/expense/all), category filter
- [x] Date-grouped list with category color chips
- [x] Slide-over Sheet form with live IDR formatting
- [x] Summary strip (income / expense / net balance)

### Upload & OCR
- [x] Drag-and-drop receipt image upload
- [x] Client-side OCR via Tesseract.js (lazy-loaded)
- [x] Auto-extract amount, date, description
- [x] Review and correct extracted fields before saving

### Export
- [x] CSV and JSON export
- [x] Scope: current month or all data
- [ ] Excel (.xlsx) export
- [ ] PDF export
- [ ] Custom date range

### Settings
- [x] Theme: Light / Dark / System
- [x] Language: English / Bahasa Indonesia
- [x] Category & payment method management (CRUD, color picker, budget)
- [x] Data clear/reset

### Design System
- [x] Custom color palette (Blue primary, Emerald income, Red expense, Amber warning)
- [x] Plus Jakarta Sans (UI) + JetBrains Mono (currency)
- [x] Light and dark mode with CSS variable theming
- [x] Consistent card styles (rounded-2xl, border, shadow hierarchy)

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
| **Fonts** | Plus Jakarta Sans + JetBrains Mono |

## Getting Started

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # Static export to out/
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
    dashboard/                # 9 bento widgets
    transactions/             # Table, form, filters, category chip
    upload/                   # DropZone, OcrPreview, ProcessingOverlay, ConfidenceBar
    export/                   # FormatCard, ScopeSelector, ExportOptions, ExportPreview
    layout/                   # Navbar, BottomNav, PageHeader
    shared/                   # AnimatedCounter, ProgressRing, AmountDisplay, SummaryCard, ChartCard
    providers/                # StoreProvider (state + theme + locale)
    ui/                       # 14 shadcn/ui primitives
  lib/                        # Types, formatters, calculations, i18n, migration, design-tokens
  store/                      # Zustand store + memoized selectors
```

## Documentation

| Document | Description |
|----------|-------------|
| [BLUEPRINT.md](./BLUEPRINT.md) | Full production blueprint - concept rationale, information architecture, navigation, detailed page specs, design system, motion system, bilingual UX, component architecture, folder structure, implementation roadmap, dashboard layout specification |
| [WIREFRAMES.md](./WIREFRAMES.md) | Wireframe definitions, ASCII wireframes, component map (37 components), folder tree, build recommendations |
| [Plan.md](./Plan.md) | Implementation checklist with phase-by-phase status tracking |

## Data Pipeline

```
Financial Tracker.xlsx  -->  extract_xlsx.py  -->  workbook.json  -->  data-migration.ts  -->  Zustand Store
```

```bash
pip install openpyxl
python scripts/extract_xlsx.py
```

## Deployment

GitHub Actions (`.github/workflows/deploy-pages.yml`):
`npm ci` -> `npm run build` -> Deploy `out/` to GitHub Pages

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production (original spreadsheet clone preserved) |
| `redesign` | Modular Bento Grid redesign (active development) |

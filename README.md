# Financial Tracker V.02

A modern personal finance tracking dashboard built with Next.js, featuring a **Bento Grid** layout with animated widgets, interactive charts, and full transaction management. Designed for Indonesian Rupiah (IDR) budgeting with bilingual support (EN/ID).

## Features

- **Bento Grid Dashboard** - 9 interactive widgets: balance hero, cash flow chart, category donut, budget progress bars, payment method summary, bills checklist, savings goals, recent transactions
- **Animated Counters** - Spring-animated balance numbers via Framer Motion
- **Transaction Management** - Full CRUD with search, filters (type/category), date-grouped list, slide-over edit form
- **Live IDR Formatting** - Currency inputs format as you type (e.g., 8.500.000)
- **Budget Tracking** - Color-coded progress bars (green/amber/red) per expense category
- **Interactive Charts** - Recharts area chart (cash flow) + donut chart (category breakdown)
- **Bills Checklist** - Toggle paid/unpaid status with checkbox
- **Savings Goals** - SVG progress ring indicators with percentage
- **OCR Receipt Upload** - Client-side text extraction via Tesseract.js
- **Export** - Download transactions as CSV or JSON (current month or all data)
- **Dark Mode** - Light / Dark / System theme with class-based toggle
- **Bilingual** - English and Bahasa Indonesia translations
- **Responsive** - Desktop top nav + mobile bottom nav, 3/2/1 column grid
- **Offline-Ready** - All data persisted in localStorage via Zustand

## Tech Stack

| | |
|---|---|
| **Framework** | Next.js 16 (App Router, static export) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS v4 + shadcn/ui |
| **State** | Zustand (localStorage persistence) |
| **Charts** | Recharts |
| **Animations** | Framer Motion |
| **OCR** | Tesseract.js |
| **Fonts** | Plus Jakarta Sans + JetBrains Mono |

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
# Open http://localhost:3000

# Build for production (static export)
npm run build
# Output in out/ directory
```

On first load, the app automatically seeds data from `data/workbook.json` (12 months of sample transactions, bills, and savings goals).

## Project Structure

```
src/
  app/                        # Next.js pages (7 routes)
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
    layout/                   # Navbar, BottomNav, PageHeader
    shared/                   # AmountDisplay, AnimatedCounter, ProgressRing
    providers/                # StoreProvider (state + theme + locale)
    ui/                       # 14 shadcn/ui primitives
  lib/                        # Types, formatters, calculations, i18n, migration
  store/                      # Zustand store + memoized selectors
data/
  workbook.json               # Source spreadsheet data (12 months)
scripts/
  extract_xlsx.py             # XLSX to JSON extraction (Python/openpyxl)
```

## Data Pipeline

```
Financial Tracker.xlsx  -->  scripts/extract_xlsx.py  -->  data/workbook.json  -->  data-migration.ts  -->  Zustand Store
```

To regenerate data from a new spreadsheet:

```bash
pip install openpyxl
python scripts/extract_xlsx.py
```

## Deployment

Pushes to `main` trigger GitHub Pages deployment via GitHub Actions:

1. `npm ci` -> `npm run build` -> Upload `out/` -> Deploy

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production (original spreadsheet clone preserved) |
| `redesign` | Complete React/Next.js redesign (this version) |

## Screenshots

The dashboard features a modular bento grid with:
- Hero balance card with animated counter and income/expense chips
- Monthly selector with year navigation
- Area chart showing daily income vs expense cash flow
- Donut chart with category breakdown percentages
- Budget progress bars color-coded by status
- Interactive bills checklist and savings goal rings

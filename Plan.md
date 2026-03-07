# Financial Tracker V.02 - Implementation Plan

## Overview

A modern, premium financial tracking dashboard built with React. Replaces the original Google Sheets-style spreadsheet clone with a **Modular Bento Grid** layout featuring animated widgets, interactive charts, and a clean card-based design inspired by Copilot Money, Mercury, and Wise.

## Architecture

```
data/workbook.json  -->  data-migration.ts  -->  Zustand Store  -->  React Dashboard
                                                      |
                                                 localStorage
```

1. **Data migration**: TypeScript module parses the cell-based workbook JSON and transforms it into typed `Transaction[]`, `Category[]`, `Bill[]`, and `SavingsGoal[]` objects
2. **State management**: Zustand store with localStorage persistence provides reactive data to all components
3. **Frontend**: Next.js 16 static export with Tailwind v4, shadcn/ui, Recharts, and Framer Motion

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, static export) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui (base-nova) |
| State | Zustand with localStorage persistence |
| Charts | Recharts (area, pie) |
| Animations | Framer Motion (spring counters, stagger) |
| Fonts | Plus Jakarta Sans + JetBrains Mono |
| OCR | Tesseract.js (client-side) |
| Hosting | GitHub Pages (static `out/` directory) |

## Design System

### Color Palette
```
Primary:        #2563EB (Blue 600)     - Actions, active nav, links
Success:        #059669 (Emerald 600)  - Income, positive balance, paid
Warning:        #D97706 (Amber 600)    - Approaching budget limit
Danger:         #DC2626 (Red 600)      - Expenses, over budget, overdue

Category Colors:
  Food: #F59E0B    Transport: #3B82F6    Utilities: #8B5CF6
  Entertainment: #EC4899    Salary: #10B981    Freelance: #06B6D4

Dark Mode: Slate 800-900 surfaces, Slate 100 text, same accent colors
```

### Typography
```
Primary:  "Plus Jakarta Sans", system-ui, sans-serif
Mono:     "JetBrains Mono", monospace (for currency amounts)
```

## Screen Architecture (7 Pages)

### 1. Dashboard (`/`) - Bento Widget Grid
- [x] **Net Balance Hero** (2-col): Large animated balance, income/expense chips
- [x] **Month Selector** (1-col): 12-month pill grid with year navigation
- [x] **Cash Flow Chart** (2-col): Recharts area chart, income vs expense by date
- [x] **Category Breakdown** (1-col): Donut chart with percentage legend
- [x] **Budget Progress** (2-col): Color-coded progress bars per category
- [x] **Payment Methods** (1-col): Horizontal bar summary
- [x] **Bills Checklist** (1-col): Interactive checkboxes with amount/due date
- [x] **Savings Goals** (1-col): SVG progress ring indicators
- [x] **Recent Transactions** (1-col): Last 5 transactions with "View all" link
- [x] Responsive 3/2/1 column bento grid layout
- [x] Framer Motion stagger entrance animations

### 2. Transactions (`/transactions`) - Full List with Filters
- [x] Filter bar: search, income/expense toggle, category select
- [x] Summary strip: total income, total expenses, net balance
- [x] Date-grouped transaction list with category chips
- [x] Edit/delete inline action buttons (hover reveal)
- [x] Add button + slide-over Sheet panel with full form

### 3. Add/Edit Transaction (`/transactions/new` + Sheet panel)
- [x] Income/Expense type toggle
- [x] Amount input with live IDR formatting
- [x] Date picker, description, category select, payment method select, notes
- [x] Save/Cancel actions

### 4. Categories & Sources (`/settings/categories`)
- [x] Two-column layout: expense categories + income sources
- [x] Color swatches, names, inline budget editing
- [x] Add/delete categories
- [x] Payment methods management section

### 5. Upload & OCR (`/upload`)
- [x] Drag-and-drop zone + file input
- [x] Image preview display
- [x] Tesseract.js client-side processing (lazy-loaded)
- [x] Extracted fields review form (amount, date, description, category)
- [x] Confirm & Save creates transaction

### 6. Export (`/export`)
- [x] Format cards: CSV, JSON
- [x] Scope: current month / all data
- [x] Direct browser download

### 7. Settings (`/settings`)
- [x] Theme selector: Light / Dark / System (card-based)
- [x] Language toggle: English / Bahasa Indonesia
- [x] Link to category management
- [x] Data clear/reset

## Project Structure

```
src/
  app/
    layout.tsx                # Root layout (nav, providers, fonts)
    page.tsx                  # Dashboard (bento grid)
    globals.css               # Tailwind v4 + design tokens
    transactions/
      page.tsx                # Transaction list
      new/page.tsx            # Add transaction form
    upload/page.tsx           # OCR upload
    export/page.tsx           # Export
    settings/
      page.tsx                # General settings
      categories/page.tsx     # Category management
  components/
    ui/                       # 14 shadcn/ui primitives
    layout/                   # Navbar, BottomNav, PageHeader
    dashboard/                # 9 bento widgets
    transactions/             # Table, Form, Filters, CategoryChip
    shared/                   # AmountDisplay, AnimatedCounter, ProgressRing, etc.
    providers/                # StoreProvider (Zustand + theme + locale)
  lib/
    types.ts                  # TypeScript interfaces
    constants.ts              # Colors, defaults, nav items
    formatters.ts             # Currency/date formatting (IDR)
    calculations.ts           # Financial computation logic
    storage.ts                # localStorage helpers
    data-migration.ts         # workbook.json -> typed objects
    i18n.ts                   # EN/ID translations
  store/
    index.ts                  # Zustand store (persist middleware)
    selectors.ts              # Memoized computed selectors
  data/
    sample-data.ts            # Workbook migration entry point
data/
  workbook.json               # Source data (12 monthly sheets)
```

## State Management

### Zustand Store
```typescript
Transaction { id, date, description, category, type, amount, paymentMethod, notes }
Category { id, name, type, color, icon, budget }
PaymentMethod { id, name, icon, type }
Bill { id, name, amount, dueDate, isPaid, month, year }
SavingsGoal { id, name, targetAmount, savedAmount, color }
UIState { selectedMonth, selectedYear, theme, locale }
```

### Memoized Selectors
- `useMonthlyTransactions()` - Filter by selected month/year
- `useMonthlyIncome()` / `useMonthlyExpense()` / `useMonthlyBalance()`
- `useCategoryTotals()` / `usePaymentMethodTotals()`
- `useBudgetStatus()` - Budget vs actual with percentage
- `useCashFlow()` - Daily income/expense for chart
- `useMonthlyBills()` / `useMonthlyBillsSummary()`
- `useRecentTransactions(n)` - Last n sorted by date

## Build & Deploy

```bash
npm run dev          # Local dev server (http://localhost:3000)
npm run build        # Static export to out/
```

GitHub Actions workflow (`.github/workflows/deploy-pages.yml`):
1. Checkout -> Setup Node 20 -> `npm ci` -> `npm run build`
2. Upload `out/` directory -> Deploy to GitHub Pages

## Migration from V.01

The original spreadsheet clone (vanilla HTML/CSS/JS) remains on the `main` branch as reference. The redesign lives on the `redesign` branch. Key files preserved:
- `data/workbook.json` - Source data used by both versions
- `scripts/extract_xlsx.py` - Data pipeline for future XLSX imports
- `index.html`, `script.js`, `styles.css` - Original app (main branch only)

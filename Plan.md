# Financial Tracker V.02 - Implementation Plan

## Overview

A modern, premium financial tracking dashboard using a **Modular Bento Grid** layout. Every data domain (balance, transactions, budgets, bills, savings) lives in its own self-contained card arranged in an asymmetric grid. Built with Next.js 16, Tailwind CSS v4, shadcn/ui, Zustand, Recharts, and Framer Motion. See [BLUEPRINT.md](./BLUEPRINT.md) for full production specifications.

## Architecture

```
data/workbook.json  -->  data-migration.ts  -->  Zustand Store  -->  React Dashboard
                                                      |
                                                 localStorage
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, static export) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui (base-nova) |
| State | Zustand with localStorage persistence |
| Charts | Recharts (area, pie, bars) |
| Animations | Framer Motion (spring counters, stagger, transitions) |
| Fonts | Plus Jakarta Sans + JetBrains Mono |
| OCR | Tesseract.js (client-side, lazy-loaded) |
| Export | CSV (native) + xlsx (SheetJS) + PDF (jspdf) |
| Hosting | GitHub Pages (static `out/` directory) |

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
- [ ] Decorative background blur circles on hero card
- [ ] Chart clip-path wipe entrance animation

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
- [ ] Payment method filter in filter bar
- [ ] Description autocomplete from previous entries
- [ ] AnimatePresence for row add/remove transitions

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
- [ ] Category auto-suggestion from merchant text matching
- [ ] Upload history list
- [ ] Progress percentage display during OCR

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
- [ ] Custom date range picker (start/end)

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
- [x] Data management section (export link, import placeholder, clear)
- [x] Expanded i18n coverage (~80+ translation keys covering all pages)
- [ ] Category icon selection
- [ ] Drag-to-reorder categories
- [ ] Quick language switcher in sidebar

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

### Phase 7: Remaining Polish

- [ ] Error boundaries for each page
- [ ] Meta tags, OG tags, favicon
- [ ] Performance audit (lazy-load heavy pages, tree-shake Recharts)
- [ ] Responsive breakpoint testing (1440px, 1024px, 768px, 375px)
- [ ] Cross-browser testing
- [ ] Verify `next export` static output correctness
- [ ] Final dark mode audit (all pages, all states)

---

## Project Structure

```
src/
  app/
    layout.tsx                # Root layout (fonts, providers, nav)
    page.tsx                  # Dashboard (bento grid)
    globals.css               # Tailwind v4 + design tokens
    transactions/
      page.tsx                # Transaction list + filters
      new/page.tsx            # Add transaction (standalone)
    upload/page.tsx           # OCR receipt upload
    export/page.tsx           # Export center
    settings/
      page.tsx                # General settings
      categories/page.tsx     # Category & payment method management
  components/
    ui/                       # shadcn/ui primitives (16 components incl. alert-dialog, sonner)
    layout/                   # AppShell, Sidebar, Topbar, BottomNav, Navbar, PageHeader
    dashboard/                # 9 bento widgets
    transactions/             # Table, Form, Filters, CategoryChip, TransactionSummary
    upload/                   # DropZone, OcrPreview, ProcessingOverlay, ConfidenceBar, ExtractionStatusBadge, UploadedFileCard
    export/                   # FormatCard, ScopeSelector, ExportOptions, ExportPreview, ExportActionBar
    settings/                 # SettingsSection
    shared/                   # SummaryCard, EmptyState, NoResults, InlineError, Skeletons, ConfirmDialog, StaggerList, MotionWrapper, LanguageSwitcher, ChartCard, SectionCard, StatBadge, QuickActionButton, FilterBar, AnimatedCounter, ProgressRing, AmountDisplay
    providers/                # StoreProvider
  lib/
    types.ts                  # TypeScript interfaces
    constants.ts              # Colors, defaults, nav items
    formatters.ts             # Currency/date formatting (IDR)
    calculations.ts           # Financial computation functions
    storage.ts                # localStorage helpers
    data-migration.ts         # workbook.json -> typed objects
    i18n.ts                   # EN/ID translations + context
    design-tokens.ts          # Design token constants (colors, motion, typography)
    mock-data.ts              # Quick actions, empty messages, language options, export formats, upload constants
    motion.ts                 # Framer Motion animation presets (fadeIn, stagger, spring, ease)
    export-utils.ts           # CSV/Excel/PDF generation
    validation.ts             # Form validation schemas (bilingual)
    services.ts               # API boundary placeholders
    utils.ts                  # cn() utility (shadcn)
  hooks/
    useDashboardData.ts       # Dashboard data hook
    useTransactions.ts        # Transactions CRUD + filters hook
    useUpload.ts              # Upload/OCR state hook
    useExport.ts              # Export jobs hook
  store/
    index.ts                  # Zustand store (persist middleware)
    selectors.ts              # Memoized computed selectors
  data/
    sample-data.ts            # Workbook migration entry point
```

## Build & Deploy

```bash
npm run dev          # http://localhost:3000
npm run build        # Static export to out/
```

GitHub Actions: Checkout -> Node 20 -> `npm ci` -> `npm run build` -> Deploy `out/` to GitHub Pages

## Reference Documents

| Document | Purpose |
|----------|---------|
| [BLUEPRINT.md](./BLUEPRINT.md) | Full production blueprint (15 sections: concept, IA, nav, page specs, design system, motion, i18n, components, roadmap) |
| [WIREFRAMES.md](./WIREFRAMES.md) | Wireframe definitions, ASCII wireframes, component map, folder tree, build recommendations |
| [README.md](./README.md) | Project overview, getting started, tech stack |
| `data/workbook.json` | Source data (12 monthly sheets, cell-based format) |
| `scripts/extract_xlsx.py` | XLSX to JSON extraction pipeline |

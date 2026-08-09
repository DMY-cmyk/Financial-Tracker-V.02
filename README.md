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
- [x] Net Worth KPI widget — current net worth + month-over-month delta (green/red)
- [x] Clickable balance cards — show monthly flow overlay on click
- [x] Quick Actions section (add transaction, upload receipt, export data)
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
- [x] Load-more pagination (50/page, `useAllTransactions` with `useInfiniteQuery`)

### Advanced Transaction Search
- [x] `TransactionFilterSheet` slide-over panel — amount range, multi-category, date range, notes toggle
- [x] Filter presets — save/apply/delete up to 5 named presets (localStorage persistence)
- [x] Filters badge button on the transaction toolbar with active-filter count indicator
- [x] Extended API: `amountMin`, `amountMax`, `categories` (multi), `dateFrom`, `dateTo`, `includeNotes` query params
- [x] Cross-field validation: `amountMin ≤ amountMax`, `dateFrom`/`dateTo` must be paired
- [x] Date range scope overrides month/year selector when active
- [x] Bilingual filter labels and error messages (EN/ID)

### Upload & OCR
- [x] Drag-and-drop receipt image upload (enhanced DropZone with drag state feedback)
- [x] Client-side OCR via Tesseract.js (lazy-loaded)
- [x] Auto-extract amount, date, description
- [x] Review and correct extracted fields before saving
- [x] Status-driven flow (idle -> processing -> extracted -> saved)
- [x] Confidence indicator bar (High/Medium/Low)
- [x] Upload history list with per-row delete (`DELETE /api/uploads/[id]`, ConfirmDialog + toast)
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

### Net Worth Tracker

- [x] `/net-worth` page accessible from Finance group in sidebar navigation
- [x] **Liabilities CRUD** — add/edit/delete named liabilities (loans, credit cards, other) with amount and category badge
- [x] **Net Worth Summary Card** — gradient KPI card showing total assets, total liabilities, and current net worth
- [x] **Month-over-Month Card** — amount and % change vs prior snapshot; shows `—` when fewer than 2 snapshots exist
- [x] **Assets breakdown** — read-only list of payment method balances and savings goals with subtotals
- [x] **12-month AreaChart** — `NetWorthTrendChart` with custom tooltip showing per-month breakdown (payment methods, savings, liabilities)
- [x] **Snapshot system** — auto-records on first monthly page visit; manual "Re-record" button overwrites mid-month
- [x] `snapshot_data` JSON column stores asset/liability breakdown at snapshot time for historical tooltips
- [x] Undo toast on liability delete (consistent with savings goals pattern)
- [x] ConfirmDialog before delete (CLAUDE.md requirement)
- [x] Two new DB tables: `liabilities` + `net_worth_snapshots` (upsert via `ON CONFLICT(month, year)`)
- [x] API: `GET/POST /api/liabilities`, `PATCH/DELETE /api/liabilities/[id]`, `GET /api/net-worth`, `POST /api/net-worth/snapshot`
- [x] Bilingual labels (EN/ID) for all net worth strings

### Recurring Transaction Auto-Generate

- [x] **Vercel Cron Job** — daily at 01:00 WIB (18:00 UTC) auto-generates all due recurring transactions
- [x] **Dashboard Banner** — card banner shows overdue recurring rules with amounts, frequency badges, and x×N multipliers
- [x] 4-state banner UX: hidden → showing → generating (spinner) → success (green card, auto-collapse after 2s)
- [x] **Source tracking idempotency** — `source_recurring_id` + `source_due_date` columns on transactions table prevent duplicates
- [x] **Fail-closed cron endpoint** — requires `CRON_SECRET` Bearer token (Vercel Cron sends it automatically when env var is set)
- [x] `/api/cron/*` whitelisted from JWT middleware (handles own auth)
- [x] `GET /api/recurring-transactions/due` — returns overdue rules with `overdueCount` and `totalAmount` per rule
- [x] Multi-period catch-up: generates all missed periods in one call (e.g., 3 months of missed salary)
- [x] Max 5 rules visible in banner; "Show all" toggle for overflow with stagger animation
- [x] `sessionStorage` dismiss — banner hidden for today per-tab; reappears in new session if items still due
- [x] `useDueRecurring` hook with React Query — cache invalidation on generate (recurring, transactions, dashboard)
- [x] Sonner toast on success/error; success card shows +income / -expense totals
- [x] Responsive: actions stack full-width on mobile; right-aligned on desktop
- [x] Accessible: `role="region"`, `aria-busy`, `aria-live="polite"`, +/- prefix (not color-only)
- [x] 20 new tests (due items service, idempotent generation, cron auth)

### Spending Insights Page

- [x] `/insights` page — dedicated analytics page answering "what's changing in my spending?"
- [x] **Monthly Health Score** — SVG ring KPI card with savings rate %, color zones (emerald >20%, amber 0-20%, red <0%), comparison to last month
- [x] **Category Comparison** — Recharts horizontal BarChart (this month vs last month per category), % change badges (red for increase, green for decrease)
- [x] **Biggest Transactions** — top 5 expense transactions with category chip, date, and IDR amount
- [x] **Day-of-Week Pattern** — 7-pill inline heatmap row with opacity-based intensity, amber highlight for top 2 days, summary sentence ("You spend most on Saturdays")
- [x] **Unusual Spending** — top 5 outliers ranked by absolute delta from 3-month category average (Rp 50K floor), multiplier text ("4.2x your typical Shopping")
- [x] `GET /api/insights/spending?month=&year=` — single server-side endpoint computing all 5 widgets via SQL aggregation
- [x] Max 8 categories in comparison chart; remainder bucketed into "Other"
- [x] Outlier detection: per-category 3-month average baseline, requires 3+ months of data
- [x] Responsive: 2/3 + 1/3 grid on desktop, single column on mobile
- [x] Navigation: Insights first in sidebar Tools group + mobile More drawer
- [x] All strings bilingual (EN/ID) via 14 new i18n keys
- [x] 18 new tests (category comparison, biggest, day-of-week, outliers, health score, edge cases)

### Authentication

- [x] JWT-based auth enforced by Next.js Edge Middleware on every request
- [x] Editorial split-panel `/login` page — animated cashflow ribbon, counting net-worth stats, market ticker, mono ledger field styling
- [x] **Keep-me-signed-in** checkbox (30-day cookie) vs default 7-day session
- [x] Editorial split-panel `/register` — same hero pattern as login
- [x] **Google OAuth** (hand-rolled, OAuth 2.0 + PKCE) — `/api/auth/google` → Google consent → `/api/auth/google/callback` (state + verifier cookies, deletes on callback)
- [x] OAuth linking rules — sign in by `(provider, subject)`, link by verified email, otherwise create new user (no password required)
- [x] OAuth error banner on `/login?error=...` — translated codes (`oauth_email_unverified`, `oauth_state_mismatch`, generic)
- [x] **Forgot password flow** — `/forgot-password` (request email) + `/reset-password?token=` (4-segment strength meter, confirm-match validation)
- [x] **Resend email integration** — single-use SHA-256-hashed tokens, 1-hour expiry, EN+ID HTML+plaintext templates with editorial styling; dev-mode console fallback when `RESEND_API_KEY` missing
- [x] Session-expired banner on `/login?reason=expired` and SKIP_AUTH first-run redirect retained
- [x] `POST /api/auth/logout` clears `auth-token` httpOnly cookie
- [x] `GET /api/auth/me` returns current user from validated JWT
- [x] `GET /api/auth/setup-check` (dev-only) detects empty DB for first-run auto-redirect
- [x] `GET /api/health` public health check endpoint (bypasses auth)
- [x] `x-user-id` header forwarded to all API route handlers by middleware
- [x] `bcryptjs` password hashing (cost 12 in production, 4 in tests)
- [x] Bilingual auth strings (EN/ID) via i18n — 30+ new keys for the editorial auth surface

### Security Hardening

- [x] **Rate limiting** on all auth POST endpoints (register, login, forgot/reset password) — in-memory sliding window (`src/lib/rate-limit.ts`)
- [x] **Security headers + CSP** on every response (`X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, Content-Security-Policy allowing only self + Google OAuth endpoints)
- [x] **User-scoped clear data** — `DELETE /api/data` deletes only the requesting user's rows across all 13 data tables; auth tables (users, oauth_accounts, password_reset_tokens) preserved
- [x] **Production guards** — `JWT_SECRET` required at runtime; `getAppUrl()` refuses request-origin fallback in production
- [x] **Money integer validation** — all amount fields validated as integers (IDR has no cents)
- [x] **WIB (UTC+7) date utilities** for recurring/due calculations (`src/lib/wib-date.ts`)

### Editorial Theme System

- [x] **Paper / Ink palette** — replaced previous blue-tinted theme tokens with editorial paper (`#ffffff`) / ink (`#0a0a0a`) / electric orange accent (`#ff5b1f`) for light mode; midnight dark (`#14110d`) / bone (`#f6f1e8`) / gold (`#d3b266`) for dark mode
- [x] **Geist Sans + Geist Mono + Fraunces** fonts via `next/font/google` (replaces Plus Jakarta Sans + JetBrains Mono); Fraunces italic display for editorial accents only (login hero, headlines)
- [x] **Editorial utility classes** in `globals.css` — `.ft-display` / `.ft-display-up` (Fraunces), `.ft-mono` (tabular numerals), `.ft-eyebrow` (10px mono uppercase, 0.18em tracking), `.ft-rule` / `.ft-rule-soft` hairlines, `.ft-live-dot` (pulsing accent)
- [x] **Animation vocabulary** — `ftRise` stagger (`.ft-rise-1..6`, 80ms increments), `ftFlow` (cashflow ribbon dashed-stroke), `ftPulseSoft` (live dot), `ftMarq` (market ticker marquee), `ftBarGrow` (budget bars), `ftShimmerBg` (skeleton loader). All respect `prefers-reduced-motion: reduce`.
- [x] **First-paint theme bootstrap** — inline `<head>` script reads `localStorage.theme` and applies `.dark` class before React hydration to prevent flash
- [x] **Hex compatibility sweep** — replaced hardcoded `#2563EB` / `#10b981` / `#ef4444` / `#f59e0b` across 19 files with editorial tokens or canvas-safe neighbours
- [x] **Numeral upgrade** — `font-mono` / `ft-mono` applied to amount displays (CashFlowChart, BalanceCard, SummaryCard, TransactionRowMobile)
- [x] **Reusable login primitives** in `src/components/login/` — `EditorialField` (square input with focus glow), `CountStat` (rAF-driven counter), `LiveRibbon` (animated SVG cashflow), `MarketTicker` (marquee with edge fade-mask), `EditorialHero` (split-panel composition), `LoginForm`

### Payment Method Icons

- [x] `PaymentMethodIcon` component — renders a Lucide icon (landmark, smartphone, banknote, etc.) or an auto-generated initials badge based on the payment method name
- [x] `IconPicker` component — 3-column grid with 9 icon options; solid ring on selected, dashed border on auto-suggested icon
- [x] `computeInitials(name)` — space-separated → first letter per word (max 3, uppercase); single word → first 3 chars
- [x] `suggestIconFromName(name)` — auto-suggests icon from name keywords (bank names, e-wallets, cash/tunai)
- [x] `normalizeIconValue(icon)` — normalises legacy bare icon names (e.g. `'wallet'`) to `'lucide:wallet'` format
- [x] Icon picker wired into Settings → add and edit payment method dialogs
- [x] `PaymentMethodIcon` shown in BalanceCard (replaces generic type icon) and TransactionForm payment method picker
- [x] Seed script assigns meaningful icons to common Indonesian banks (BCA, BRI, BNI, Mandiri…) and e-wallets (GoPay, OVO, Dana…)
- [x] Icon value stored as `'initials'` or `'lucide:<name>'` in `payment_methods.icon` column
- [x] 36 new tests (25 utility + 8 component + 3 regression)

### Settings
- [x] Theme: Light / Dark / System — synced to the server (`GET/PATCH /api/settings`) so preferences follow the user across devices; localStorage keeps them working offline
- [x] Language: English / Bahasa Indonesia — synced the same way
- [x] Category & payment method management (CRUD, color picker, budget)
- [x] Beginning Balance (Saldo Awal) per payment method — real-world account starting balance
- [x] Edit dialog for payment methods (name, type, beginning balance, icon)
- [x] Data management section (export, import, clear/reset)
- [x] Import data from JSON/CSV with validation and preview
- [x] SaaS-style sectioned layout with SettingsSection component
- [x] Delete confirmation dialog (replaces browser confirm)
- [x] Toast feedback for data clear

### Mobile Kit Visual Adoption (Figma Mobile UI Kit)
- [x] **Brand-mint accent token family** — `--brand-mint`, `--brand-mint-soft`, `--brand-mint-strong`, `--brand-mint-foreground` (light + dark) applied opt-in to chrome (hero band, FAB, primary CTAs); `--primary` blue identity preserved
- [x] **Hero band token family** — `--hero-bg` / `--hero-foreground` mapped to brand-mint
- [x] **Category-tile token family** — `--tile-bg` / `--tile-foreground` / `--tile-bg-active` / `--tile-foreground-active` (pastel-blue tile) for icon-led category surfaces
- [x] **Radius bump** — `--radius` 0.75rem → 1rem; cascades to all `--radius-*` derivatives (cards, buttons, inputs, dialogs, sheets, popovers)
- [x] **`<HeroHeader>`** mobile-only mint band (renders < 1024px) — title + optional greeting/subgreeting + decorative bell + children slot for metric chips
- [x] **`<BottomNavFab>`** — 5-slot bottom nav (Home / Transactions / Add FAB / Budget / Settings) replacing legacy `BottomNav`. Center FAB pill (`bg-brand-mint`, `-translate-y-3`) opens an Add Sheet with three router-link shortcuts (Add Income / Add Expense / Scan Receipt). Sheet auto-closes on route change.
- [x] **`<CategoryTile>`** — square pastel-blue icon tile with active-state swap to mint-blue and `aria-current="page"` on the Link branch (exported, wiring deferred)
- [x] **`<PeriodTabs>`** — controlled pill-row tabs (3-variant Daily/Weekly/Monthly or 4-variant adding Yearly), active pill in mint
- [x] **`<TransactionRowMobile>`** — 64px row with 52×52 mint-blue icon tile, name + italic timestamp, category tag, signed amount (red expense / foreground income)
- [x] **`<SavingsRingCard>`** — recharts donut ring (mint on mint-soft track) showing aggregate goal completion %, plus revenue-last-week and top-expense-category-last-week stats with empty states
- [x] **`Button variant="mint"`** — opt-in primary CTA variant; existing variants unchanged
- [x] **Hero band wired to top-level mobile pages** — `/`, `/transactions`, `/budget`, `/reports`, `/settings`. Each page's existing `PageHeader` is hidden at mobile to prevent `<h1>` collision; `/budget` controls (year stepper, monthly/annual toggle) remain visible at all viewports.
- [x] **`/` and `/transactions` mobile composition** — CSS-only mobile/desktop branching (`md:hidden` / `hidden md:block`), no `useMediaQuery`. Mobile dashboard composes hero (greeting + chips + budget bar with 6-bucket caption) → savings ring overlap card → period tabs → recent-tx list (5 items + "See all"). Mobile transactions composes hero + chips → period tabs → month-grouped TransactionRowMobile list (with infinite-scroll load-more preserved).
- [x] **Sidebar brand mark** picks up mint via `bg-brand-mint` + `text-brand-mint-foreground`
- [x] **MobileNav drawer** sports a 4px mint accent strip at the top
- [x] **30 new i18n keys** (EN + ID) covering hero / FAB / period / home greeting + subgreeting / total balance + expense / 6 budget caption buckets / savings + stats / transactions empty + see-all
- [x] **115 new tests** (Vitest) — token presence, component renders, conditional branches, page mount source-grep guards, controls visibility regression guards

### Design System
- [x] Custom color palette (Blue primary, Emerald income, Red expense, Amber warning)
- [x] Plus Jakarta Sans (UI) + JetBrains Mono (currency)
- [x] Light and dark mode with CSS variable theming
- [x] Consistent card styles (rounded-2xl, border, shadow hierarchy)
- [x] Motion presets library (fadeIn, stagger, spring, panel variants, ease curves)
- [x] Motion presets (fadeIn, stagger, spring, panel variants, ease curves)
- [x] i18n dictionary with ~185+ keys (EN/ID bilingual)
- [x] Skeleton loading states (page, card, chart, list, transaction row)
- [x] Empty/NoResults/InlineError shared state components
- [x] ConfirmDialog for destructive actions
- [x] Sonner toast system for feedback
- [x] Form validation with bilingual error messages
- [x] Custom hooks (useDashboardData, useTransactions, useAllTransactions, useUpload, useExport, useImport, useFilterPresets, useDueRecurring, useInsightsData)
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
| **Auth** | `jose` (Edge JWT) · `bcryptjs` (password hashing) · hand-rolled Google OAuth 2.0 + PKCE |
| **Email** | Resend (password-reset flow, dev-mode console fallback) |
| **Testing** | Vitest (**839 tests**: validation, all services, balance, reports, auth, OAuth linking rules, password-reset flow, advanced filters, net worth, payment method icons, recurring auto-generate, spending insights, rate limiting, user-scoped clear data, upload deletion, editorial tokens + utilities + animations + hero primitives) |
| **Charts** | Recharts (area, pie) + Chart.js (off-screen PNG rendering for export) |
| **Animations** | Framer Motion + editorial CSS keyframes (ftRise / ftFlow / ftMarq / ftPulseSoft / ftBarGrow / ftShimmerBg) |
| **OCR** | Tesseract.js |
| **Export** | ExcelJS (XLSX write) · JSZip (OpenXML chart injection) · Chart.js (PDF chart rendering) · xlsx (bulk-import read) · jsPDF (PDF) · native CSV/JSON |
| **Deploy** | Vercel (auto-deploys from GitHub) |
| **Toasts** | Sonner |
| **Fonts** | Geist Sans + Geist Mono + Fraunces (editorial italic display) — all via `next/font/google` |

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
| `JWT_SECRET` | Production | Random 32+ character string for signing JWT tokens. Required for auth to work. |
| `CRON_SECRET` | Production | Random 32-char string for Vercel Cron auth. Generate with `openssl rand -hex 16`. |
| `RESEND_API_KEY` | Password reset | Resend API key for sending password-reset emails. If unset in dev, links are logged to `console.log`. |
| `EMAIL_FROM` | Password reset | From-address for outgoing email, e.g. `Financial Tracker <noreply@your-domain.com>`. |
| `APP_URL` | Production | Public app URL (used to build reset links + OAuth redirect URI). |
| `GOOGLE_CLIENT_ID` | OAuth | Google OAuth 2.0 client ID. Leave unset to disable Google sign-in. |
| `GOOGLE_CLIENT_SECRET` | OAuth | Google OAuth client secret. |
| `NEXT_PUBLIC_SKIP_AUTH` | Dev only | Set to `true` to auto-redirect to `/register` when no users exist in DB. |

The OAuth redirect URI is derived from `APP_URL` as `${APP_URL}/api/auth/google/callback` — register that exact URL in Google Cloud Console.

### Quality Scripts

```bash
npm run test         # Run tests (Vitest, 839 tests)
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
      liabilities/            # GET + POST, [id] PATCH/DELETE
      net-worth/              # GET (current + history), snapshot/ POST
      cron/generate-recurring/ # POST (Vercel Cron, Bearer CRON_SECRET)
      recurring-transactions/  # GET/POST + [id] PATCH/DELETE + generate/ POST + due/ GET
      settings/               # GET + PATCH
      uploads/                # GET (list) + POST, [id] PATCH/DELETE
      export-jobs/            # GET (list) + POST (audit records of client-side exports)
      dashboard/summary/      # GET (aggregated summary)
    transactions/page.tsx     # Transaction list + filters
    transactions/new/page.tsx # Add transaction form
    bills/page.tsx            # Bills management
    savings/page.tsx          # Savings goals
    net-worth/page.tsx        # Net worth tracker (liabilities CRUD, trend chart)
    upload/page.tsx           # OCR receipt upload
    export/page.tsx           # Multi-format export
    settings/page.tsx         # Theme, language, data
    settings/categories/      # Category & payment method CRUD
  server/
    db/                       # Database connection (Neon Postgres or SQLite) + seed
    repositories/             # CRUD repositories (transaction, category, payment-method, settings, upload, export-job, liability, net-worth)
    services/                 # Business logic (transaction, dashboard, category, payment-method, settings, upload, export-job, liability, net-worth)
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
  __tests__/                  # Vitest tests (839 tests across 109 files)
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

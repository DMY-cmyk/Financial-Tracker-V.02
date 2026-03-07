# Financial Tracker V.02 - Wireframes & Implementation Scaffolding

---

## 1. Low-Fidelity Wireframe Specifications

### 1.1 Dashboard (`/`)

**Page container:** Full-width, `max-w-7xl`, `px-4 sm:px-6`, `py-6`. No page header (widgets speak for themselves).

**Top section:** Row 1 spans full width as 2+1 columns.
- Left (2-col): Net Balance Hero card - large animated number, income/expense chips
- Right (1-col): Month Selector - year nav + 4x3 pill grid

**Main content:** Rows 2-4 in the same 3-column grid.
- Row 2: Cash Flow Chart (2-col) + Category Donut (1-col)
- Row 3: Budget Progress Bars (2-col) + Payment Methods (1-col)
- Row 4: Bills Checklist (1-col) + Savings Goals (1-col) + Recent Transactions (1-col)

**Action zones:**
- Bill checkboxes: toggle inline
- "View all" link: in RecentTransactions header
- Month pills: clickable in MonthSelector

**Empty state:** All widgets show individual "No data" messages. Hero shows "Rp 0".

**Responsive:**
- lg (>=1024): 3 columns
- sm (>=640): 2 columns, 2-col widgets span full
- xs (<640): 1 column stack, bottom nav visible

### 1.2 Transactions List (`/transactions`)

**Page container:** Full-width, `max-w-7xl`, `space-y-6`.

**Top section:** PageHeader with title + "Add Transaction" button (right-aligned).

**Primary content:**
1. Summary Strip: 3-cell horizontal card (Income | Expense | Net) with dividers
2. Filter Bar: Search input + Type toggle (All/Income/Expense) + Category dropdown
3. Transaction List: Date-grouped sections, each with date header + transaction rows

**Action zones:**
- FAB on mobile (bottom-right, fixed)
- Row hover reveals Edit/Delete icons
- "Add Transaction" button opens Sheet slide-over

**Empty state:** Centered illustration + "No transactions this month" + "Add your first transaction" CTA button.

**Responsive:**
- Desktop: summary strip horizontal, filters in one row
- Mobile: summary stacks, filters collapse, action icons always visible

### 1.3 Add Transaction (Sheet panel / `/transactions/new`)

**Page container:** Sheet slide-over (400px desktop, full-screen mobile) OR max-w-lg centered page.

**Top section:** Type Toggle bar (Expense red | Income green).

**Main content:**
1. Amount Input: Large (32px), monospace, "Rp" prefix, auto-focus
2. Date Picker: Calendar input
3. Description: Text input
4. Category Select: Filtered by type, color dots
5. Payment Method Select: All methods
6. Notes: Optional textarea

**Action zones:** Cancel (outline) + Save (primary), full-width on mobile.

**Empty state:** N/A (always has fields).

**Responsive:** Sheet is full-screen on mobile. Standalone page is single-column.

### 1.4 Upload & Extract (`/upload`)

**Page container:** `max-w-4xl`, 2-column grid (desktop), stacked (mobile).

**Left column: Upload Zone**
- State 1: Dashed drop zone (280px) with upload icon + instructions
- State 2: Image preview + "Extract Text" / "Clear" buttons
- State 3: Image with processing overlay (spinner + progress %)

**Right column: Review Form**
- Header: "Extracted Data"
- Fields: Amount (Rp prefix), Description, Date, Category select, Payment method
- Action: "Save Transaction" button (full-width)
- Empty: "Upload and process a receipt to see extracted data"

**Responsive:** Stacks vertically on mobile.

### 1.5 Categories & Sources (`/settings/categories`)

**Page container:** `max-w-4xl`, `space-y-6`.

**Top section:** PageHeader with back arrow + "Categories & Payment Methods" title.

**Main content:**
- 2-column grid: Expense Categories card (left) + Income Sources card (right)
- Each: list of items (color dot + name + budget/delete)
- Below: Add Category form (type + name + color palette + budget + Add button)
- Full-width: Payment Methods card (list + add form)

**Responsive:** 2-column becomes stacked.

### 1.6 Export Center (`/export`)

**Page container:** `max-w-2xl` centered, `space-y-6`.

**Top section:** PageHeader "Export Data".

**Main content:**
1. Format card: Row of selectable cards (CSV | Excel | PDF) - click to select
2. Scope card: 2 cards (This Month | All Data) - click to select
3. Options: Toggle switches (include summary, group by date)
4. Preview: Collapsible mini-table (first 5 rows)
5. Download button: Full-width primary

**Responsive:** Cards stack on mobile.

### 1.7 Settings (`/settings`)

**Page container:** `max-w-2xl` centered, `space-y-6`.

**Main content (stacked cards):**
1. Theme Card: 3 selectable cards (Light | Dark | System)
2. Language Card: 2 selectable cards (English | Bahasa Indonesia)
3. Categories Link: Outline button to `/settings/categories`
4. Data Card: Destructive "Clear All Data" button

---

## 2. ASCII Wireframes

### 2.1 Dashboard
```
┌─────────────────────────────────────────────────────────────────────┐
│ [FT] Financial Tracker    [Dashboard] [Tx] [Upload] [Export] [Set] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────┐  ┌──────────────────┐    │
│  │  Net Balance · January 2025         │  │    < 2025 >      │    │
│  │                                      │  │                  │    │
│  │  Rp 8.206.000  (animated)           │  │ [Jan][Feb][Mar]  │    │
│  │                                      │  │ [Apr][May][Jun]  │    │
│  │  [↑ Rp 11.000.000] [↓ Rp 2.794.000]│  │ [Jul][Aug][Sep]  │    │
│  └──────────────────────────────────────┘  │ [Oct][Nov][Dec]  │    │
│                                             └──────────────────┘    │
│  ┌──────────────────────────────────────┐  ┌──────────────────┐    │
│  │  Cash Flow                           │  │ Category         │    │
│  │                                      │  │ Breakdown        │    │
│  │    ╱╲    income (green area)         │  │                  │    │
│  │   ╱  ╲──── expense (red area)       │  │   ╭──────╮       │    │
│  │  ╱       ╲                           │  │   │ ◕◕◕◕ │       │    │
│  │ ─────────────────────────            │  │   ╰──────╯       │    │
│  │  1   5   10   15   20   28           │  │ ● Food    38%   │    │
│  └──────────────────────────────────────┘  │ ● Trans.  12%   │    │
│                                             │ ● Util.   32%   │    │
│                                             │ ● Ent.    18%   │    │
│                                             └──────────────────┘    │
│  ┌──────────────────────────────────────┐  ┌──────────────────┐    │
│  │  Budget Progress                     │  │ Payment Methods  │    │
│  │                                      │  │                  │    │
│  │  ● Food    Rp 960K / Rp 1.5M        │  │ BCA    Rp 1.6M  │    │
│  │  [████████████░░░░░░░] 64%           │  │ [████████████]   │    │
│  │  ● Transport Rp 185K / Rp 800K      │  │ Cash   Rp 685K  │    │
│  │  [█████░░░░░░░░░░░░░] 23%           │  │ [██████░░░░░░]   │    │
│  │  ● Utilities Rp 999K / Rp 1M        │  │ GoPay  Rp 175K  │    │
│  │  [██████████████████░] 99% ⚠        │  │ [███░░░░░░░░░]   │    │
│  └──────────────────────────────────────┘  └──────────────────┘    │
│                                                                     │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐    │
│  │ Bills Checklist   │ │ Savings Goals    │ │ Recent Tx  →All  │    │
│  │                   │ │                  │ │                  │    │
│  │ ☑ Electricity     │ │ (24%) Emergency  │ │ ■ Water Bill     │    │
│  │   Due:5 Rp350K    │ │  ◐  Rp12M/50M   │ │   28 Jan -Rp150K │    │
│  │ ☑ Internet        │ │                  │ │ ■ Online Shop    │    │
│  │   Due:10 Rp399K   │ │ (23%) Vacation   │ │   25 Jan -Rp250K │    │
│  │ ☐ Rent            │ │  ◐  Rp3.5M/15M  │ │ ■ Phone Credit   │    │
│  │   Due:1 Rp2M      │ │                  │ │   20 Jan -Rp100K │    │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘    │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ (mobile only) [🏠] [📋] [📤] [📥] [⚙]                              │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Transactions List
```
┌─────────────────────────────────────────────────────────────────────┐
│ [FT] Financial Tracker    [Dashboard] [Tx] [Upload] [Export] [Set] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Transactions                                    [+ Add Transaction]│
│  15 transactions                                                    │
│                                                                     │
│  ┌────────────────────┬──────────────────┬──────────────────┐      │
│  │  Income            │  Expense         │  Net Balance     │      │
│  │  Rp 11.000.000     │  Rp 2.794.000   │  Rp 8.206.000   │      │
│  │  (green)           │  (red)           │  (default)       │      │
│  └────────────────────┴──────────────────┴──────────────────┘      │
│                                                                     │
│  [🔍 Search...]  [All|Income|Expense]  [Category ▼]                │
│                                                                     │
│  28 January 2025                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [■] Water Bill          Utilities · Bank BCA    -Rp 150.000│   │
│  │ [■] Online Shopping     Entertain · Bank BCA   -Rp 250.000│   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  20 January 2025                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [■] Phone Credit        Utilities · GoPay      -Rp 100.000│   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ...more date groups...                                             │
│                                                                     │
│                                                           [+ FAB]   │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3 Add Transaction (Sheet)
```
                              ┌──────────────────────────┐
                              │ Add Transaction        ✕ │
                              ├──────────────────────────┤
                              │                          │
                              │  ┌──────────┬──────────┐ │
                              │  │ Expense  │  Income  │ │
                              │  │ (active) │          │ │
                              │  └──────────┴──────────┘ │
                              │                          │
                              │  Amount                  │
                              │  ┌────────────────────┐  │
                              │  │ Rp  8.500.000      │  │
                              │  └────────────────────┘  │
                              │  (large, mono, bold)     │
                              │                          │
                              │  Date        Category    │
                              │  ┌────────┐ ┌─────────┐ │
                              │  │01/15/25│ │● Food  ▼│ │
                              │  └────────┘ └─────────┘ │
                              │                          │
                              │  Description             │
                              │  ┌────────────────────┐  │
                              │  │ Grocery Shopping    │  │
                              │  └────────────────────┘  │
                              │                          │
                              │  Payment Method          │
                              │  ┌────────────────────┐  │
                              │  │ Cash             ▼ │  │
                              │  └────────────────────┘  │
                              │                          │
                              │  Notes                   │
                              │  ┌────────────────────┐  │
                              │  │                    │  │
                              │  └────────────────────┘  │
                              │                          │
                              │  ┌────────┐ ┌──────────┐│
                              │  │ Cancel │ │   Save   ││
                              │  └────────┘ └──────────┘│
                              └──────────────────────────┘
```

### 2.4 Upload & Extract
```
┌─────────────────────────────────────────────────────────────────────┐
│  Upload Receipt                                                     │
│                                                                     │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐│
│  │                              │  │  Extracted Data              ││
│  │  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐   │  │                              ││
│  │  │                       │   │  │  Amount                      ││
│  │  │     📤 Upload icon    │   │  │  ┌─────────────────────────┐ ││
│  │  │                       │   │  │  │ Rp  45.000              │ ││
│  │  │  Drop receipt here    │   │  │  └─────────────────────────┘ ││
│  │  │  or click to browse   │   │  │                              ││
│  │  │                       │   │  │  Description                 ││
│  │  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘   │  │  ┌─────────────────────────┐ ││
│  │                              │  │  │ ALFAMART JL SUDIRMAN    │ ││
│  │  ── After upload ──          │  │  └─────────────────────────┘ ││
│  │                              │  │                              ││
│  │  ┌────────────────────────┐  │  │  Date                       ││
│  │  │                        │  │  │  ┌─────────────────────────┐ ││
│  │  │   [receipt image]      │  │  │  │ 2025-01-15              │ ││
│  │  │                        │  │  │  └─────────────────────────┘ ││
│  │  └────────────────────────┘  │  │                              ││
│  │                              │  │  Category                    ││
│  │  [Extract Text] [Clear]     │  │  ┌─────────────────────────┐ ││
│  │                              │  │  │ Food                  ▼ │ ││
│  │                              │  │  └─────────────────────────┘ ││
│  │                              │  │                              ││
│  │                              │  │  [Save Transaction ────────]││
│  └──────────────────────────────┘  └──────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### 2.5 Export Center
```
┌─────────────────────────────────────────────────────────────────────┐
│  Export Data                                                        │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Format                                                     │   │
│  │                                                             │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │   │
│  │  │ 📊 CSV      │  │ 📋 Excel    │  │ 📄 PDF      │        │   │
│  │  │ Spreadsheet │  │ Formatted   │  │ Print-ready │        │   │
│  │  │ compatible  │  │ workbook    │  │ report      │        │   │
│  │  │  [selected] │  │             │  │             │        │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Scope                                                      │   │
│  │                                                             │   │
│  │  ┌──────────────────────┐  ┌──────────────────────┐        │   │
│  │  │ This Month           │  │ All Data             │        │   │
│  │  │ January 2025         │  │ 15 transactions      │        │   │
│  │  │ [selected]           │  │                      │        │   │
│  │  └──────────────────────┘  └──────────────────────┘        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Options                                                    │   │
│  │  ☑ Include summary totals                                   │   │
│  │  ☑ Group by date                                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Preview (5 rows)                                    [Hide] │   │
│  │  Date      │ Description     │ Category │ Amount           │   │
│  │  28 Jan    │ Water Bill      │ Utility  │ -Rp 150.000     │   │
│  │  25 Jan    │ Online Shopping │ Entert.  │ -Rp 250.000     │   │
│  │  ...                                                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    📥 Download CSV                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Map

### 3.1 Layout Components

| Component | Purpose | Props | Reusable | Notes |
|-----------|---------|-------|----------|-------|
| `Navbar` | Desktop top nav | none | Yes | Glass blur, sticky, logo + nav links + lang toggle |
| `BottomNav` | Mobile bottom tabs | none | Yes | Fixed bottom, 5 icons + labels |
| `PageHeader` | Page title + actions | `title, description?, children?` | Yes | Flex between title and action slot |

### 3.2 Dashboard Components

| Component | Purpose | Props | Reusable | Notes |
|-----------|---------|-------|----------|-------|
| `NetBalanceCard` | Hero balance display | none | No | Uses AnimatedCounter, reads store |
| `MonthSelector` | Month/year picker | none | No | 4x3 pill grid, reads/writes store |
| `CashFlowChart` | Income vs expense chart | none | No | Recharts AreaChart, uses useCashFlow |
| `CategoryBreakdown` | Expense donut chart | none | No | Recharts PieChart, uses useCategoryTotals |
| `BudgetProgress` | Budget bar list | none | No | Progress bars, uses useBudgetStatus |
| `PaymentMethodsSummary` | Payment method bars | none | No | Horizontal bars, uses usePaymentMethodTotals |
| `BillsChecklist` | Interactive bill list | none | No | Checkboxes, reads/writes store |
| `SavingsGoals` | Savings progress rings | none | No | ProgressRing, reads store |
| `RecentTransactions` | Last 5 transactions | none | No | Mini list with View All link |

### 3.3 Transaction Components

| Component | Purpose | Props | Reusable | Notes |
|-----------|---------|-------|----------|-------|
| `TransactionTable` | Date-grouped tx list | `transactions, onEdit, onDelete` | Yes | Groups by date, hover actions |
| `TransactionForm` | Add/edit form | `transaction?, onClose` | Yes | Type toggle + all fields |
| `TransactionFilters` | Filter controls | `search, type, category, onChange handlers` | Yes | Search + toggle + dropdown |
| `TransactionSummary` | Income/expense/net strip | `income, expense` | Yes | 3-cell card with dividers |
| `CategoryChip` | Colored category badge | `category` | Yes | Color dot + name |

### 3.4 Upload/OCR Components

| Component | Purpose | Props | Reusable | Notes |
|-----------|---------|-------|----------|-------|
| `DropZone` | File upload area | `onFileSelect, accept?` | Yes | Drag-drop + click-to-browse |
| `OcrPreview` | Extracted data form | `data, onChange, onSave` | No | Pre-filled editable fields |
| `ProcessingOverlay` | Loading state on image | `progress, isProcessing` | Yes | Spinner + percentage |
| `ConfidenceBar` | OCR confidence visual | `confidence` | Yes | Green/amber/red bar |

### 3.5 Export Components

| Component | Purpose | Props | Reusable | Notes |
|-----------|---------|-------|----------|-------|
| `FormatCard` | Selectable format option | `icon, label, desc, selected, onClick` | Yes | Click to select, blue border |
| `ScopeSelector` | Month/all scope toggle | `scope, onScopeChange, monthLabel, txCount` | Yes | 2 selectable cards |
| `ExportPreview` | Mini table preview | `transactions` | No | First 5 rows, collapsible |
| `ExportOptions` | Toggle switches | `options, onChange` | Yes | Include summary, group by date |

### 3.6 Shared UI Primitives

| Component | Purpose | Props | Reusable | Notes |
|-----------|---------|-------|----------|-------|
| `AmountDisplay` | Formatted IDR amount | `amount, type?, size?` | Yes | Mono font, colored by type |
| `AnimatedCounter` | Spring-animated number | `value, className?` | Yes | Framer Motion useSpring |
| `ProgressRing` | SVG circular progress | `percentage, size?, color?, children?` | Yes | Configurable radius/stroke |
| `EmptyState` | Empty data placeholder | `title, description?, icon?, children?` | Yes | Centered with optional CTA |
| `LoadingSkeleton` | Pulse placeholder | `className?` | Yes | Simple animated div |
| `CardSkeleton` | Card-shaped skeleton | none | Yes | Simulates card loading |
| `SummaryCard` | Generic stat card | `label, value, icon?, trend?, color?` | Yes | Reusable for any metric |
| `ChartCard` | Card wrapper for charts | `title, children, action?` | Yes | Title + content slot |

---

## 4-5. Page File Structure & Folder Tree

```
financial-tracker/
├── .github/
│   └── workflows/
│       └── deploy-pages.yml
├── data/
│   └── workbook.json
├── public/
│   └── favicon.ico
├── scripts/
│   └── extract_xlsx.py
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx                          # Dashboard
│   │   ├── transactions/
│   │   │   ├── page.tsx                      # Transaction list
│   │   │   └── new/
│   │   │       └── page.tsx                  # Add transaction
│   │   ├── upload/
│   │   │   └── page.tsx                      # Upload & OCR
│   │   ├── export/
│   │   │   └── page.tsx                      # Export center
│   │   └── settings/
│   │       ├── page.tsx                      # Settings
│   │       └── categories/
│   │           └── page.tsx                  # Category management
│   ├── components/
│   │   ├── ui/                               # shadcn/ui primitives
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── tooltip.tsx
│   │   │   └── badge.tsx
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   └── PageHeader.tsx
│   │   ├── dashboard/
│   │   │   ├── NetBalanceCard.tsx
│   │   │   ├── MonthSelector.tsx
│   │   │   ├── CashFlowChart.tsx
│   │   │   ├── CategoryBreakdown.tsx
│   │   │   ├── BudgetProgress.tsx
│   │   │   ├── PaymentMethods.tsx
│   │   │   ├── BillsChecklist.tsx
│   │   │   ├── SavingsGoals.tsx
│   │   │   └── RecentTransactions.tsx
│   │   ├── transactions/
│   │   │   ├── TransactionTable.tsx
│   │   │   ├── TransactionForm.tsx
│   │   │   ├── TransactionFilters.tsx
│   │   │   ├── TransactionSummary.tsx        # NEW
│   │   │   └── CategoryChip.tsx
│   │   ├── upload/
│   │   │   ├── DropZone.tsx                  # NEW (extracted)
│   │   │   ├── OcrPreview.tsx                # NEW (extracted)
│   │   │   ├── ProcessingOverlay.tsx         # NEW
│   │   │   └── ConfidenceBar.tsx             # NEW
│   │   ├── export/
│   │   │   ├── FormatCard.tsx                # NEW
│   │   │   ├── ScopeSelector.tsx             # NEW
│   │   │   ├── ExportPreview.tsx             # NEW
│   │   │   └── ExportOptions.tsx             # NEW
│   │   ├── shared/
│   │   │   ├── AmountDisplay.tsx
│   │   │   ├── AnimatedCounter.tsx
│   │   │   ├── ProgressRing.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── LoadingSkeleton.tsx
│   │   │   ├── SummaryCard.tsx               # NEW
│   │   │   └── ChartCard.tsx                 # NEW
│   │   └── providers/
│   │       └── StoreProvider.tsx
│   ├── lib/
│   │   ├── types.ts
│   │   ├── constants.ts
│   │   ├── formatters.ts
│   │   ├── calculations.ts
│   │   ├── storage.ts
│   │   ├── data-migration.ts
│   │   ├── i18n.ts
│   │   ├── export-utils.ts                  # NEW
│   │   ├── design-tokens.ts                 # NEW
│   │   └── utils.ts
│   ├── store/
│   │   ├── index.ts
│   │   └── selectors.ts
│   └── data/
│       └── sample-data.ts
├── BLUEPRINT.md
├── WIREFRAMES.md
├── Plan.md
├── README.md
├── components.json
├── next.config.ts
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

---

## 6. Design Token Foundation

See `src/lib/design-tokens.ts` for the implementation-ready token file.

---

## 7-11. Implementation Plans

See BLUEPRINT.md sections 4, 5, 6, 7, 8 for detailed page-by-page implementation plans including interactions, states, and responsive behavior.

---

## 12-14. Implementation Scaffolding

All new components listed in the component map (section 3) with "NEW" markers are implemented as actual code files. See the source files for implementation.

---

## 15. Build Recommendation

### Files to Create First (foundation)
1. `src/lib/design-tokens.ts` - Design token constants
2. `src/components/shared/SummaryCard.tsx` - Reusable stat card
3. `src/components/shared/ChartCard.tsx` - Chart wrapper

### Components to Build First (core reusables)
1. `SummaryCard` + `ChartCard` - Used across dashboard and transactions
2. `TransactionSummary` - Extracts inline summary from transactions page
3. `FormatCard` + `ScopeSelector` - Modularizes export page
4. `DropZone` + `OcrPreview` - Modularizes upload page

### What to Mock First
1. Export preview data (first 5 transaction rows)
2. OCR confidence scores (random 70-95% for now)
3. Processing progress (simulate 0-100% over 2 seconds)

### Optimal Implementation Order
```
1. design-tokens.ts           (foundation for all components)
2. SummaryCard + ChartCard    (shared primitives)
3. TransactionSummary         (extract from transactions page)
4. FormatCard + ScopeSelector + ExportOptions + ExportPreview  (modularize export)
5. DropZone + OcrPreview + ProcessingOverlay + ConfidenceBar   (modularize upload)
6. Navbar enhancement (lang toggle)
7. Toast notifications
8. Remaining polish items
```

# Financial Tracker V.02 - Production Blueprint

---

## 1. Refined Concept: Modular Bento Grid Dashboard

**Concept in one sentence:** A card-based, widget-driven financial dashboard where every data domain (balance, transactions, budgets, bills, savings) lives in its own self-contained visual tile arranged in an asymmetric bento grid, with rich interactions happening inline or in slide-over panels rather than full page navigations.

**Why this is the best fit:**
- **Data density without spreadsheet feel.** A bento grid gives each metric breathing room inside its own card. Large IDR numbers (Rp 8.500.000) get dedicated hero space instead of being squeezed into a cell. The user sees everything at once without scrolling a table.
- **Natural mapping to the data model.** The existing data already segments into transactions, categories, budgets, bills, savings. Each segment becomes a widget. No artificial grouping needed.
- **At-a-glance monitoring is the primary use case.** Budget trackers are checked daily for 10-30 seconds. A grid of cards lets users scan balance, recent activity, and budget status instantly. A spreadsheet requires mental parsing.
- **Interaction locality.** Bills can be checked off inside their widget. Transactions can be added via a floating button. No context-switching.
- **Proven pattern.** Mercury, Copilot Money, Wise, and Linear all use card grids for financial data. Users already understand this layout.

**How it avoids the spreadsheet trap:**
- No visible rows/columns grid. Data lives in cards with semantic layouts.
- Amounts use large monospace typography, not cramped cells.
- Navigation is horizontal (top bar) not tab-based sheets.
- Charts replace formula-computed summary rows.
- CRUD happens in modals/slide-overs, not inline cell editing.
- Color-coded categories replace plain text labels.

---

## 2. Full Information Architecture

### 2.1 Dashboard (`/`)
| Attribute | Detail |
|-----------|--------|
| **Purpose** | At-a-glance financial health for the selected month |
| **User actions** | Switch month/year, check off bills, view trends, navigate to details |
| **Key UI blocks** | Net Balance Hero, Month Selector, Cash Flow Chart, Category Donut, Budget Progress Bars, Payment Method Bars, Bills Checklist, Savings Rings, Recent Transactions |
| **Outputs** | Visual snapshot of income, expense, balance, budget status, bill status |

### 2.2 Transactions (`/transactions`)
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Full transaction history with filtering, search, and CRUD |
| **User actions** | Search, filter by type/category/payment method, sort, add/edit/delete transactions |
| **Key UI blocks** | Summary Strip (income/expense/net), Filter Bar, Date-Grouped Transaction List, FAB Add Button, Slide-Over Form |
| **Outputs** | Filtered transaction view, transaction count |

### 2.3 Add/Edit Transaction (Slide-over panel)
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Create or modify a single transaction |
| **User actions** | Toggle income/expense, enter amount, select date/category/payment method, add notes, save |
| **Key UI blocks** | Type Toggle, Amount Input (large, monospace, live formatting), Date Picker, Category Select, Payment Method Select, Description Input, Notes Input |
| **Outputs** | New or updated transaction in store |

### 2.4 Upload & Extract (`/upload`)
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Import transactions from receipt photos via OCR |
| **User actions** | Drag-drop or select image, trigger OCR, review extracted fields, correct errors, assign category, save as transaction |
| **Key UI blocks** | Drop Zone, Image Preview, Processing Indicator, Extracted Fields Form, Confidence Indicators, Save Button |
| **Outputs** | New transaction created from extracted data |

### 2.5 Categories & Sources (`/settings/categories`)
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Manage expense categories, income sources, and payment methods |
| **User actions** | Add/edit/delete categories, set budgets, change colors, add/remove payment methods |
| **Key UI blocks** | Expense Category List, Income Source List, Payment Method List, Add Category Form, Color Palette Picker |
| **Outputs** | Updated category/payment method lists |

### 2.6 Export Center (`/export`)
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Download financial data in various formats |
| **User actions** | Select format (CSV/Excel/PDF), choose scope (month/all/range), toggle options, preview, download |
| **Key UI blocks** | Format Cards, Scope Selector, Date Range Picker, Options Toggles, Preview Panel, Download Button |
| **Outputs** | Downloaded file |

### 2.7 Settings (`/settings`)
| Attribute | Detail |
|-----------|--------|
| **Purpose** | App preferences and data management |
| **User actions** | Switch theme, switch language, clear data, import data |
| **Key UI blocks** | Theme Cards, Language Cards, Data Management Section, Category Management Link |
| **Outputs** | Updated preferences persisted to localStorage |

### 2.8 Language / Localization
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Full EN/ID bilingual interface |
| **User actions** | Toggle language in settings or via quick switcher |
| **Key UI blocks** | Language toggle integrated in settings, affects all labels/messages/empty states |
| **Outputs** | All UI text switches instantly without reload |

---

## 3. Navigation System

### 3.1 Desktop Navigation (>= 768px)
**Top Bar (horizontal)**
```
[Logo: FT] Financial Tracker          [Dashboard] [Transactions] [Upload] [Export] [Settings]    [Theme Toggle] [Lang: EN]
```
- Sticky top, 64px height, backdrop-blur glass effect
- Active item: blue text + blue/10% background pill
- Logo click: returns to dashboard
- Right side: theme icon toggle + compact language switcher (EN/ID pill toggle)

### 3.2 Mobile Navigation (< 768px)
**Bottom Tab Bar (5 items)**
```
[Dashboard] [Transactions] [Upload] [Export] [Settings]
```
- Fixed bottom, 64px height, safe-area aware
- Icons + labels, active item blue
- Top bar on mobile: just logo + page title

### 3.3 Secondary Navigation
- **Settings subpages** (Settings -> Categories): Back arrow + breadcrumb text
- **Transaction detail**: Slide-over Sheet (no page navigation needed)
- **No sidebar**: The app is simple enough that a top/bottom bar covers all routes. A sidebar would waste horizontal space that charts need.

### 3.4 Quick Actions
- **FAB (Floating Action Button)**: Visible on Transactions page, bottom-right, opens add transaction sheet
- **Dashboard quick-add**: "+" icon in Recent Transactions widget header

---

## 4. Detailed Page Specifications

### 4.1 Dashboard Page (`/`)

**Page goal:** Show complete financial health for selected month in under 5 seconds of scanning.

**Layout (top to bottom):**

```
Row 1: [Net Balance Hero -------- 2col] [Month Selector -- 1col]
Row 2: [Cash Flow Area Chart ---- 2col] [Category Donut -- 1col]
Row 3: [Budget Progress Bars ---- 2col] [Payment Methods - 1col]
Row 4: [Bills Checklist - 1col] [Savings Goals - 1col] [Recent Tx - 1col]
```

**Components:**

| Component | Spec |
|-----------|------|
| `NetBalanceCard` | 2-col span. Top: "Net Balance - January 2025" label. Center: animated counter (Rp XX.XXX.XXX) in 36px mono bold. Bottom: green income chip + red expense chip with arrow icons. Decorative circle blur in top-right. |
| `MonthSelector` | 1-col. Year nav (< 2025 >) at top. 4x3 grid of month pills. Active month: blue fill. Others: ghost. |
| `CashFlowChart` | 2-col. Title "Cash Flow". Recharts AreaChart: green area = income, red area = expense. Gradient fills (20% -> 0% opacity). Dashed grid lines. Tooltip on hover showing formatted amounts. X-axis: day numbers. Y-axis: abbreviated amounts (Rp 1M). |
| `CategoryBreakdown` | 1-col. Title "Category Breakdown". Recharts PieChart: 60% cutout donut. Segments colored by category. Below: legend list with color dot + name + percentage. |
| `BudgetProgress` | 2-col. Title "Budget Progress". List of categories: each has colored dot + name + "Rp spent / Rp budget" + progress bar. Bar colors: green (<80%), amber (80-99%), red (>=100%). Over-budget shows red text warning. |
| `PaymentMethodsSummary` | 1-col. Title "Payment Methods". Horizontal bars normalized to max value. Each: method name + formatted amount + colored bar. |
| `BillsChecklist` | 1-col. Title "Bills Checklist". List: checkbox + bill name + due date + amount. Checked: strikethrough + green text. Unchecked: normal + default text. Interactive toggle. |
| `SavingsGoals` | 1-col. Title "Savings Goals". Each goal: SVG progress ring (56px) with percentage center text + goal name + "Rp saved of Rp target" in mono. |
| `RecentTransactions` | 1-col. Title "Recent Transactions" + "View all ->" link. Last 5 transactions: colored category dot bg + description + date/category subtitle + signed amount (green +, red -). |

**Interactions:**
- Month pill click: all widgets re-render with new month data (instant, from store)
- Year arrows: increment/decrement year
- Bill checkbox: toggle paid status (persists to store)
- "View all" link: navigates to `/transactions`

**Empty state:** When no transactions exist for selected month, hero shows "Rp 0" with "No transactions yet" subtitle and "Add your first transaction" button.

**Responsive:**
- >= 1024px: 3-column grid
- 768-1023px: 2-column grid (2-col widgets become full-width)
- < 768px: 1-column stack

### 4.2 Transactions List Page (`/transactions`)

**Page goal:** Browse, search, filter, and manage all transactions for the selected month.

**Layout (top to bottom):**
1. **Page Header**: "Transactions" title + "Add Transaction" primary button
2. **Summary Strip**: 3-cell horizontal card: Total Income (green) | Total Expense (red) | Net Balance (default). Dividers between cells.
3. **Filter Bar**: Search input (with icon) | Type toggle (All/Income/Expense) | Category dropdown | Payment Method dropdown
4. **Transaction List**: Date-grouped sections. Each date header: formatted date string. Under each: transaction rows.

**Transaction Row:**
```
[Category Color Square 32px] [Description (bold) + Date/Category/PaymentMethod (subtitle)] [+/-Amount (mono, colored)] [Edit/Delete icons (hover)]
```

**Interactions:**
- Search: real-time filter on description, category, notes
- Type toggle: tri-state button group (All highlighted vs Income vs Expense)
- Category dropdown: filter to single category
- Row hover: reveals edit (pencil) and delete (trash) icon buttons
- Edit click: opens slide-over Sheet with pre-filled TransactionForm
- Delete click: confirmation dialog, then removes from store
- Add button: opens empty slide-over Sheet

**Empty state:** Illustration placeholder + "No transactions this month" + "Add your first transaction" button.

**Error state:** Toast notification if delete fails (shouldn't in localStorage, but defensive).

**Success state:** Toast "Transaction saved" after add/edit. Toast "Transaction deleted" after delete.

**Responsive:**
- Desktop: summary strip is horizontal 3-cell. Filter bar wraps if needed.
- Mobile: summary strip stacks vertically. Filter toggles become a collapsible section. Edit/delete icons always visible (no hover on touch).

### 4.3 Add/Edit Transaction (Sheet Panel)

**Page goal:** Fast, guided entry of a single transaction.

**Layout (slide-over from right, 400px wide on desktop, full-screen on mobile):**

1. **Type Toggle Bar**: Full-width segmented control. "Expense" (red when active) | "Income" (green when active). Defaults to Expense.
2. **Amount Input (hero section)**: Large (32px font), monospace. "Rp" prefix label. Live formatting as user types (inserts dots: 8500000 -> 8.500.000). Auto-focus on open.
3. **Date Picker**: Calendar input, defaults to today. Shows formatted date.
4. **Description Input**: Text input with autocomplete from previous descriptions.
5. **Category Select**: Dropdown filtered by current type (expense shows Food/Transport/etc, income shows Salary/Freelance/etc). Each option has color dot.
6. **Payment Method Select**: Dropdown with all payment methods. Icon prefix for type (bank/cash/ewallet).
7. **Notes Input**: Optional textarea, 2 lines.
8. **Action Buttons**: "Cancel" (outline) | "Save" (primary, full color). Full width on mobile.

**Interactions:**
- Type toggle: switches category options, clears current category selection
- Amount input: strips non-digits, reformats with dot separators on each keystroke
- Save: validates (amount > 0, description not empty, category selected, payment method selected), shows inline errors, saves to store, closes panel, shows success toast
- Cancel: closes panel without saving, discards changes

**Empty state:** N/A (always has form fields).

**Error state:** Inline red text below each required field: "Required" / "Wajib diisi".

**Success state:** Panel closes, green toast "Transaction saved" / "Transaksi tersimpan".

### 4.4 Upload & Extract Page (`/upload`)

**Page goal:** Extract transaction data from receipt/payment proof images.

**Layout (2-column on desktop, stacked on mobile):**

**Left Column: Upload Zone**
1. **Drop Zone**: Dashed border rectangle, 280px tall. Upload icon + "Drop receipt image here" + "or click to browse". Accepts image/* only.
2. **Image Preview**: After upload, shows the image with "Clear" and "Extract Text" buttons below.
3. **Processing State**: Spinner overlay on image + "Extracting text..." label + progress percentage from Tesseract.

**Right Column: Review Form**
1. **"Extracted Data" heading**
2. **Confidence indicator**: Color bar (green = high confidence, amber = medium, red = low)
3. **Amount input**: Pre-filled from OCR, editable, with Rp prefix and live formatting
4. **Description input**: Pre-filled from first line of OCR text, editable
5. **Date picker**: Pre-filled if date pattern found, editable
6. **Category select**: Auto-suggested if merchant text matches known categories, editable
7. **Payment method select**: Default to first method, editable
8. **"Save Transaction" button**: Creates expense transaction from form data

**Interactions:**
- Drag-drop: file lands in zone, immediately shows preview
- File input: fallback click-to-browse
- Extract button: starts Tesseract.js worker (lazy-loaded), shows progress
- OCR complete: auto-fills form fields, user reviews and corrects
- Save: validates same as TransactionForm, creates transaction, clears upload state, shows success toast

**Empty state (right column before extraction):** "Upload and process a receipt to see extracted data" with muted icon.

**Error state:** If OCR fails: "Could not extract text from this image. Please try a clearer photo." with retry button.

**Success state:** Green toast "Transaction created from receipt" + form clears + upload zone resets.

**Responsive:** Stacks vertically on mobile (upload zone on top, form below).

### 4.5 Categories & Sources (`/settings/categories`)

**Page goal:** Full management of expense categories, income sources, and payment methods.

**Layout (top to bottom):**

1. **Page Header**: "Categories & Payment Methods" + back arrow to settings
2. **Two-column grid (desktop) / stacked (mobile)**:
   - **Left: Expense Categories card**
     - List: color dot (16px circle) + name + budget input (mono, right-aligned) + delete button
     - Budget input: inline editable, live IDR formatting
   - **Right: Income Sources card**
     - List: color dot + name + delete button
     - No budget field (income sources don't have budgets)
3. **Add Category section**: Type selector (expense/income) + name input + color palette (12 preset colors in a row, click to select, selected has ring border) + budget input (if expense) + "Add" button
4. **Payment Methods card**: Full-width below.
   - List: name + type badge (bank/cash/ewallet) + delete button
   - Add row: name input + type dropdown + "Add" button

**Interactions:**
- Budget edit: on change, immediately updates store (debounced)
- Delete: removes from store, re-renders list
- Color select: toggles ring on clicked swatch, deselects previous
- Add: validates name not empty, adds to store, clears inputs

**Empty state:** "No categories yet. Add one below."

**Responsive:** Two-column becomes stacked on mobile.

### 4.6 Export Center (`/export`)

**Page goal:** Download financial data in the user's preferred format.

**Layout (top to bottom):**

1. **Page Header**: "Export Data"
2. **Format Selection**: 3 cards in a row (desktop). Each: icon + format name + description. Click to select (blue border).
   - CSV: spreadsheet icon + "CSV" + "Spreadsheet compatible"
   - Excel: table icon + "Excel (.xlsx)" + "Formatted workbook"
   - PDF: document icon + "PDF" + "Print-ready report"
3. **Scope Selection**: 2 cards side by side.
   - "This Month" + current month/year label
   - "All Data" + transaction count label
   - "Custom Range" + date range picker (start/end inputs)
4. **Options Section** (collapsible):
   - "Include summary totals" toggle
   - "Include category breakdown" toggle
   - "Group by date" toggle
5. **Preview Section**: Collapsible card showing first 5 rows of the export in a minimal table. This is the ONLY place a table/grid appears.
6. **Download Button**: Full-width primary button: "Download [Format]"

**Interactions:**
- Format card click: toggles selection (only one active)
- Scope card click: toggles selection. Custom Range reveals date pickers.
- Download: generates file client-side (CSV string / xlsx via SheetJS / PDF via jspdf), triggers browser download, shows success toast.

**Empty state:** If no transactions: "No data to export. Add some transactions first."

**Success state:** Green toast "File downloaded successfully" with filename.

**Responsive:** Format cards stack vertically on mobile. Scope cards stack.

### 4.7 Settings Page (`/settings`)

**Page goal:** App-wide preferences.

**Layout (max-width 640px centered):**

1. **Page Header**: "Settings"
2. **Theme Card**: "Theme" heading. 3 square cards: Sun icon + "Light" | Moon icon + "Dark" | Monitor icon + "System". Active: blue border + blue/5% bg.
3. **Language Card**: "Language" heading. 2 cards: Globe + "English" + "EN" | Globe + "Bahasa Indonesia" + "ID". Active: blue border.
4. **Categories Card**: "Categories & Payment Methods" heading. Full-width outline button linking to `/settings/categories`.
5. **Data Card**: "Data Management" heading. Red destructive button "Clear All Data". Confirmation dialog before clearing.

**Interactions:**
- Theme click: immediately applies (class toggle on html element), persists to store
- Language click: immediately switches all UI text, persists to store
- Clear data: confirmation dialog "Are you sure? This cannot be undone." -> clears store -> reloads page

**Responsive:** Already single-column max-width 640px, works on all sizes.

---

## 5. Transaction Input Experience

### 5.1 Adding a New Expense

**Flow (6 steps, ~15 seconds):**

1. User clicks "Add Transaction" button (or FAB on mobile)
2. Sheet slides in from right. Type defaults to "Expense" (red active state). Amount input is auto-focused.
3. User types amount digits: `850000` -> display shows `850.000` in real-time with Rp prefix
4. User taps date (defaults to today), types description ("Grocery Shopping"), selects category from dropdown ("Food" with amber dot), selects payment method ("Cash")
5. Optionally adds notes
6. Clicks "Save". Sheet closes. Green toast appears. Transaction appears in list/dashboard.

### 5.2 Adding a New Income Entry

**Same flow as expense, except:**
- User clicks "Income" toggle first -> turns green
- Category dropdown shows income categories (Salary, Freelance)
- Amount displays in green
- Saved transaction shows with green + prefix in lists

### 5.3 Selecting or Creating Categories

**In-form:** Dropdown with existing categories (filtered by type). Each option shows color dot + name.

**Creating new:** If no matching category, user goes to Settings > Categories. Adds category with name + color + budget. Returns to transaction form where new category appears in dropdown.

**Future enhancement:** "Create new" option at bottom of dropdown that opens inline creation (name + color picker). Not in V1 to keep scope tight.

### 5.4 Editing Existing Entries

1. User hovers transaction row -> edit icon appears
2. Click edit -> same Sheet slides in, pre-filled with all fields
3. User modifies any field
4. Click "Save" -> updates store -> toast "Transaction updated"

### 5.5 Reviewing Extracted Transaction Data

1. User uploads receipt image on `/upload`
2. After OCR processing, right panel populates with extracted fields
3. Each field has the extracted value pre-filled but is fully editable
4. Amount field: may need correction (OCR can misread dots/commas)
5. Category: auto-suggested if merchant name matches known patterns, otherwise "Select..." placeholder
6. User corrects any fields, selects category and payment method
7. Clicks "Save Transaction" -> creates expense -> success toast -> clears form

---

## 6. Upload & Extraction Flow

### 6.1 Step-by-Step UX Flow

```
[1. UPLOAD]          [2. PROCESSING]       [3. REVIEW]           [4. CONFIRM]
Drop/browse image -> Spinner + progress -> Pre-filled form    -> Save transaction
                     "Extracting..."       with editable fields   Green toast
                     15-30 seconds         User corrects errors   Form clears
```

### 6.2 Detailed States

**State 1: Empty (no image)**
- Drop zone with dashed border, upload icon, instructional text
- Right panel: muted placeholder "Upload and process a receipt to see extracted data"

**State 2: Image Selected (pre-processing)**
- Image preview replaces drop zone
- Two buttons: "Extract Text" (primary) | "Clear" (outline)
- Right panel: still placeholder

**State 3: Processing**
- Image has semi-transparent overlay with spinner
- Progress text: "Extracting text... 42%"
- "Cancel" button available
- Right panel: skeleton loading states for each field

**State 4: Extraction Complete**
- Image overlay removed
- Right panel populates:
  - Confidence bar at top (visual only, based on Tesseract confidence score)
  - Amount: extracted number, formatted, in editable input
  - Description: first meaningful text line
  - Date: extracted date pattern or today's date as fallback
  - Category: auto-matched or empty (user must select)
  - Payment method: defaults to first in list
- All fields editable. Changed fields get a subtle "edited" indicator.

**State 5: Saved**
- Success toast: "Transaction created from receipt"
- Form clears
- Image preview clears
- Returns to State 1

**State Error: OCR Failed**
- Image stays visible
- Error message: "Could not extract text. Try a clearer photo."
- "Retry" button | "Clear" button
- Right panel: empty state message

### 6.3 OCR Processing Details
- **Engine:** Tesseract.js v5 (lazy-loaded via dynamic import)
- **Languages:** `eng+ind` (English + Indonesian)
- **Amount extraction:** Regex patterns for `Rp`, dot/comma separators, plain number sequences
- **Date extraction:** Regex for DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY patterns
- **Category matching:** Compare merchant text against category names and known merchant keywords

---

## 7. Dashboard Experience Detail

### 7.1 Key Summary Cards

| Card | Content | Chart Type | Why This Chart |
|------|---------|-----------|----------------|
| **Net Balance Hero** | Total balance, income chip, expense chip | Animated counter (spring) | Large number is the most important data point. Spring animation draws the eye and provides delight. |
| **Month Selector** | 12 month pills + year nav | Pill grid (no chart) | Month switching is the most frequent interaction. Grid is faster than dropdown. |

### 7.2 Charts

| Widget | Chart Type | Why |
|--------|-----------|-----|
| **Cash Flow** | Area chart (dual series) | Area charts show volume over time. Overlapping income/expense areas reveal surplus/deficit visually. Better than bar chart for continuous daily data. |
| **Category Breakdown** | Donut chart (60% cutout) | Proportional comparison of 4-6 categories. Donut is more modern than pie. Cutout center can show total or be decorative. |
| **Budget Progress** | Horizontal progress bars | Direct comparison of spent vs budget per category. Color-coding (green/amber/red) provides instant status. More scannable than radial gauges. |
| **Payment Methods** | Horizontal bars (normalized) | Relative comparison. Bars normalized to max value show proportional usage clearly. |
| **Savings Goals** | Progress rings (SVG) | Circular progress is visually distinct from the horizontal bars above. Works well for goal-based metrics where 100% is the target. |

### 7.3 Comparison & Trend Widgets

| Widget | Content |
|--------|---------|
| **Income vs Expense chips** | Inside Net Balance Hero. Green chip with TrendingUp icon + income total. Red chip with TrendingDown icon + expense total. Instant comparison. |
| **Budget status labels** | Below each progress bar. "On Track" (green) or "Over Budget -Rp XX" (red). |

### 7.4 Top Category / Source Highlights

Embedded in Category Breakdown donut legend:
- Sorted by amount descending
- Each: color dot + name + percentage
- Top category visually dominant (largest donut segment)

### 7.5 Recent Activity Section

`RecentTransactions` widget:
- Last 5 transactions sorted by date descending
- Each row: category color square (32px) + description + date/category subtitle + signed colored amount
- "View all ->" link in header navigates to /transactions

### 7.6 Quick Actions

- **Bill checkbox toggle**: Directly in BillsChecklist widget. Single tap to mark paid/unpaid.
- **"View all" link**: In RecentTransactions header
- **Month pill click**: In MonthSelector, instantly re-renders all widgets

---

## 8. Export Experience

### 8.1 Supported Formats

| Format | Library | Output |
|--------|---------|--------|
| **CSV** | Native string generation | `.csv` file, UTF-8, comma-separated |
| **Excel** | SheetJS (`xlsx`) | `.xlsx` file with formatted headers, number columns |
| **PDF** | `jspdf` + `jspdf-autotable` | `.pdf` with table, header, totals row |

### 8.2 Scope Options

| Option | Description |
|--------|------------|
| **This Month** | Only transactions for selected month/year |
| **All Data** | Every transaction across all months |
| **Custom Range** | Start date -> end date picker |

### 8.3 Export Options (Toggles)

- **Include Summary**: Adds totals row (total income, total expense, net balance)
- **Include Category Breakdown**: Adds category-level subtotals section
- **Group by Date**: Groups rows under date headers in the output

### 8.4 Preview

A collapsible card below options showing first 5 rows in a minimal HTML table. Columns: Date | Description | Category | Type | Amount | Payment Method.

**This is the ONLY place tabular data appears in the app.** It's a preview of the exported output, not the app's primary data view.

### 8.5 Download Flow

1. User selects format card (blue border on selected)
2. User selects scope (blue border on selected)
3. Optionally toggles options
4. Optionally expands preview
5. Clicks "Download CSV" (button label updates with format name)
6. Browser download triggers
7. Green toast: "transactions-January-2025.csv downloaded"

---

## 9. Design System

### 9.1 Design Principles

1. **Clarity over density.** Every piece of data gets enough space to breathe. No cramming.
2. **Color carries meaning.** Green = income/positive/paid. Red = expense/negative/overdue. Amber = warning. Blue = action/active. Never decorative.
3. **Mono for money.** All currency amounts use JetBrains Mono for tabular alignment and precision feel.
4. **Cards as containers.** Every logical data group lives in a rounded card with consistent padding.
5. **Motion with purpose.** Animations convey state changes and draw attention to important data, never for decoration alone.

### 9.2 Color Palette

```
Semantic Colors:
  Primary:         #2563EB / Blue 600      Actions, active states, links
  Primary Light:   #DBEAFE / Blue 100      Backgrounds, badges, accent areas
  Success:         #059669 / Emerald 600   Income, positive, paid, on-track
  Success Light:   #D1FAE5 / Emerald 100   Income chips, success backgrounds
  Warning:         #D97706 / Amber 600     Budget approaching limit
  Warning Light:   #FEF3C7 / Amber 100     Warning backgrounds
  Danger:          #DC2626 / Red 600       Expenses, over-budget, overdue, delete
  Danger Light:    #FEE2E2 / Red 100       Expense chips, error backgrounds

Surface Colors (Light):
  Background:      #F8FAFC / Slate 50      Page background
  Card:            #FFFFFF                  Card surfaces
  Muted:           #F1F5F9 / Slate 100     Subtle backgrounds, disabled
  Border:          #E2E8F0 / Slate 200     Card borders, dividers
  Text Primary:    #0F172A / Slate 900     Headings, body text
  Text Muted:      #64748B / Slate 500     Subtitles, labels, placeholders

Surface Colors (Dark):
  Background:      #0F172A / Slate 900     Page background
  Card:            #1E293B / Slate 800     Card surfaces
  Muted:           #334155 / Slate 700     Subtle backgrounds
  Border:          #334155 / Slate 700     Borders
  Text Primary:    #F1F5F9 / Slate 100     Headings, body text
  Text Muted:      #94A3B8 / Slate 400     Subtitles, labels

Category Colors:
  Food:            #F59E0B / Amber 500
  Transport:       #3B82F6 / Blue 500
  Utilities:       #8B5CF6 / Violet 500
  Entertainment:   #EC4899 / Pink 500
  Salary:          #10B981 / Emerald 500
  Freelance:       #06B6D4 / Cyan 500
  Other:           #6B7280 / Gray 500
```

### 9.3 Typography Scale

```
Font Families:
  Sans:   "Plus Jakarta Sans", system-ui, sans-serif   (all UI text)
  Mono:   "JetBrains Mono", monospace                  (currency amounts, numbers)

Scale (rem / px):
  xs:     0.75rem  / 12px    Table cells, tiny labels, badges
  sm:     0.875rem / 14px    Body text, form labels, subtitles
  base:   1rem     / 16px    Default body, inputs, buttons
  lg:     1.125rem / 18px    Card titles, section headings
  xl:     1.25rem  / 20px    Page subtitles
  2xl:    1.5rem   / 24px    Page titles
  3xl:    1.875rem / 30px    Large headings
  4xl:    2.25rem  / 36px    Hero balance number

Weights:
  400     Body text, descriptions
  500     Labels, nav items, buttons
  600     Card titles, section headings, table headers
  700     Hero numbers, page titles, emphasis
```

### 9.4 Spacing System

```
Base unit: 4px
Scale:  1(4px) 1.5(6px) 2(8px) 3(12px) 4(16px) 5(20px) 6(24px) 8(32px) 10(40px) 12(48px) 16(64px)

Card padding:        p-6  (24px)
Card padding compact: p-4  (16px)
Section gap:         gap-4 (16px) between cards in grid
Page padding:        px-4 sm:px-6 (16px / 24px)
Form field gap:      space-y-4 (16px)
Inline element gap:  gap-2 (8px) or gap-3 (12px)
```

### 9.5 Border Radius

```
Cards:         rounded-2xl  (16px)    All card containers
Buttons:       rounded-lg   (8px)     Action buttons
Inputs:        rounded-md   (6px)     Form inputs
Badges/Chips:  rounded-full (9999px)  Category chips, month pills
Progress bars: rounded-full (9999px)  Budget/payment method bars
Icons/Avatars: rounded-xl   (12px)    Category icon backgrounds
```

### 9.6 Card & Surface Styles

```css
Standard Card:   bg-card rounded-2xl border border-border p-6
                 (white surface, subtle border, generous padding)

Elevated Card:   + shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200
                 (for interactive cards like format selection)

Compact Widget:  bg-card rounded-2xl border border-border p-4
                 (less padding for dashboard widgets)

Stat Card:       + border-l-4 border-l-[category-color]
                 (left color accent for category-specific stats)

Selected Card:   border-2 border-primary bg-primary/5
                 (for option selection: theme, format, scope)

Glass Navbar:    bg-card/80 backdrop-blur-md border-b border-border
                 (translucent top navigation)
```

### 9.7 Form Styles

```
Input:           h-10 rounded-md border border-input bg-background px-3 text-sm
                 Focus: ring-2 ring-ring ring-offset-2

Select:          Same as input + dropdown chevron

Label:           text-sm font-medium text-foreground mb-1.5

Error text:      text-xs text-destructive mt-1

Segmented Control (Type toggle):
                 flex rounded-lg border border-border p-1
                 Active segment: bg-[type-color] text-white rounded-md
                 Inactive: text-muted-foreground

Amount Input:    text-2xl font-mono font-bold
                 "Rp" prefix in muted text
                 Live dot-separator formatting
```

### 9.8 List Styles

```
Transaction Row:  flex items-center gap-3 rounded-xl p-3
                  hover:bg-muted/30 hover:border-border transition-colors
                  Group-hover reveals action buttons (opacity 0 -> 1)

Category Item:    flex items-center gap-2 rounded-lg p-2
                  hover:bg-muted/50

Bill Item:        flex items-center gap-3 rounded-lg p-2
                  Checkbox + text + amount
                  Checked: line-through text-muted-foreground

Date Group Header: text-xs font-medium text-muted-foreground mb-2
```

### 9.9 Chart Styling

```
Area Chart:
  - Gradient fills: 20% opacity at top -> 0% at bottom
  - Stroke width: 2px
  - Rounded line joins
  - Dashed grid lines (stroke-dasharray: 3 3)
  - Axis labels: 11px, muted foreground color
  - No axis lines (clean look)
  - Tooltip: rounded-xl border shadow, 12px text

Donut Chart:
  - 60% inner radius cutout
  - 2px padding angle between segments
  - No labels on chart (legend below)
  - Tooltip on hover

Progress Bars:
  - 8px height, rounded-full
  - Background: bg-muted (gray track)
  - Fill: category/status color
  - Transition: width 700ms ease-out

Progress Rings:
  - SVG circle, rounded stroke-linecap
  - Background ring: muted/30 opacity
  - Foreground ring: category color
  - Transition: stroke-dashoffset 700ms ease-out
```

### 9.10 Icon Style

```
Library:    Lucide React (consistent with shadcn/ui)
Size:       h-4 w-4 (default), h-5 w-5 (navigation), h-3.5 w-3.5 (compact)
Color:      currentColor (inherits text color)
Stroke:     2px (Lucide default)
Style:      Outline only (no filled icons) for clean, modern feel
```

---

## 10. Motion System

### 10.1 Page Transitions

```
Enter:    opacity: 0 -> 1, y: 8px -> 0, duration: 300ms, ease-out
Exit:     None (instant on navigation for snappy feel)
Trigger:  On route change
```

### 10.2 Modal / Drawer Appearance

```
Sheet (slide-over):
  Enter:  x: 100% -> 0, duration: 300ms, ease: [0.32, 0.72, 0, 1]
  Exit:   x: 0 -> 100%, duration: 200ms, ease: ease-in

Dialog:
  Enter:  opacity: 0 -> 1, scale: 0.95 -> 1, duration: 200ms
  Exit:   opacity: 1 -> 0, scale: 1 -> 0.95, duration: 150ms

Backdrop:
  Enter:  opacity: 0 -> 1, duration: 200ms
  Exit:   opacity: 1 -> 0, duration: 150ms
```

### 10.3 Hover States

```
Buttons:   scale: 0.97 for 100ms on press (whileTap)
Cards:     translateY: -2px, shadow: md -> lg, duration: 200ms
Rows:      background-color transition, 150ms
Icons:     opacity: 0 -> 1 (action icons on row hover)
```

### 10.4 Dashboard Card Stagger

```
Container: staggerChildren: 60ms
Each card: opacity: 0 -> 1, y: 12px -> 0, duration: 400ms, ease-out
Trigger:   On mount / month change
```

### 10.5 Animated Counter (Balance)

```
Type:     Framer Motion useSpring
Config:   stiffness: 100, damping: 30
Duration: ~800ms (spring-determined)
Display:  Formatted IDR string updates on each spring frame
Trigger:  On mount, on value change (month switch)
```

### 10.6 Upload Processing Feedback

```
Spinner:  Continuous rotation, 1s per cycle
Progress: Width transition on progress bar, 200ms ease-out
Complete: Checkmark icon with scale: 0 -> 1, spring bounce
Error:    Shake animation (x: [-4, 4, -4, 4, 0], 400ms)
```

### 10.7 Chart Transitions

```
Area chart enter:  clipPath wipe from left to right, 600ms
Donut segments:    strokeDashoffset transition, 800ms each, 50ms stagger
Progress bars:     width: 0% -> target%, 700ms ease-out
Progress rings:    strokeDashoffset: full -> target, 700ms ease-out
```

### 10.8 Success Feedback

```
Toast:    Slide in from top-right (y: -16px -> 0, opacity: 0 -> 1)
          Auto-dismiss after 3 seconds (opacity: 1 -> 0, y: 0 -> -8px)
Save:     Button shows checkmark briefly (200ms) before closing panel
Checkbox: Scale: 1 -> 1.1 -> 1 bounce on check (200ms)
```

---

## 11. Bilingual UX Behavior

### 11.1 Language Switcher Placement

- **Settings page**: Primary toggle (2 cards: English | Bahasa Indonesia)
- **Desktop navbar** (right side): Compact pill toggle "EN | ID" for quick switching
- **Mobile**: Only in settings page (saves nav bar space)

### 11.2 Implementation Details

- All UI strings stored in a single `i18n.ts` file with typed keys
- `LocaleContext` provides current locale to all components
- `t(locale, key)` function returns the translated string
- Language change: instant (no reload), updates context, persists to Zustand store
- **Fallback**: If a key is missing in ID, falls back to EN string

### 11.3 What Gets Translated

- Navigation labels
- Page titles and descriptions
- Button labels
- Form labels and placeholders
- Validation error messages
- Empty state titles and descriptions
- Success/error toast messages
- Chart axis labels and tooltips

### 11.4 What Does NOT Get Translated

- User-entered data (transaction descriptions, category names, notes)
- Currency format (always IDR with id-ID number formatting)
- Date format (follows locale: "5 Jan 2025" vs "5 Jan 2025")

### 11.5 Sample Microcopy

**Add Transaction:**
- EN: "Add Transaction"
- ID: "Tambah Transaksi"

**Upload Receipt:**
- EN: "Upload Receipt" / "Drop receipt image here" / "or click to browse"
- ID: "Unggah Struk" / "Letakkan gambar struk di sini" / "atau klik untuk memilih"

**Export Report:**
- EN: "Export Data" / "Download CSV"
- ID: "Ekspor Data" / "Unduh CSV"

**Empty Transaction State:**
- EN: "No transactions yet" / "Add your first transaction to get started"
- ID: "Belum ada transaksi" / "Tambahkan transaksi pertama Anda"

**Validation Error:**
- EN: "Amount is required" / "Please select a category"
- ID: "Jumlah wajib diisi" / "Silakan pilih kategori"

**Successful Save:**
- EN: "Transaction saved successfully"
- ID: "Transaksi berhasil disimpan"

---

## 12. Frontend Component Architecture

### 12.1 Page-Level Components

```
app/page.tsx                      -> DashboardPage (client component, assembles widgets)
app/transactions/page.tsx         -> TransactionsPage (client, list + filters + sheet)
app/transactions/new/page.tsx     -> NewTransactionPage (client, standalone form)
app/upload/page.tsx               -> UploadPage (client, drop zone + OCR + review form)
app/export/page.tsx               -> ExportPage (client, format/scope selection + download)
app/settings/page.tsx             -> SettingsPage (client, theme/language/data toggles)
app/settings/categories/page.tsx  -> CategoriesPage (client, CRUD lists + forms)
app/layout.tsx                    -> RootLayout (server, fonts + providers + nav)
```

### 12.2 Reusable UI Components (shadcn/ui)

```
components/ui/
  button.tsx          Badge.tsx           card.tsx
  checkbox.tsx        dialog.tsx          dropdown-menu.tsx
  input.tsx           label.tsx           progress.tsx
  select.tsx          separator.tsx       sheet.tsx
  tabs.tsx            tooltip.tsx         toast.tsx (to add)
  toaster.tsx (to add)
```

### 12.3 Layout Components

```
components/layout/
  Navbar.tsx          Desktop horizontal top nav
  BottomNav.tsx       Mobile bottom tab bar
  PageHeader.tsx      Title + description + action slot
```

### 12.4 Dashboard Feature Module

```
components/dashboard/
  NetBalanceCard.tsx       Hero balance with animated counter
  MonthSelector.tsx        Month pill grid with year nav
  CashFlowChart.tsx        Recharts dual area chart
  CategoryBreakdown.tsx    Recharts donut + legend
  BudgetProgress.tsx       Progress bars per category
  PaymentMethods.tsx       Horizontal bar summary
  BillsChecklist.tsx       Interactive checkbox list
  SavingsGoals.tsx         Progress ring indicators
  RecentTransactions.tsx   Mini transaction list
```

### 12.5 Transaction Feature Module

```
components/transactions/
  TransactionTable.tsx     Date-grouped list with action buttons
  TransactionForm.tsx      Add/edit form (used in Sheet and standalone)
  TransactionFilters.tsx   Search + type toggle + category dropdown
  CategoryChip.tsx         Colored category badge
  TransactionSummary.tsx   Income/expense/net summary strip (to add)
```

### 12.6 Upload/OCR Feature Module

```
components/upload/
  DropZone.tsx             Drag-and-drop area (to extract from page)
  OcrPreview.tsx           Extracted fields review form (to extract)
  ProcessingOverlay.tsx    Spinner + progress on image (to add)
  ConfidenceBar.tsx        Visual confidence indicator (to add)
```

### 12.7 Export Feature Module

```
components/export/
  FormatCard.tsx           Selectable format option card (to add)
  ScopeSelector.tsx        Month/all/range selection (to add)
  ExportOptions.tsx        Toggle options (to add)
  ExportPreview.tsx        Minimal table preview (to add)
```

### 12.8 Shared Components

```
components/shared/
  AmountDisplay.tsx        Formatted IDR with color by type
  AnimatedCounter.tsx      Framer Motion spring number animation
  ProgressRing.tsx         SVG circular progress indicator
  EmptyState.tsx           Centered icon + title + description
  LoadingSkeleton.tsx      Pulse animation placeholder
  Toast.tsx (to add)       Success/error notification
```

### 12.9 Providers

```
components/providers/
  StoreProvider.tsx         Zustand hydration + theme + locale context
```

---

## 13. Folder Structure

```
financial-tracker/
  .github/
    workflows/
      deploy-pages.yml              # GitHub Pages CI/CD
  data/
    workbook.json                    # Source spreadsheet data (12 months)
  public/
    favicon.ico
  scripts/
    extract_xlsx.py                  # XLSX -> JSON pipeline
  src/
    app/
      globals.css                    # Tailwind v4 + design tokens + custom vars
      layout.tsx                     # Root layout (fonts, providers, nav)
      page.tsx                       # Dashboard
      transactions/
        page.tsx                     # Transaction list
        new/
          page.tsx                   # Add transaction (standalone)
      upload/
        page.tsx                     # OCR upload
      export/
        page.tsx                     # Export center
      settings/
        page.tsx                     # General settings
        categories/
          page.tsx                   # Category/payment method management
    components/
      ui/                            # shadcn/ui primitives (14+ components)
      layout/
        Navbar.tsx
        BottomNav.tsx
        PageHeader.tsx
      dashboard/
        NetBalanceCard.tsx
        MonthSelector.tsx
        CashFlowChart.tsx
        CategoryBreakdown.tsx
        BudgetProgress.tsx
        PaymentMethods.tsx
        BillsChecklist.tsx
        SavingsGoals.tsx
        RecentTransactions.tsx
      transactions/
        TransactionTable.tsx
        TransactionForm.tsx
        TransactionFilters.tsx
        TransactionSummary.tsx
        CategoryChip.tsx
      upload/
        DropZone.tsx
        OcrPreview.tsx
        ProcessingOverlay.tsx
        ConfidenceBar.tsx
      export/
        FormatCard.tsx
        ScopeSelector.tsx
        ExportOptions.tsx
        ExportPreview.tsx
      shared/
        AmountDisplay.tsx
        AnimatedCounter.tsx
        ProgressRing.tsx
        EmptyState.tsx
        LoadingSkeleton.tsx
      providers/
        StoreProvider.tsx
    lib/
      types.ts                       # TypeScript interfaces
      constants.ts                   # Colors, defaults, nav items
      formatters.ts                  # Currency/date/number formatting
      calculations.ts                # Financial computation functions
      storage.ts                     # localStorage helpers
      data-migration.ts              # workbook.json -> typed objects
      i18n.ts                        # EN/ID translations + context
      export-utils.ts                # CSV/Excel/PDF generation (to add)
      utils.ts                       # cn() utility (shadcn)
    store/
      index.ts                       # Zustand store with all slices
      selectors.ts                   # Memoized computed selectors
    data/
      sample-data.ts                 # Workbook migration entry point
  components.json                    # shadcn/ui config
  eslint.config.mjs
  next.config.ts                     # output: 'export'
  package.json
  postcss.config.mjs
  tsconfig.json
  BLUEPRINT.md                       # This document
  Plan.md                            # Implementation checklist
  README.md                          # Project overview
```

---

## 14. Implementation Roadmap

### Phase 1: Core Structure
**Scope:** Project scaffold, design system, data layer, navigation, page shells.

| Deliverable | Status | Priority |
|-------------|--------|----------|
| Next.js 16 + TypeScript + Tailwind v4 + static export | Done | P0 |
| shadcn/ui initialization + base components | Done | P0 |
| Plus Jakarta Sans + JetBrains Mono fonts | Done | P0 |
| Custom color palette in globals.css | Done | P0 |
| Zustand store with all slices + persistence | Done | P0 |
| Data migration from workbook.json | Done | P0 |
| i18n system (EN/ID) | Done | P0 |
| Root layout with Navbar + BottomNav | Done | P0 |
| All page route files with PageHeader | Done | P0 |
| StoreProvider (theme + locale + data seed) | Done | P0 |
| GitHub Actions workflow updated | Done | P0 |

**Dependencies:** None (first phase).

### Phase 2: Dashboard Analytics
**Scope:** All 9 bento dashboard widgets with real data from store.

| Deliverable | Status | Priority |
|-------------|--------|----------|
| NetBalanceCard with AnimatedCounter | Done | P0 |
| MonthSelector (pill grid + year nav) | Done | P0 |
| CashFlowChart (Recharts area chart) | Done | P0 |
| CategoryBreakdown (donut + legend) | Done | P0 |
| BudgetProgress (color-coded bars) | Done | P0 |
| PaymentMethodsSummary (horizontal bars) | Done | P0 |
| BillsChecklist (interactive checkboxes) | Done | P0 |
| SavingsGoals (progress rings) | Done | P0 |
| RecentTransactions (mini list) | Done | P0 |
| Responsive 3/2/1 column bento grid | Done | P0 |
| Framer Motion stagger animations | Done | P0 |
| Empty states for all widgets | Done | P1 |
| Dark mode for all widgets | Done | P1 |

**Dependencies:** Phase 1 complete.

### Phase 3: Transaction Management
**Scope:** Full transaction CRUD with filters, search, and form.

| Deliverable | Status | Priority |
|-------------|--------|----------|
| TransactionFilters (search, type, category) | Done | P0 |
| TransactionTable (date-grouped, action buttons) | Done | P0 |
| TransactionForm (type toggle, amount, all fields) | Done | P0 |
| TransactionSummary strip (income/expense/net) | Done | P0 |
| Sheet slide-over for add/edit | Done | P0 |
| Delete with confirmation | Done | P0 |
| CategoryChip (colored badge) | Done | P0 |
| Toast notifications for save/delete | Pending | P1 |
| Payment method filter | Pending | P2 |
| Description autocomplete | Pending | P2 |

**Dependencies:** Phase 1 store + selectors.

### Phase 4: Upload & Extraction
**Scope:** OCR receipt processing pipeline.

| Deliverable | Status | Priority |
|-------------|--------|----------|
| DropZone component (drag-and-drop + file input) | Done | P0 |
| Image preview | Done | P0 |
| Tesseract.js integration (lazy-loaded) | Done | P0 |
| Amount/date/description extraction | Done | P0 |
| Review form with pre-filled fields | Done | P0 |
| Save as transaction | Done | P0 |
| Extract into separate DropZone/OcrPreview components | Pending | P1 |
| ProcessingOverlay component | Pending | P1 |
| ConfidenceBar component | Pending | P1 |
| Category auto-suggestion from merchant text | Pending | P2 |
| Upload history list | Pending | P2 |

**Dependencies:** Phase 3 TransactionForm pattern.

### Phase 5: Export System
**Scope:** Multi-format data export.

| Deliverable | Status | Priority |
|-------------|--------|----------|
| CSV export (string generation) | Done | P0 |
| JSON export | Done | P0 |
| Scope selector (month/all) | Done | P0 |
| Install SheetJS (xlsx) for Excel export | Pending | P1 |
| Excel export with formatted headers | Pending | P1 |
| Install jspdf + jspdf-autotable for PDF | Pending | P1 |
| PDF export with styled table | Pending | P1 |
| Custom date range picker | Pending | P1 |
| Export options toggles (summary, categories) | Pending | P2 |
| Export preview table | Pending | P2 |
| Extract into FormatCard/ScopeSelector components | Pending | P2 |

**Dependencies:** Phase 1 store.

### Phase 6: Localization & Polish
**Scope:** Complete bilingual support, accessibility, performance.

| Deliverable | Status | Priority |
|-------------|--------|----------|
| EN/ID translation dictionary | Done | P0 |
| Language toggle in settings | Done | P0 |
| Theme toggle (Light/Dark/System) | Done | P0 |
| Quick language switcher in navbar | Pending | P1 |
| Expanded i18n coverage (validation, toasts) | Pending | P1 |
| Toast/Toaster component (shadcn) | Pending | P1 |
| Skeleton loading states for all pages | Pending | P1 |
| Accessibility audit (ARIA, keyboard, contrast) | Pending | P1 |
| Meta tags, OG tags | Pending | P2 |
| Performance audit (lazy-load heavy pages) | Pending | P2 |
| Error boundaries | Pending | P2 |

**Dependencies:** All prior phases.

---

## 15. Main Dashboard Blueprint

This is the exact layout specification a frontend engineer should follow for `src/app/page.tsx`.

### Page Container

```
<main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {/* Widgets placed here */}
  </div>
</main>
```

### Row 1: Hero + Month Selector

```
Column 1-2 (sm:col-span-2): NetBalanceCard
  ┌─────────────────────────────────────────────────────────┐
  │  Net Balance - January 2025           ○ (decorative)    │
  │                                      ○                  │
  │  Rp 8.206.000                                           │
  │  ^^^^^^^^^^^^^ 36px, mono, bold, spring-animated        │
  │                                                         │
  │  [↑ Rp 11.000.000]  [↓ Rp 2.794.000]                   │
  │   green chip          red chip                          │
  └─────────────────────────────────────────────────────────┘

Column 3 (1-col): MonthSelector
  ┌───────────────────────┐
  │    < 2025 >           │
  │                       │
  │  [Jan] [Feb] [Mar] [Apr]  │
  │  [May] [Jun] [Jul] [Aug]  │
  │  [Sep] [Oct] [Nov] [Dec]  │
  │                       │
  │  Active = blue fill   │
  └───────────────────────┘
```

### Row 2: Cash Flow + Category Donut

```
Column 1-2 (sm:col-span-2): CashFlowChart
  ┌─────────────────────────────────────────────────────────┐
  │  Cash Flow                                              │
  │                                                         │
  │  Rp 10M ┤                                               │
  │         │    ╱╲  green area (income)                     │
  │  Rp 5M  ┤   ╱  ╲───────                                 │
  │         │  ╱     red area (expense)                      │
  │  Rp 0   ┤─╱──────────────────────────                    │
  │         1   5   10   15   20   25   28                  │
  └─────────────────────────────────────────────────────────┘

Column 3 (1-col): CategoryBreakdown
  ┌───────────────────────┐
  │  Category Breakdown   │
  │                       │
  │       ┌──────┐        │
  │      │ ○○○○ │        │
  │      │ donut │        │
  │       └──────┘        │
  │                       │
  │  ● Food         38%  │
  │  ● Transport    12%  │
  │  ● Utilities    32%  │
  │  ● Entertainment 18% │
  └───────────────────────┘
```

### Row 3: Budget Progress + Payment Methods

```
Column 1-2 (sm:col-span-2): BudgetProgress
  ┌─────────────────────────────────────────────────────────┐
  │  Budget Progress                                        │
  │                                                         │
  │  ● Food         Rp 960.000 / Rp 1.500.000              │
  │  [████████████░░░░░░░░░] 64% green                      │
  │                                                         │
  │  ● Transport    Rp 185.000 / Rp 800.000                 │
  │  [█████░░░░░░░░░░░░░░░░] 23% green                      │
  │                                                         │
  │  ● Utilities    Rp 999.000 / Rp 1.000.000               │
  │  [██████████████████░░] 99% amber                       │
  │                                                         │
  │  ● Entertainment Rp 350.000 / Rp 500.000                │
  │  [██████████████░░░░░░] 70% green                       │
  └─────────────────────────────────────────────────────────┘

Column 3 (1-col): PaymentMethodsSummary
  ┌───────────────────────┐
  │  Payment Methods      │
  │                       │
  │  Bank BCA  Rp 1.6M    │
  │  [████████████████]   │
  │  Cash      Rp 685K    │
  │  [███████░░░░░░░░]    │
  │  GoPay     Rp 175K    │
  │  [███░░░░░░░░░░░░]    │
  │  OVO       Rp 35K     │
  │  [█░░░░░░░░░░░░░░]    │
  └───────────────────────┘
```

### Row 4: Bills + Savings + Recent Transactions

```
Column 1 (1-col): BillsChecklist
  ┌───────────────────────┐
  │  Bills Checklist      │
  │                       │
  │  ☑ Electricity (PLN)  │
  │    Due: 5  Rp 350.000 │
  │  ☑ Internet           │
  │    Due: 10 Rp 399.000 │
  │  ☑ Water (PDAM)       │
  │    Due: 15 Rp 150.000 │
  │  ☐ Rent               │
  │    Due: 1  Rp 2.000.000│
  │  ☐ Insurance          │
  │    Due: 25 Rp 500.000 │
  └───────────────────────┘

Column 2 (1-col): SavingsGoals
  ┌───────────────────────┐
  │  Savings Goals        │
  │                       │
  │  (24%) Emergency Fund │
  │  ◐    Rp 12M of 50M  │
  │                       │
  │  (23%) Vacation       │
  │  ◐    Rp 3.5M of 15M │
  └───────────────────────┘

Column 3 (1-col): RecentTransactions
  ┌───────────────────────┐
  │  Recent Tx  View all→ │
  │                       │
  │  [■] Water Bill       │
  │      28 Jan · Util.   │
  │          -Rp 150.000  │
  │  [■] Online Shopping  │
  │      25 Jan · Ent.    │
  │          -Rp 250.000  │
  │  [■] Phone Credit     │
  │      20 Jan · Util.   │
  │          -Rp 100.000  │
  │  ...                  │
  └───────────────────────┘
```

### Responsive Breakpoints

```
>= 1024px (lg):  3 columns  |  Hero spans 2, chart spans 2, budget spans 2
768-1023px (sm): 2 columns  |  Hero spans 2, chart spans 2, budget spans 2, last row 2+1
< 768px:         1 column   |  Everything stacks vertically, bottom nav visible
```

### Animation Sequence on Page Load

```
0ms:    Page container fades in (opacity 0->1, y:8->0, 300ms)
0ms:    NetBalanceCard appears (opacity 0->1, y:12->0, 400ms)
60ms:   MonthSelector appears
120ms:  CashFlowChart appears + area chart clip-path wipe (600ms)
180ms:  CategoryBreakdown appears + donut segments animate in (800ms)
240ms:  BudgetProgress appears + bars animate width (700ms)
300ms:  PaymentMethods appears + bars animate
360ms:  BillsChecklist appears
420ms:  SavingsGoals appears + rings animate
480ms:  RecentTransactions appears
~800ms: AnimatedCounter reaches final balance value (spring)
```

### Dark Mode Appearance

All cards: `bg-slate-800` surface, `border-slate-700`, `text-slate-100` text. Chart grid lines: `stroke-slate-700`. Chips use same semantic colors with `/40` dark opacity variants (e.g., `bg-emerald-950/40`). Progress bar tracks: `bg-slate-700`.

---

*End of Blueprint*

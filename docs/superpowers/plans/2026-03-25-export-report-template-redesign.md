# Export & Report Template Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign all downloadable XLSX and PDF outputs to match the user's Excel template, with Chart.js-rendered donut, cashflow, and pie charts embedded as images.

**Architecture:** Replace SheetJS with ExcelJS (for image embedding), add `chart.js` for off-screen canvas chart rendering. A new `chart-renderer.ts` module produces PNG base64 strings consumed by both `report-generator.ts` (reports page) and `export-utils.ts` (export page). All generation stays client-side; no backend changes.

**Tech Stack:** ExcelJS (XLSX write + image embedding), Chart.js (canvas chart rendering), jsPDF + jspdf-autotable (PDF), dynamic imports for bundle splitting.

**Spec:** `docs/superpowers/specs/2026-03-25-export-report-template-redesign-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/lib/chart-renderer.ts` | Render donut, cashflow, pie charts to PNG base64 |
| Modify | `src/lib/types.ts` | Add `ExportReportInput`; remove `includeSummary` from `ExportState` |
| Modify | `src/lib/formatters.ts` | Add `formatDateID` and `formatDatetimeID` (Indonesian date helpers shared by both generators) |
| Modify | `src/features/export/ExportOptions.tsx` | Remove `includeSummary` from `ExportOptionsState` and UI |
| Modify | `src/features/reports/report-generator.ts` | Full rewrite: ExcelJS template layout + embedded charts |
| Modify | `src/features/reports/useReportData.ts` | `await` async generator calls |
| Modify | `src/lib/export-utils.ts` | New `exportExcel(ExportReportInput)` and `exportPDF(ExportReportInput)` |
| Modify | `src/features/export/useExport.ts` | Build `ExportReportInput`, fetch bills for monthly scope |
| Modify | `package.json` | Add `exceljs`, `chart.js`; remove `xlsx` |

> **Architectural note:** `formatDateID` and `formatDatetimeID` live in `src/lib/formatters.ts` (lib layer). Both `report-generator.ts` and `export-utils.ts` import from there. `export-utils.ts` must never import from `src/features/` — lib files cannot depend on feature modules.

---

## Task 1: Install and Remove Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install new packages and uninstall xlsx**

```bash
cd "D:\VsCode\Financial Tracker\Financial-Tracker-V.02"
npm install exceljs chart.js
npm uninstall xlsx
```

Expected: No errors. `package.json` now has `exceljs` and `chart.js` in `dependencies`; `xlsx` is gone.

- [ ] **Step 2: Run existing test suite to confirm baseline is green**

```bash
npm run test
```

Expected: 312 tests pass. (No source files changed yet.)

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: replace xlsx with exceljs, add chart.js for template redesign"
```

---

## Task 2: Create `src/lib/chart-renderer.ts`

**Files:**
- Create: `src/lib/chart-renderer.ts`

This module renders three Chart.js charts to off-screen canvas elements and returns base64 PNG data URLs. It must only be called from client-side code (hooks/callbacks) — never from Server Components or API routes. All Chart.js imports are dynamic to avoid polluting the server bundle.

- [ ] **Step 1: Create the file**

```typescript
// src/lib/chart-renderer.ts
// CLIENT-ONLY — never import from Server Components or API routes.
// All chart.js imports are dynamic so this module is safe to import in hooks.

const PIE_COLORS = [
  '#2563eb',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#84cc16',
  '#ec4899',
];

function formatAmountShort(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}M`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}jt`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}rb`;
  return `${sign}${abs}`;
}

/**
 * Renders a doughnut chart of income vs expense.
 * Center label shows net balance via a custom afterDraw plugin.
 * Returns a base64 PNG data URL.
 */
export async function renderDonutChart(income: number, expense: number): Promise<string> {
  const { Chart } = await import('chart.js/auto');
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 300;
  const ctx = canvas.getContext('2d')!;
  const net = income - expense;

  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Pemasukan', 'Pengeluaran'],
      datasets: [
        {
          data: [income, expense],
          backgroundColor: ['#10b981', '#ef4444'],
          borderWidth: 2,
          borderColor: '#ffffff',
        },
      ],
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 } } },
      },
    },
    plugins: [
      {
        id: 'centerLabel',
        afterDraw(ch) {
          const {
            ctx: c,
            chartArea: { left, right, top, bottom },
          } = ch;
          const cx = (left + right) / 2;
          const cy = (top + bottom) / 2;
          c.save();
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.font = 'bold 13px sans-serif';
          c.fillStyle = net >= 0 ? '#10b981' : '#ef4444';
          c.fillText('Saldo', cx, cy - 9);
          c.font = 'bold 12px sans-serif';
          c.fillText(formatAmountShort(net), cx, cy + 9);
          c.restore();
        },
      },
    ],
  });

  const dataUrl = canvas.toDataURL('image/png');
  chart.destroy();
  return dataUrl;
}

/**
 * Renders a horizontal bar chart showing income, expense, and net (cashflow).
 * Bar colour for Saldo is blue (positive) or amber (negative).
 * Returns a base64 PNG data URL.
 */
export async function renderCashflowChart(
  income: number,
  expense: number,
  net: number
): Promise<string> {
  const { Chart } = await import('chart.js/auto');
  const canvas = document.createElement('canvas');
  canvas.width = 500;
  canvas.height = 200;
  const ctx = canvas.getContext('2d')!;

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Pemasukan', 'Pengeluaran', 'Saldo'],
      datasets: [
        {
          data: [income, expense, Math.abs(net)],
          backgroundColor: ['#10b981', '#ef4444', net >= 0 ? '#2563eb' : '#f59e0b'],
          borderWidth: 0,
          borderRadius: 4,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            callback: (v) => formatAmountShort(Number(v)),
            font: { size: 10 },
          },
        },
        y: { ticks: { font: { size: 11 } } },
      },
    },
  });

  const dataUrl = canvas.toDataURL('image/png');
  chart.destroy();
  return dataUrl;
}

/**
 * Renders a pie chart of expense categories.
 * Top 8 categories shown; the rest summed as "Lainnya".
 * Empty input renders a single grey "Tidak ada data" segment.
 * Returns a base64 PNG data URL.
 */
export async function renderExpensePieChart(
  categories: { category: string; total: number }[]
): Promise<string> {
  const { Chart } = await import('chart.js/auto');
  const canvas = document.createElement('canvas');
  canvas.width = 420;
  canvas.height = 300;
  const ctx = canvas.getContext('2d')!;

  let labels: string[];
  let data: number[];
  let colors: string[];

  if (categories.length === 0) {
    labels = ['Tidak ada data'];
    data = [1];
    colors = ['#d1d5db'];
  } else {
    const sorted = [...categories].sort((a, b) => b.total - a.total);
    const top8 = sorted.slice(0, 8);
    const rest = sorted.slice(8).reduce((s, c) => s + c.total, 0);
    labels = [...top8.map((c) => c.category), ...(rest > 0 ? ['Lainnya'] : [])];
    data = [...top8.map((c) => c.total), ...(rest > 0 ? [rest] : [])];
    colors = labels.map((_, i) => PIE_COLORS[i % PIE_COLORS.length]);
  }

  const chart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 1, borderColor: '#ffffff' }],
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { font: { size: 10 }, boxWidth: 12, padding: 8 },
        },
      },
    },
  });

  const dataUrl = canvas.toDataURL('image/png');
  chart.destroy();
  return dataUrl;
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: No errors in `chart-renderer.ts`. (If `chart.js/auto` types are missing, run `npm install --save-dev @types/chart.js` — but `chart.js` v4 ships its own types, so this shouldn't be needed.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/chart-renderer.ts
git commit -m "feat: add chart-renderer module (donut, cashflow, pie to PNG base64)"
```

---

## Task 3: Remove `includeSummary` Flag

**Files:**
- Modify: `src/lib/types.ts` (line 153)
- Modify: `src/features/export/ExportOptions.tsx` (lines 7–9, 22–31)
- Modify: `src/features/export/useExport.ts` (lines 50–53, 117–118, 121–126, 152)

The new template always includes the summary panel, so this flag is retired.

- [ ] **Step 1: Remove `includeSummary` from `ExportState` in `src/lib/types.ts`**

Find and remove the `includeSummary: boolean;` line from the `ExportState` interface (around line 153). The interface should become:

```typescript
export interface ExportState {
  format: ExportFormat;
  scope: ExportScope;
  groupByDate: boolean;
  startDate?: string;
  endDate?: string;
}
```

- [ ] **Step 2: Remove `includeSummary` from `ExportOptionsState` and UI in `src/features/export/ExportOptions.tsx`**

Replace the entire file contents with:

```typescript
'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { t, useLocale } from '@/lib/i18n';

export interface ExportOptionsState {
  groupByDate: boolean;
}

interface ExportOptionsProps {
  options: ExportOptionsState;
  onChange: (options: ExportOptionsState) => void;
}

export function ExportOptions({ options, onChange }: ExportOptionsProps) {
  const locale = useLocale();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Checkbox
          id="group-by-date"
          checked={options.groupByDate}
          onCheckedChange={(checked) => onChange({ ...options, groupByDate: checked === true })}
        />
        <Label htmlFor="group-by-date" className="cursor-pointer text-sm">
          {t(locale, 'groupByDate')}
        </Label>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Remove `includeSummary` from `useExport.ts`**

In `src/features/export/useExport.ts`, make these changes:

1. Change the initial `options` state (line 50–53) from:
```typescript
const [options, setOptions] = useState<ExportOptionsState>({
  includeSummary: false,
  groupByDate: false,
});
```
to:
```typescript
const [options, setOptions] = useState<ExportOptionsState>({
  groupByDate: false,
});
```

2. Remove `options.includeSummary` from the `handleExport` `useCallback` dependency array (line 152).

3. Remove `options.includeSummary` from the `exportExcel` and `exportPDF` call arguments (lines 117–126) — these will be updated with the new signature in Task 9, so for now leave them as compile errors if needed, or pass a placeholder. **Note:** The actual fix to these call sites happens in Task 9. Do not commit with compile errors — skip this sub-step if it causes type errors and revisit in Task 9.

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: Errors only in `useExport.ts` where `exportExcel`/`exportPDF` are called with old signature — those are expected and will be fixed in Task 9. All other files should be clean.

- [ ] **Step 5: Commit — `types.ts` and `ExportOptions.tsx` only**

> **Important:** Do NOT stage `useExport.ts` here. The `useExport.ts` partial change from Step 3 (removing `includeSummary` from state) will be folded into the Task 8 commit that rewrites the whole `handleExport` callback. Committing `useExport.ts` now would leave the branch in a non-typechecking state.

```bash
git add src/lib/types.ts src/features/export/ExportOptions.tsx
git commit -m "refactor: retire includeSummary flag from export options"
```

---

## Task 4: Add `ExportReportInput` Interface

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add `ExportReportInput` after the `ExportState` interface in `src/lib/types.ts`**

Add this block immediately after `ExportState`:

```typescript
export interface ExportReportInput {
  /** Human-readable scope label, e.g. "Januari 2026" or "Jan 2025 – Mar 2026" */
  scopeLabel: string;
  /** All transactions in scope */
  transactions: Transaction[];
  /** Sum of all income transactions */
  totalIncome: number;
  /** Sum of all expense transactions */
  totalExpense: number;
  /** totalIncome − totalExpense */
  totalAssets: number;
  /** Grouped income totals by category string */
  incomeCategories: { category: string; total: number }[];
  /** Grouped expense totals by category string (used for Rekap Pengeluaran + pie chart) */
  expenseCategories: { category: string; total: number }[];
  /**
   * Net balance per payment method over the selected scope.
   * Computed as: Σ income txs − Σ expense txs, grouped by tx.paymentMethod.
   * Section header reads "Saldo (periode ini)" to indicate this is not an all-time balance.
   */
  paymentMethodBalances: { name: string; balance: number }[];
  /**
   * Bills from REST API. Only populated for single-month (current) scope.
   * Empty array for annual or multi-month range exports.
   */
  bills: Bill[];
  /** Download filename including extension, e.g. "transactions-Januari-2026.xlsx" */
  filename: string;
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add ExportReportInput interface to types"
```

---

## Task 4b: Add Date Format Helpers to `src/lib/formatters.ts`

**Files:**
- Modify: `src/lib/formatters.ts`

`formatDateID` and `formatDatetimeID` are pure utilities used by both `report-generator.ts` and `export-utils.ts`. They belong in the lib layer, not in a feature module.

- [ ] **Step 1: Add to the bottom of `src/lib/formatters.ts`**

```typescript
const MONTH_NAMES_ID_FMT = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const DAY_NAMES_ID_FMT = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/** Format an ISO date string as "1 Januari 2026" */
export function formatDateID(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${day} ${MONTH_NAMES_ID_FMT[month - 1]} ${year}`;
}

/** Format a Date as "Senin, 1 Januari 2026, 14.30.00" */
export function formatDatetimeID(date: Date): string {
  const day = DAY_NAMES_ID_FMT[date.getDay()];
  const d = date.getDate();
  const m = MONTH_NAMES_ID_FMT[date.getMonth()];
  const y = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${day}, ${d} ${m} ${y}, ${hh}.${mm}.${ss}`;
}

/** Month names in Indonesian (0-based: 0 = Januari) */
export const MONTH_NAMES_ID = MONTH_NAMES_ID_FMT;
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/formatters.ts
git commit -m "feat: add formatDateID, formatDatetimeID, MONTH_NAMES_ID to formatters"
```

---

## Task 5: Rewrite `generateMonthlyReport` in `report-generator.ts`

**Files:**
- Modify: `src/features/reports/report-generator.ts`
- Modify: `src/features/reports/useReportData.ts` (line 42)

Replace the SheetJS monthly generator with an ExcelJS version that matches the template layout and embeds chart images.

- [ ] **Step 1: Replace the entire contents of `src/features/reports/report-generator.ts`**

```typescript
// src/features/reports/report-generator.ts
// CLIENT-ONLY — called from useReportData.ts hooks only.
import type { MonthlyReportData, AnnualReportData } from '@/lib/api/contracts';
import {
  renderDonutChart,
  renderCashflowChart,
  renderExpensePieChart,
} from '@/lib/chart-renderer';
import { formatDateID, formatDatetimeID, MONTH_NAMES_ID } from '@/lib/formatters';

const CURRENCY_FMT = '"Rp"#,##0';

function stripBase64Prefix(dataUrl: string): string {
  return dataUrl.split(',')[1] ?? dataUrl;
}

async function triggerXlsxDownload(workbook: import('exceljs').Workbook, filename: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Monthly Report ───────────────────────────────────────────────────────────

export async function generateMonthlyReport(data: MonthlyReportData): Promise<void> {
  // 1. Render charts (failures are silent — chart slot is skipped)
  const [donutPng, cashflowPng, piePng] = await Promise.all([
    renderDonutChart(data.totalIncome, data.totalExpense).catch(() => null),
    renderCashflowChart(
      data.totalIncome,
      data.totalExpense,
      data.totalIncome - data.totalExpense
    ).catch(() => null),
    renderExpensePieChart(data.expenseCategories).catch(() => null),
  ]);

  // 2. Build workbook
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Monthly Report');

  // Column widths (A=1 in ExcelJS)
  ws.columns = [
    { width: 3 },  // A – spacer
    { width: 28 }, // B – left panel labels
    { width: 14 }, // C – left panel amounts
    { width: 28 }, // D – left panel labels (expense col)
    { width: 14 }, // E – left panel amounts (expense col)
    { width: 6 },  // F – No (income)
    { width: 14 }, // G – Tanggal (income)
    { width: 18 }, // H – Jumlah (income)
    { width: 22 }, // I – Kategori (income)
    { width: 18 }, // J – Method (income)
    { width: 3 },  // K – spacer
    { width: 6 },  // L – No (expense)
    { width: 14 }, // M – Tanggal (expense)
    { width: 18 }, // N – Jumlah (expense)
    { width: 22 }, // O – Kategori (expense)
    { width: 18 }, // P – Akun (expense)
    { width: 25 }, // Q – Catatan (expense)
    { width: 3 },  // R – spacer
    { width: 25 }, // S – Rekap kategori
    { width: 18 }, // T – Rekap total
  ];

  // ── Header block ──
  ws.mergeCells('B4:E4');
  const titleCell = ws.getCell('B4');
  titleCell.value = 'Monthly Report';
  titleCell.font = { bold: true, size: 16 };

  ws.getCell('B7').value = formatDatetimeID(new Date());
  ws.getCell('B7').font = { italic: true, size: 9, color: { argb: 'FF666666' } };

  ws.getCell('B9').value = 'B U L A N';
  ws.getCell('B9').font = { bold: true };
  ws.getCell('D9').value = 'T A H U N';
  ws.getCell('D9').font = { bold: true };
  ws.getCell('B10').value = MONTH_NAMES_ID[data.month];
  ws.getCell('D10').value = data.year;

  ws.getCell('G10').value = 'Total Pemasukan';
  ws.getCell('G10').font = { bold: true };
  ws.getCell('H10').value = data.totalIncome;
  ws.getCell('H10').numFmt = CURRENCY_FMT;
  ws.getCell('H10').font = { color: { argb: 'FF10B981' }, bold: true };

  ws.mergeCells('B12:E12');
  ws.getCell('B12').value = 'T O T A L   A S S E T S';
  ws.getCell('B12').font = { bold: true };
  ws.getCell('G12').value = 'Total Pengeluaran';
  ws.getCell('G12').font = { bold: true };
  ws.getCell('H12').value = data.totalExpense;
  ws.getCell('H12').numFmt = CURRENCY_FMT;
  ws.getCell('H12').font = { color: { argb: 'FFEF4444' }, bold: true };

  ws.getCell('B13').value = data.totalAssets;
  ws.getCell('B13').numFmt = CURRENCY_FMT;
  ws.getCell('B13').font = { bold: true, size: 13 };

  // ── Section headers (row 16) ──
  const headerFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF2563EB' } };
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' } };

  ws.mergeCells('B16:E16');
  ws.getCell('B16').value = 'KATEGORI';
  ws.getCell('B16').fill = headerFill;
  ws.getCell('B16').font = headerFont;

  ws.mergeCells('F16:J16');
  ws.getCell('F16').value = 'P E M A S U K A N';
  ws.getCell('F16').fill = headerFill;
  ws.getCell('F16').font = headerFont;

  ws.mergeCells('L16:Q16');
  ws.getCell('L16').value = 'P E N G E L U A R A N';
  ws.getCell('L16').fill = headerFill;
  ws.getCell('L16').font = headerFont;

  ws.mergeCells('S16:T16');
  ws.getCell('S16').value = 'Rekap Pengeluaran';
  ws.getCell('S16').fill = headerFill;
  ws.getCell('S16').font = headerFont;

  // ── Column headers (row 17) ──
  const colHdrFont = { bold: true };
  ws.getCell('B17').value = 'Pemasukan';
  ws.getCell('B17').font = colHdrFont;
  ws.getCell('D17').value = 'Pengeluaran';
  ws.getCell('D17').font = colHdrFont;

  for (const [cell, label] of [
    ['F17', 'No'], ['G17', 'Tanggal'], ['H17', 'Jumlah'], ['I17', 'Kategori'], ['J17', 'Method'],
  ] as [string, string][]) {
    ws.getCell(cell).value = label;
    ws.getCell(cell).font = colHdrFont;
  }
  for (const [cell, label] of [
    ['L17', 'No'], ['M17', 'Tanggal'], ['N17', 'Jumlah'], ['O17', 'Kategori'],
    ['P17', 'Akun'], ['Q17', 'Catatan'],
  ] as [string, string][]) {
    ws.getCell(cell).value = label;
    ws.getCell(cell).font = colHdrFont;
  }
  ws.getCell('S17').value = 'Kategori';
  ws.getCell('S17').font = colHdrFont;
  ws.getCell('T17').value = 'Total';
  ws.getCell('T17').font = colHdrFont;

  // ── Data rows starting at row 18 ──
  data.incomeCategories.forEach((cat, i) => {
    const r = 18 + i;
    ws.getCell(`B${r}`).value = cat.category;
    ws.getCell(`C${r}`).value = cat.total;
    ws.getCell(`C${r}`).numFmt = CURRENCY_FMT;
  });

  data.expenseCategories.forEach((cat, i) => {
    const r = 18 + i;
    ws.getCell(`D${r}`).value = cat.category;
    ws.getCell(`E${r}`).value = cat.total;
    ws.getCell(`E${r}`).numFmt = CURRENCY_FMT;
  });

  data.incomeTransactions.forEach((tx, i) => {
    const r = 18 + i;
    ws.getCell(`F${r}`).value = i + 1;
    ws.getCell(`G${r}`).value = formatDateID(tx.date);
    ws.getCell(`H${r}`).value = tx.amount;
    ws.getCell(`H${r}`).numFmt = CURRENCY_FMT;
    ws.getCell(`I${r}`).value = tx.category;
    ws.getCell(`J${r}`).value = tx.paymentMethod;
  });

  data.expenseTransactions.forEach((tx, i) => {
    const r = 18 + i;
    ws.getCell(`L${r}`).value = i + 1;
    ws.getCell(`M${r}`).value = formatDateID(tx.date);
    ws.getCell(`N${r}`).value = tx.amount;
    ws.getCell(`N${r}`).numFmt = CURRENCY_FMT;
    ws.getCell(`O${r}`).value = tx.category;
    ws.getCell(`P${r}`).value = tx.paymentMethod;
    ws.getCell(`Q${r}`).value = tx.notes || '';
  });

  data.expenseCategories.forEach((cat, i) => {
    const r = 18 + i;
    ws.getCell(`S${r}`).value = cat.category;
    ws.getCell(`T${r}`).value = cat.total;
    ws.getCell(`T${r}`).numFmt = CURRENCY_FMT;
  });

  // ── Payment Methods ──
  const catRows = Math.max(data.incomeCategories.length, data.expenseCategories.length);
  const pmStartRow = Math.max(32, 20 + catRows);
  ws.getCell(`B${pmStartRow}`).value = 'Payment Method';
  ws.getCell(`B${pmStartRow}`).font = { bold: true };
  ws.getCell(`D${pmStartRow}`).value = 'Jumlah';
  ws.getCell(`D${pmStartRow}`).font = { bold: true };
  data.paymentMethodBalances.forEach((pm, i) => {
    const r = pmStartRow + 2 + i;
    ws.getCell(`B${r}`).value = pm.name;
    ws.getCell(`D${r}`).value = pm.balance;
    ws.getCell(`D${r}`).numFmt = CURRENCY_FMT;
  });

  // ── Bills ──
  const billsStartRow = pmStartRow + 4 + data.paymentMethodBalances.length;
  ws.mergeCells(`B${billsStartRow}:E${billsStartRow}`);
  ws.getCell(`B${billsStartRow}`).value = 'C A T A T A N   T A G I H A N';
  ws.getCell(`B${billsStartRow}`).font = { bold: true };
  ws.getCell(`B${billsStartRow}`).fill = headerFill;
  ws.getCell(`B${billsStartRow}`).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  const billsHdrRow = billsStartRow + 2;
  ws.getCell(`C${billsHdrRow}`).value = 'Tagihan';
  ws.getCell(`C${billsHdrRow}`).font = { bold: true };
  ws.getCell(`D${billsHdrRow}`).value = 'Jumlah';
  ws.getCell(`D${billsHdrRow}`).font = { bold: true };
  data.bills.forEach((bill, i) => {
    const r = billsHdrRow + 1 + i;
    ws.getCell(`B${r}`).value = bill.isPaid;
    ws.getCell(`C${r}`).value = bill.name;
    ws.getCell(`D${r}`).value = bill.amount;
    ws.getCell(`D${r}`).numFmt = CURRENCY_FMT;
  });

  // ── Embed chart images ──
  if (donutPng) {
    const id = workbook.addImage({ base64: stripBase64Prefix(donutPng), extension: 'png' });
    ws.addImage(id, { tl: { col: 20, row: 1 }, ext: { width: 220, height: 220 } });
  }
  if (cashflowPng) {
    const id = workbook.addImage({ base64: stripBase64Prefix(cashflowPng), extension: 'png' });
    ws.addImage(id, { tl: { col: 20, row: 9 }, ext: { width: 350, height: 140 } });
  }
  if (piePng) {
    const id = workbook.addImage({ base64: stripBase64Prefix(piePng), extension: 'png' });
    ws.addImage(id, { tl: { col: 20, row: 16 }, ext: { width: 300, height: 215 } });
  }

  const monthStr = String(data.month + 1).padStart(2, '0');
  await triggerXlsxDownload(workbook, `Laporan-Keuangan-${data.year}-${monthStr}.xlsx`);
}

// ─── Annual Report ────────────────────────────────────────────────────────────

export async function generateAnnualReport(data: AnnualReportData): Promise<void> {
  const expenseCats = data.topCategories
    .filter((c) => c.type === 'expense')
    .map((c) => ({ category: c.category, total: c.total }));

  const [donutPng, cashflowPng, piePng] = await Promise.all([
    renderDonutChart(data.totalIncome, data.totalExpense).catch(() => null),
    renderCashflowChart(data.totalIncome, data.totalExpense, data.totalBalance).catch(() => null),
    renderExpensePieChart(expenseCats).catch(() => null),
  ]);

  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Annual Report');

  ws.columns = [
    { width: 3 },  // A
    { width: 28 }, // B
    { width: 14 }, // C
    { width: 28 }, // D
    { width: 14 }, // E
    { width: 6 },  // F
    { width: 14 }, // G
    { width: 18 }, // H
    { width: 22 }, // I
    { width: 18 }, // J
    { width: 3 },  // K
    { width: 6 },  // L
    { width: 14 }, // M
    { width: 18 }, // N
    { width: 22 }, // O
    { width: 18 }, // P
    { width: 25 }, // Q
    { width: 3 },  // R
    { width: 25 }, // S
    { width: 18 }, // T
  ];

  const headerFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF2563EB' } };
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' } };

  ws.mergeCells('B4:E4');
  ws.getCell('B4').value = 'Annual Report';
  ws.getCell('B4').font = { bold: true, size: 16 };

  ws.getCell('B7').value = formatDatetimeID(new Date());
  ws.getCell('B7').font = { italic: true, size: 9, color: { argb: 'FF666666' } };

  ws.getCell('B9').value = 'T A H U N';
  ws.getCell('B9').font = { bold: true };
  ws.getCell('B10').value = data.year;

  ws.getCell('G10').value = 'Total Pemasukan';
  ws.getCell('G10').font = { bold: true };
  ws.getCell('H10').value = data.totalIncome;
  ws.getCell('H10').numFmt = '"Rp"#,##0';
  ws.getCell('H10').font = { color: { argb: 'FF10B981' }, bold: true };

  ws.mergeCells('B12:E12');
  ws.getCell('B12').value = 'T O T A L   A S S E T S';
  ws.getCell('B12').font = { bold: true };
  ws.getCell('G12').value = 'Total Pengeluaran';
  ws.getCell('G12').font = { bold: true };
  ws.getCell('H12').value = data.totalExpense;
  ws.getCell('H12').numFmt = '"Rp"#,##0';
  ws.getCell('H12').font = { color: { argb: 'FFEF4444' }, bold: true };

  ws.getCell('B13').value = data.totalAssets;
  ws.getCell('B13').numFmt = '"Rp"#,##0';
  ws.getCell('B13').font = { bold: true, size: 13 };

  // Section headers (row 16)
  ws.mergeCells('B16:E16');
  ws.getCell('B16').value = 'KATEGORI';
  ws.getCell('B16').fill = headerFill;
  ws.getCell('B16').font = headerFont;

  ws.mergeCells('F16:J16');
  ws.getCell('F16').value = 'P E M A S U K A N';
  ws.getCell('F16').fill = headerFill;
  ws.getCell('F16').font = headerFont;

  ws.mergeCells('L16:Q16');
  ws.getCell('L16').value = 'P E N G E L U A R A N';
  ws.getCell('L16').fill = headerFill;
  ws.getCell('L16').font = headerFont;

  ws.mergeCells('S16:T16');
  ws.getCell('S16').value = 'Rekap Pengeluaran';
  ws.getCell('S16').fill = headerFill;
  ws.getCell('S16').font = headerFont;

  // Column headers (row 17)
  const colHdrFont = { bold: true };
  ws.getCell('B17').value = 'Pemasukan';
  ws.getCell('B17').font = colHdrFont;
  ws.getCell('D17').value = 'Pengeluaran';
  ws.getCell('D17').font = colHdrFont;

  for (const [cell, label] of [
    ['F17', 'No'], ['G17', 'Tanggal'], ['H17', 'Jumlah'], ['I17', 'Kategori'], ['J17', 'Method'],
  ] as [string, string][]) {
    ws.getCell(cell).value = label;
    ws.getCell(cell).font = colHdrFont;
  }
  for (const [cell, label] of [
    ['L17', 'No'], ['M17', 'Tanggal'], ['N17', 'Jumlah'], ['O17', 'Kategori'],
    ['P17', 'Akun'], ['Q17', 'Catatan'],
  ] as [string, string][]) {
    ws.getCell(cell).value = label;
    ws.getCell(cell).font = colHdrFont;
  }
  ws.getCell('S17').value = 'Kategori';
  ws.getCell('S17').font = colHdrFont;
  ws.getCell('T17').value = 'Total';
  ws.getCell('T17').font = colHdrFont;

  // Top income/expense categories in left panel (B18+/D18+)
  const incCats = data.topCategories.filter((c) => c.type === 'income');
  incCats.forEach((cat, i) => {
    ws.getCell(`B${18 + i}`).value = cat.category;
    ws.getCell(`C${18 + i}`).value = cat.total;
    ws.getCell(`C${18 + i}`).numFmt = '"Rp"#,##0';
  });
  expenseCats.forEach((cat, i) => {
    ws.getCell(`D${18 + i}`).value = cat.category;
    ws.getCell(`E${18 + i}`).value = cat.total;
    ws.getCell(`E${18 + i}`).numFmt = '"Rp"#,##0';
  });

  // All transactions sorted by date — income in F-J, expense in L-Q
  const incomeTxs = data.transactions
    .filter((tx) => tx.type === 'income')
    .sort((a, b) => a.date.localeCompare(b.date));
  const expenseTxs = data.transactions
    .filter((tx) => tx.type === 'expense')
    .sort((a, b) => a.date.localeCompare(b.date));

  incomeTxs.forEach((tx, i) => {
    const r = 18 + i;
    ws.getCell(`F${r}`).value = i + 1;
    ws.getCell(`G${r}`).value = formatDateID(tx.date);
    ws.getCell(`H${r}`).value = tx.amount;
    ws.getCell(`H${r}`).numFmt = '"Rp"#,##0';
    ws.getCell(`I${r}`).value = tx.category;
    ws.getCell(`J${r}`).value = tx.paymentMethod;
  });

  expenseTxs.forEach((tx, i) => {
    const r = 18 + i;
    ws.getCell(`L${r}`).value = i + 1;
    ws.getCell(`M${r}`).value = formatDateID(tx.date);
    ws.getCell(`N${r}`).value = tx.amount;
    ws.getCell(`N${r}`).numFmt = '"Rp"#,##0';
    ws.getCell(`O${r}`).value = tx.category;
    ws.getCell(`P${r}`).value = tx.paymentMethod;
    ws.getCell(`Q${r}`).value = tx.notes || '';
  });

  expenseCats.forEach((cat, i) => {
    ws.getCell(`S${18 + i}`).value = cat.category;
    ws.getCell(`T${18 + i}`).value = cat.total;
    ws.getCell(`T${18 + i}`).numFmt = '"Rp"#,##0';
  });

  // Chart images
  if (donutPng) {
    const id = workbook.addImage({ base64: donutPng.split(',')[1], extension: 'png' });
    ws.addImage(id, { tl: { col: 20, row: 1 }, ext: { width: 220, height: 220 } });
  }
  if (cashflowPng) {
    const id = workbook.addImage({ base64: cashflowPng.split(',')[1], extension: 'png' });
    ws.addImage(id, { tl: { col: 20, row: 9 }, ext: { width: 350, height: 140 } });
  }
  if (piePng) {
    const id = workbook.addImage({ base64: piePng.split(',')[1], extension: 'png' });
    ws.addImage(id, { tl: { col: 20, row: 16 }, ext: { width: 300, height: 215 } });
  }

  // Extra sheet: Ringkasan Bulanan
  const ws2 = workbook.addWorksheet('Ringkasan Bulanan');
  ws2.columns = [
    { width: 16 }, // Bulan
    { width: 20 }, // Pemasukan
    { width: 20 }, // Pengeluaran
    { width: 20 }, // Saldo
  ];
  ws2.getCell('A1').value = 'Bulan';
  ws2.getCell('B1').value = 'Pemasukan';
  ws2.getCell('C1').value = 'Pengeluaran';
  ws2.getCell('D1').value = 'Saldo';
  ['A1', 'B1', 'C1', 'D1'].forEach((ref) => {
    ws2.getCell(ref).font = { bold: true };
    ws2.getCell(ref).fill = headerFill;
    ws2.getCell(ref).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  });
  data.monthlyBreakdown.forEach((m, i) => {
    const r = 2 + i;
    ws2.getCell(`A${r}`).value = MONTH_NAMES_ID[m.month];
    ws2.getCell(`B${r}`).value = m.income;
    ws2.getCell(`B${r}`).numFmt = '"Rp"#,##0';
    ws2.getCell(`C${r}`).value = m.expense;
    ws2.getCell(`C${r}`).numFmt = '"Rp"#,##0';
    ws2.getCell(`D${r}`).value = m.balance;
    ws2.getCell(`D${r}`).numFmt = '"Rp"#,##0';
  });

  await triggerXlsxDownload(workbook, `Laporan-Tahunan-${data.year}.xlsx`);
}
```

- [ ] **Step 2: Update `useReportData.ts` to `await` both generator calls**

In `src/features/reports/useReportData.ts`, change line 42:
```typescript
generateMonthlyReport(result.data.report);
```
to:
```typescript
await generateMonthlyReport(result.data.report);
```

And change line 59:
```typescript
generateAnnualReport(result.data);
```
to:
```typescript
await generateAnnualReport(result.data);
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: No errors. (ExcelJS types should resolve correctly. If `exceljs` types are missing, run `npm install --save-dev @types/exceljs` — though ExcelJS ships its own types.)

- [ ] **Step 4: Run tests**

```bash
npm run test
```

Expected: 312 tests pass unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/features/reports/report-generator.ts src/features/reports/useReportData.ts
git commit -m "feat: rewrite report-generator with ExcelJS template layout + embedded chart images"
```

---

## Task 6: Rewrite `exportExcel` in `src/lib/export-utils.ts`

**Files:**
- Modify: `src/lib/export-utils.ts`

Replace the old SheetJS-based `exportExcel` with an ExcelJS version using the same template layout as the monthly report, driven by `ExportReportInput`.

- [ ] **Step 1: Replace the `exportExcel` function in `src/lib/export-utils.ts`**

**First**, add these three imports to the **top of `export-utils.ts`** alongside the existing `import { type Transaction } from './types'` line. Do NOT place them inside the function block:

```typescript
import type { ExportReportInput } from './types';
import {
  renderDonutChart,
  renderCashflowChart,
  renderExpensePieChart,
} from './chart-renderer';
import { formatDateID, formatDatetimeID } from './formatters';
```

**Then**, remove the old `// --- Excel (xlsx via SheetJS) ---` block (lines 16–84) and replace with:

```typescript
// --- Excel (ExcelJS template) ---

export async function exportExcel(input: ExportReportInput): Promise<void> {
  const { transactions, totalIncome, totalExpense, totalAssets,
    incomeCategories, expenseCategories, paymentMethodBalances,
    bills, scopeLabel, filename } = input;

  const [donutPng, cashflowPng, piePng] = await Promise.all([
    renderDonutChart(totalIncome, totalExpense).catch(() => null),
    renderCashflowChart(totalIncome, totalExpense, totalAssets).catch(() => null),
    renderExpensePieChart(expenseCategories).catch(() => null),
  ]);

  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Report');

  ws.columns = [
    { width: 3 },  // A
    { width: 28 }, // B
    { width: 14 }, // C
    { width: 28 }, // D
    { width: 14 }, // E
    { width: 6 },  // F
    { width: 14 }, // G
    { width: 18 }, // H
    { width: 22 }, // I
    { width: 18 }, // J
    { width: 3 },  // K
    { width: 6 },  // L
    { width: 14 }, // M
    { width: 18 }, // N
    { width: 22 }, // O
    { width: 18 }, // P
    { width: 25 }, // Q
    { width: 3 },  // R
    { width: 25 }, // S
    { width: 18 }, // T
  ];

  const headerFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF2563EB' } };
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' } };
  const CURRENCY_FMT = '"Rp"#,##0';

  // Header
  ws.mergeCells('B4:E4');
  ws.getCell('B4').value = 'Laporan Keuangan';
  ws.getCell('B4').font = { bold: true, size: 16 };

  ws.getCell('B7').value = formatDatetimeID(new Date());
  ws.getCell('B7').font = { italic: true, size: 9, color: { argb: 'FF666666' } };

  ws.mergeCells('B9:E9');
  ws.getCell('B9').value = scopeLabel;
  ws.getCell('B9').font = { bold: true, size: 12 };

  ws.getCell('G10').value = 'Total Pemasukan';
  ws.getCell('G10').font = { bold: true };
  ws.getCell('H10').value = totalIncome;
  ws.getCell('H10').numFmt = CURRENCY_FMT;
  ws.getCell('H10').font = { color: { argb: 'FF10B981' }, bold: true };

  ws.mergeCells('B12:E12');
  ws.getCell('B12').value = 'T O T A L   A S S E T S';
  ws.getCell('B12').font = { bold: true };
  ws.getCell('G12').value = 'Total Pengeluaran';
  ws.getCell('G12').font = { bold: true };
  ws.getCell('H12').value = totalExpense;
  ws.getCell('H12').numFmt = CURRENCY_FMT;
  ws.getCell('H12').font = { color: { argb: 'FFEF4444' }, bold: true };

  ws.getCell('B13').value = totalAssets;
  ws.getCell('B13').numFmt = CURRENCY_FMT;
  ws.getCell('B13').font = { bold: true, size: 13 };

  // Section headers
  ws.mergeCells('B16:E16');
  ws.getCell('B16').value = 'KATEGORI';
  ws.getCell('B16').fill = headerFill;
  ws.getCell('B16').font = headerFont;

  ws.mergeCells('F16:J16');
  ws.getCell('F16').value = 'P E M A S U K A N';
  ws.getCell('F16').fill = headerFill;
  ws.getCell('F16').font = headerFont;

  ws.mergeCells('L16:Q16');
  ws.getCell('L16').value = 'P E N G E L U A R A N';
  ws.getCell('L16').fill = headerFill;
  ws.getCell('L16').font = headerFont;

  ws.mergeCells('S16:T16');
  ws.getCell('S16').value = 'Rekap Pengeluaran';
  ws.getCell('S16').fill = headerFill;
  ws.getCell('S16').font = headerFont;

  // Column headers row 17
  const colHdrFont = { bold: true };
  ws.getCell('B17').value = 'Pemasukan';
  ws.getCell('B17').font = colHdrFont;
  ws.getCell('D17').value = 'Pengeluaran';
  ws.getCell('D17').font = colHdrFont;
  for (const [cell, label] of [
    ['F17','No'],['G17','Tanggal'],['H17','Jumlah'],['I17','Kategori'],['J17','Method'],
  ] as [string,string][]) { ws.getCell(cell).value = label; ws.getCell(cell).font = colHdrFont; }
  for (const [cell, label] of [
    ['L17','No'],['M17','Tanggal'],['N17','Jumlah'],['O17','Kategori'],['P17','Akun'],['Q17','Catatan'],
  ] as [string,string][]) { ws.getCell(cell).value = label; ws.getCell(cell).font = colHdrFont; }
  ws.getCell('S17').value = 'Kategori'; ws.getCell('S17').font = colHdrFont;
  ws.getCell('T17').value = 'Total'; ws.getCell('T17').font = colHdrFont;

  // Data
  incomeCategories.forEach((cat, i) => {
    ws.getCell(`B${18+i}`).value = cat.category;
    ws.getCell(`C${18+i}`).value = cat.total;
    ws.getCell(`C${18+i}`).numFmt = CURRENCY_FMT;
  });
  expenseCategories.forEach((cat, i) => {
    ws.getCell(`D${18+i}`).value = cat.category;
    ws.getCell(`E${18+i}`).value = cat.total;
    ws.getCell(`E${18+i}`).numFmt = CURRENCY_FMT;
  });

  const incomeTxs = transactions.filter(tx => tx.type === 'income');
  const expenseTxs = transactions.filter(tx => tx.type === 'expense');

  incomeTxs.forEach((tx, i) => {
    const r = 18+i;
    ws.getCell(`F${r}`).value = i+1;
    ws.getCell(`G${r}`).value = formatDateID(tx.date);
    ws.getCell(`H${r}`).value = tx.amount; ws.getCell(`H${r}`).numFmt = CURRENCY_FMT;
    ws.getCell(`I${r}`).value = tx.category;
    ws.getCell(`J${r}`).value = tx.paymentMethod;
  });
  expenseTxs.forEach((tx, i) => {
    const r = 18+i;
    ws.getCell(`L${r}`).value = i+1;
    ws.getCell(`M${r}`).value = formatDateID(tx.date);
    ws.getCell(`N${r}`).value = tx.amount; ws.getCell(`N${r}`).numFmt = CURRENCY_FMT;
    ws.getCell(`O${r}`).value = tx.category;
    ws.getCell(`P${r}`).value = tx.paymentMethod;
    ws.getCell(`Q${r}`).value = tx.notes || '';
  });
  expenseCategories.forEach((cat, i) => {
    ws.getCell(`S${18+i}`).value = cat.category;
    ws.getCell(`T${18+i}`).value = cat.total; ws.getCell(`T${18+i}`).numFmt = CURRENCY_FMT;
  });

  // Payment Methods
  const catRows = Math.max(incomeCategories.length, expenseCategories.length);
  const pmRow = Math.max(32, 20 + catRows);
  ws.getCell(`B${pmRow}`).value = 'Saldo (periode ini)'; ws.getCell(`B${pmRow}`).font = { bold: true };
  ws.getCell(`D${pmRow}`).value = 'Jumlah'; ws.getCell(`D${pmRow}`).font = { bold: true };
  paymentMethodBalances.forEach((pm, i) => {
    const r = pmRow + 2 + i;
    ws.getCell(`B${r}`).value = pm.name;
    ws.getCell(`D${r}`).value = pm.balance; ws.getCell(`D${r}`).numFmt = CURRENCY_FMT;
  });

  // Bills (only for single-month scope — caller passes empty array otherwise)
  if (bills.length > 0) {
    const billsRow = pmRow + 4 + paymentMethodBalances.length;
    ws.mergeCells(`B${billsRow}:E${billsRow}`);
    ws.getCell(`B${billsRow}`).value = 'C A T A T A N   T A G I H A N';
    ws.getCell(`B${billsRow}`).fill = headerFill;
    ws.getCell(`B${billsRow}`).font = headerFont;
    const billsHdrRow = billsRow + 2;
    ws.getCell(`C${billsHdrRow}`).value = 'Tagihan'; ws.getCell(`C${billsHdrRow}`).font = { bold: true };
    ws.getCell(`D${billsHdrRow}`).value = 'Jumlah'; ws.getCell(`D${billsHdrRow}`).font = { bold: true };
    bills.forEach((bill, i) => {
      const r = billsHdrRow + 1 + i;
      ws.getCell(`B${r}`).value = bill.isPaid;
      ws.getCell(`C${r}`).value = bill.name;
      ws.getCell(`D${r}`).value = bill.amount; ws.getCell(`D${r}`).numFmt = CURRENCY_FMT;
    });
  }

  // Chart images
  if (donutPng) {
    const id = workbook.addImage({ base64: donutPng.split(',')[1], extension: 'png' });
    ws.addImage(id, { tl: { col: 20, row: 1 }, ext: { width: 220, height: 220 } });
  }
  if (cashflowPng) {
    const id = workbook.addImage({ base64: cashflowPng.split(',')[1], extension: 'png' });
    ws.addImage(id, { tl: { col: 20, row: 9 }, ext: { width: 350, height: 140 } });
  }
  if (piePng) {
    const id = workbook.addImage({ base64: piePng.split(',')[1], extension: 'png' });
    ws.addImage(id, { tl: { col: 20, row: 16 }, ext: { width: 300, height: 215 } });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, filename);
}
```

Also update the `downloadBlob` helper at the bottom of the file to accept either `string` or `Blob`:

```typescript
// --- Helpers ---

function downloadBlob(content: string | Blob, filename: string, mimeType?: string): void {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: mimeType ?? 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

Update `exportCSV` to match the new helper signature (it already passes `mimeType`, so no change needed there).

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: Errors only where `useExport.ts` still calls `exportExcel` with the old signature — that will be fixed in Task 8.

- [ ] **Step 3: Run tests**

```bash
npm run test
```

Expected: 312 pass.

---

## Task 7: Rewrite `exportPDF` in `src/lib/export-utils.ts`

**Files:**
- Modify: `src/lib/export-utils.ts`

Replace the old `exportPDF` with a new version that follows the template layout with chart images.

- [ ] **Step 1: Replace the `exportPDF` function**

Remove the old `// --- PDF (jsPDF + autotable) ---` block (lines 86–162) and replace with:

```typescript
// --- PDF (jsPDF + autotable — template layout) ---

export async function exportPDF(input: ExportReportInput): Promise<void> {
  const { transactions, totalIncome, totalExpense, totalAssets,
    incomeCategories, expenseCategories, paymentMethodBalances,
    bills, scopeLabel, filename } = input;

  const [donutPng, cashflowPng, piePng] = await Promise.all([
    renderDonutChart(totalIncome, totalExpense).catch(() => null),
    renderCashflowChart(totalIncome, totalExpense, totalAssets).catch(() => null),
    renderExpensePieChart(expenseCategories).catch(() => null),
  ]);

  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PAGE_W = 210;
  const MARGIN = 15;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const BLUE: [number, number, number] = [37, 99, 235];
  const EMERALD_TINT: [number, number, number] = [209, 250, 229];
  const RED_TINT: [number, number, number] = [254, 226, 226];

  let y = MARGIN;

  // ── Title ──
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Laporan Keuangan', MARGIN, y);
  y += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`${scopeLabel}  |  Dibuat: ${new Date().toLocaleDateString('id-ID')}`, MARGIN, y);
  doc.setTextColor(0);
  y += 8;

  // ── Totals row (3 boxes) ──
  const boxW = CONTENT_W / 3 - 2;
  const boxes = [
    { label: 'Total Pemasukan', value: totalIncome, color: [16, 185, 129] as [number,number,number] },
    { label: 'Total Pengeluaran', value: totalExpense, color: [239, 68, 68] as [number,number,number] },
    { label: 'Total Assets', value: totalAssets, color: BLUE },
  ];
  boxes.forEach((box, idx) => {
    const x = MARGIN + idx * (boxW + 3);
    doc.setDrawColor(200);
    doc.roundedRect(x, y, boxW, 14, 2, 2, 'S');
    doc.setFontSize(8);
    doc.setTextColor(80);
    doc.text(box.label, x + 3, y + 5);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...box.color);
    const fmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(box.value);
    doc.text(fmt, x + 3, y + 11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
  });
  y += 18;

  // ── Charts row: donut (left) + cashflow (right) ──
  const chartRowH = 52;
  if (donutPng) {
    doc.addImage(donutPng, 'PNG', MARGIN, y, 70, chartRowH);
  }
  if (cashflowPng) {
    doc.addImage(cashflowPng, 'PNG', MARGIN + 75, y, 105, chartRowH);
  }
  y += chartRowH + 4;

  // ── Pie chart (centered) ──
  if (piePng) {
    const pieW = 90;
    doc.addImage(piePng, 'PNG', MARGIN + (CONTENT_W - pieW) / 2, y, pieW, 65);
    y += 69;
  }

  // ── Rekap Pengeluaran table ──
  if (expenseCategories.length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Rekap Pengeluaran', MARGIN, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Kategori', 'Total']],
      body: expenseCategories.map((c) => [
        c.category,
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(c.total),
      ]),
      theme: 'striped',
      headStyles: { fillColor: BLUE, fontSize: 8 },
      styles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: MARGIN },
      tableWidth: CONTENT_W / 2,
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // ── Payment Methods table ──
  if (paymentMethodBalances.length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Saldo (periode ini)', MARGIN, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Metode Pembayaran', 'Saldo']],
      body: paymentMethodBalances.map((pm) => [
        pm.name,
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(pm.balance),
      ]),
      theme: 'striped',
      headStyles: { fillColor: BLUE, fontSize: 8 },
      styles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: MARGIN },
      tableWidth: CONTENT_W / 2,
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // ── Page 2+: Income transactions ──
  const incomeTxs = transactions.filter((tx) => tx.type === 'income');
  if (incomeTxs.length > 0) {
    doc.addPage();
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('P E M A S U K A N', MARGIN, MARGIN);
    autoTable(doc, {
      startY: MARGIN + 4,
      head: [['No', 'Tanggal', 'Jumlah', 'Kategori', 'Metode']],
      body: incomeTxs.map((tx, i) => [
        i + 1,
        formatDateID(tx.date),
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(tx.amount),
        tx.category,
        tx.paymentMethod,
      ]),
      theme: 'striped',
      headStyles: { fillColor: BLUE, fontSize: 8 },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 10 },
        2: { halign: 'right', fontStyle: 'bold' },
      },
      alternateRowStyles: { fillColor: EMERALD_TINT },
      margin: { left: MARGIN, right: MARGIN },
    });
  }

  // ── Expense transactions ──
  const expenseTxs = transactions.filter((tx) => tx.type === 'expense');
  if (expenseTxs.length > 0) {
    const afterIncome = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? MARGIN;
    const expenseStartY = afterIncome + 8 < 260 ? afterIncome + 8 : (doc.addPage(), MARGIN);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('P E N G E L U A R A N', MARGIN, expenseStartY - 4);
    autoTable(doc, {
      startY: expenseStartY,
      head: [['No', 'Tanggal', 'Jumlah', 'Kategori', 'Akun', 'Catatan']],
      body: expenseTxs.map((tx, i) => [
        i + 1,
        formatDateID(tx.date),
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(tx.amount),
        tx.category,
        tx.paymentMethod,
        tx.notes || '',
      ]),
      theme: 'striped',
      headStyles: { fillColor: BLUE, fontSize: 8 },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 10 },
        2: { halign: 'right', fontStyle: 'bold' },
      },
      alternateRowStyles: { fillColor: RED_TINT },
      margin: { left: MARGIN, right: MARGIN },
    });
  }

  // ── Bills (monthly scope only — caller passes empty array for other scopes) ──
  if (bills.length > 0) {
    const afterExpense = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? MARGIN;
    const billsStartY = afterExpense + 8 < 260 ? afterExpense + 8 : (doc.addPage(), MARGIN);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('C A T A T A N   T A G I H A N', MARGIN, billsStartY - 4);
    autoTable(doc, {
      startY: billsStartY,
      head: [['Lunas', 'Tagihan', 'Jumlah']],
      body: bills.map((bill) => [
        bill.isPaid ? '☑' : '☐',
        bill.name,
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(bill.amount),
      ]),
      theme: 'striped',
      headStyles: { fillColor: BLUE, fontSize: 8 },
      styles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 12, halign: 'center' }, 2: { halign: 'right' } },
      margin: { left: MARGIN, right: MARGIN },
    });
  }

  doc.save(filename);
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: Errors only in `useExport.ts` call sites (still using old signatures) — fixed in Task 8.

- [ ] **Step 3: Run tests**

```bash
npm run test
```

Expected: 312 pass.

---

## Task 8: Update `useExport.ts` to Use New Signatures

**Files:**
- Modify: `src/features/export/useExport.ts`

Wire up `ExportReportInput`, compute it from `scopedTransactions`, fetch bills for monthly scope, and call the new `exportExcel(input)` / `exportPDF(input)` signatures.

- [ ] **Step 1: Update imports at the top of `useExport.ts`**

Replace:
```typescript
import { exportCSV, exportExcel, exportPDF } from '@/lib/export-utils';
import { type ExportFormat, type ExportScope, type Transaction } from '@/lib/types';
import { type ExportOptionsState } from '@/features/export/ExportOptions';
```
with:
```typescript
import { exportCSV, exportExcel, exportPDF } from '@/lib/export-utils';
import { type ExportFormat, type ExportScope, type Transaction, type ExportReportInput } from '@/lib/types';
import { type ExportOptionsState } from '@/features/export/ExportOptions';
```

- [ ] **Step 2: Replace the `handleExport` callback**

Replace the entire `handleExport` `useCallback` (lines 102–157) with:

```typescript
const handleExport = useCallback(async () => {
  if (scopedTransactions.length === 0) return;
  setIsExporting(true);
  setExportError(null);

  try {
    if (format === 'csv') {
      exportCSV(scopedTransactions, buildFilename('csv'));
    } else {
      // Compute summaries from scoped transactions
      const totalIncome = scopedTransactions
        .filter((t) => t.type === 'income')
        .reduce((s, t) => s + t.amount, 0);
      const totalExpense = scopedTransactions
        .filter((t) => t.type === 'expense')
        .reduce((s, t) => s + t.amount, 0);

      const incomeCategories = Object.entries(
        scopedTransactions
          .filter((t) => t.type === 'income')
          .reduce<Record<string, number>>((acc, t) => {
            acc[t.category] = (acc[t.category] ?? 0) + t.amount;
            return acc;
          }, {})
      )
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total);

      const expenseCategories = Object.entries(
        scopedTransactions
          .filter((t) => t.type === 'expense')
          .reduce<Record<string, number>>((acc, t) => {
            acc[t.category] = (acc[t.category] ?? 0) + t.amount;
            return acc;
          }, {})
      )
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total);

      const paymentMethodBalances = Object.entries(
        scopedTransactions.reduce<Record<string, number>>((acc, t) => {
          const delta = t.type === 'income' ? t.amount : -t.amount;
          acc[t.paymentMethod] = (acc[t.paymentMethod] ?? 0) + delta;
          return acc;
        }, {})
      ).map(([name, balance]) => ({ name, balance }));

      // Fetch bills only for single-month scope
      let bills: import('@/lib/types').Bill[] = [];
      if (scope === 'current') {
        const billsResult = await api.bills.list({ month, year });
        bills = billsResult.data?.bills ?? [];
      }

      const input: ExportReportInput = {
        scopeLabel,
        transactions: scopedTransactions,
        totalIncome,
        totalExpense,
        totalAssets: totalIncome - totalExpense,
        incomeCategories,
        expenseCategories,
        paymentMethodBalances,
        bills,
        filename: buildFilename(format === 'xlsx' ? 'xlsx' : 'pdf'),
      };

      if (format === 'xlsx') {
        await exportExcel(input);
      } else {
        await exportPDF(input);
      }
    }

    // Persist export job record
    const jobResult = await api.exportJobs.create({
      format,
      scope,
      filters: scope === 'range' ? JSON.stringify({ startDate, endDate }) : undefined,
      recordCount: scopedTransactions.length,
    });
    if (jobResult.data) {
      setExportJobs((prev) => [
        { ...jobResult.data!, status: 'completed', completedAt: new Date().toISOString() },
        ...prev,
      ]);
    }
  } catch (err) {
    setExportError(err instanceof Error ? err.message : 'Export failed');
  } finally {
    setIsExporting(false);
  }
}, [
  format,
  scopedTransactions,
  buildFilename,
  scopeLabel,
  scope,
  month,
  year,
  startDate,
  endDate,
]);
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: Zero errors across all files.

- [ ] **Step 4: Run tests**

```bash
npm run test
```

Expected: 312 pass.

- [ ] **Step 5: Commit Tasks 6–8 together**

```bash
git add src/lib/export-utils.ts src/features/export/useExport.ts
git commit -m "feat: rewrite exportExcel and exportPDF with template layout, charts, ExportReportInput"
```

---

## Task 9: Full Preflight Check

- [ ] **Step 1: Run full preflight**

```bash
npm run preflight
```

Expected output: format check ✓, typecheck ✓, lint ✓, build ✓.

If **format check fails**, run:
```bash
npm run format
git add -A
```

If **lint fails**, fix the reported issues (usually unused imports or missing types).

If **build fails**, check for dynamic import type mismatches — the most common issue is ExcelJS's `writeBuffer()` return type. Cast it: `buffer as ArrayBuffer`.

- [ ] **Step 2: Commit final clean state**

```bash
git add -A
git commit -m "chore: run preflight — format, typecheck, lint, build all pass"
```

---

## Manual QA Checklist

After implementation, verify each output manually:

- [ ] `/reports` page → Download monthly XLSX → opens in Excel/LibreOffice with template layout and all 3 charts visible
- [ ] `/reports` page → Download annual XLSX → opens with same layout, "Ringkasan Bulanan" sheet present, all 3 charts visible
- [ ] `/export` page → XLSX, scope "This Month" → template layout, bills section present, charts visible
- [ ] `/export` page → XLSX, scope "All" → template layout, no bills section, charts reflect all-time data
- [ ] `/export` page → XLSX, scope "Custom Range" → header shows range label, no bills section
- [ ] `/export` page → PDF, scope "This Month" → Page 1 has totals + 3 charts + rekap; Page 2+ has transactions + bills
- [ ] `/export` page → PDF, scope "All" → same but no bills section
- [ ] `/export` page → CSV → unchanged (flat rows, no template)
- [ ] Verify ExcelJS output opens correctly in both Excel and LibreOffice
- [ ] Verify PDF chart images render correctly in Chromium and Firefox

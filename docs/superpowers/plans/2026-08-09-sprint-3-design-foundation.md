# Sprint 3 — Fondasi Desain (E1–E5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menyambungkan palet editorial ke Tailwind (`text-pos`/`bg-neg-soft` jadi class nyata), menyatukan theming 7 chart, menyapu warna off-theme/dark-mode, menegakkan kontrak empat-state halaman, dan menutup gap aksesibilitas (progressbar ARIA, target sentuh 44px, lantai 12px) — spec: `docs/superpowers/specs/2026-08-09-sprint-3-design-foundation-design.md`.

**Architecture:** 100% frontend — nol perubahan DB/API/pembacaan data lama (Playbook Tahap 1: risiko rendah). E1 (pemetaan `@theme`) adalah prasyarat semua task lain karena memperkenalkan utility `text-pos`/`bg-ink`/dll. yang dipakai sweep E2–E4. Setiap sweep dikawal guard test berbasis `git grep`/`readFileSync` (pola `no-hardcoded-design-hex.test.ts` & `page-reports-hero.test.ts`).

**Tech Stack:** Next.js 16 App Router, Tailwind v4 (`@theme inline` di globals.css — TANPA tailwind.config), Recharts, Framer Motion, Vitest.

## Global Constraints

- NOL perubahan DB, NOL perubahan API, NOL perubahan `JWT_SECRET`.
- Tailwind v4: token diekspos lewat blok `@theme inline` di `src/app/globals.css`; TIDAK ada tailwind.config.ts.
- Setiap kunci i18n baru WAJIB di KEDUA kamus (`en` dan `id`) di `src/lib/i18n.ts` (kunci hilang = error kompilasi).
- DILARANG hex mentah baru di komponen (MASTER.md); guard test `no-hardcoded-design-hex.test.ts` diperluas sprint ini.
- File TIDAK disapu sprint ini (terdokumentasi, prioritas rendah): kelas palet yang SUDAH berpasangan `dark:` (daftar di spec); scrim `bg-black/*` di ui/dialog|sheet|alert-dialog; hex data server (`insights.service.ts`, `constants.ts`, `seed.ts`); palet file export (`chart-renderer.ts`, `chart-xml-injector.ts`, `export-utils.ts`).
- Konvensi commit `fix(scope):`/`feat(scope):`; setiap commit diakhiri `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- `npx vitest run` penuh sebelum tiap commit; baseline 989 tes hijau. Branch: `feat/sprint3-design-foundation` dari `main`.
- Verifikasi visual sweep = typecheck + suite + grep (JSX murni); TDD penuh untuk modul/logic baru.

---

### Task 0: Branch kerja

- [ ] **Step 1:** `git checkout main && git pull && git checkout -b feat/sprint3-design-foundation`

---

### Task 1 (E1): Ekspos palet editorial ke `@theme` + repoint token legacy + CLAUDE.md

**Files:**
- Modify: `src/app/globals.css` (blok `@theme inline` ~line 96–185; `:root` ~line 225–246; `.dark` ~line 341–360)
- Modify: `CLAUDE.md` (seksi "Design Direction" → "Visual Language")
- Test (create): `src/__tests__/editorial-theme-utilities.test.ts`
- Test (verify): `src/__tests__/css-color-tokens.test.ts`, `src/__tests__/globals-css-tokens.test.ts` (hanya cek presence — harus tetap hijau)

**Interfaces:**
- Produces: utility Tailwind baru yang dipakai Task 2–8: `text-pos`, `text-neg`, `text-warn`, `bg-pos`, `bg-neg`, `bg-warn`, `bg-pos-soft`, `bg-neg-soft`, `bg-warn-soft`, `bg-ink`, `text-paper`, `bg-paper`, `bg-paper-2`, `text-ink`, `text-ink-2`, `text-ink-3`, `border-rule`, `border-rule-soft`, `bg-card-2`, `text-accent-2`.
- Token turunan (tak perlu ubah komponen): `text-success`/`text-warning`/`bg-success-soft` dll. kini otomatis editorial; semua chart yang membaca `var(--chart-*)` otomatis berubah warna.

- [ ] **Step 1: Tes gagal** — `src/__tests__/editorial-theme-utilities.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const css = readFileSync(resolve('src/app/globals.css'), 'utf-8');
const themeBlock = css.slice(css.indexOf('@theme inline {', css.indexOf('--color-background')), css.indexOf(':root {'));

describe('@theme maps editorial palette to Tailwind utilities (E1)', () => {
  const mappings = [
    'paper', 'paper-2', 'ink', 'ink-2', 'ink-3', 'rule', 'rule-soft',
    'card-2', 'accent-2', 'pos', 'pos-soft', 'neg', 'neg-soft', 'warn', 'warn-soft',
  ];
  for (const token of mappings) {
    it(`maps --color-${token} -> var(--${token})`, () => {
      expect(themeBlock).toContain(`--color-${token}: var(--${token})`);
    });
  }
});

describe('legacy semantic tokens point at editorial palette (E1)', () => {
  it('success/warning follow --pos/--warn', () => {
    expect(css).toContain('--success: var(--pos)');
    expect(css).toContain('--warning: var(--warn)');
  });
  it('chart semantic tokens follow editorial palette', () => {
    expect(css).toContain('--chart-income: var(--pos)');
    expect(css).toContain('--chart-expense: var(--neg)');
    expect(css).toContain('--chart-primary: var(--accent)');
    expect(css).toContain('--chart-muted: var(--ink-3)');
    expect(css).toContain('--chart-grid: var(--rule-soft)');
    expect(css).toContain('--chart-color-1: var(--accent)');
  });
});
```

Run: `npx vitest run src/__tests__/editorial-theme-utilities.test.ts` → FAIL.

- [ ] **Step 2: Implementasi globals.css.** (a) Di AKHIR blok `@theme inline` kedua (sebelum `}` line ~185) tambah:

```css
  /* Editorial palette — direct utilities (text-pos, bg-neg-soft, bg-ink, …) */
  --color-paper: var(--paper);
  --color-paper-2: var(--paper-2);
  --color-ink: var(--ink);
  --color-ink-2: var(--ink-2);
  --color-ink-3: var(--ink-3);
  --color-rule: var(--rule);
  --color-rule-soft: var(--rule-soft);
  --color-card-2: var(--card-2);
  --color-accent-2: var(--accent-2);
  --color-pos: var(--pos);
  --color-pos-soft: var(--pos-soft);
  --color-neg: var(--neg);
  --color-neg-soft: var(--neg-soft);
  --color-warn: var(--warn);
  --color-warn-soft: var(--warn-soft);
```

(b) Di `:root` DAN `.dark`, ganti nilai raw menjadi referensi (kedua blok diberi nilai identik — `.dark` tetap punya baris agar `css-color-tokens.test.ts` yang mengecek presence di `.dark` tetap hijau):

```css
  --success: var(--pos);
  --success-foreground: var(--paper);
  --warning: var(--warn);
  --warning-foreground: var(--paper);
  --chart-1: var(--accent);
  --chart-2: var(--pos);
  --chart-3: var(--warn);
  --chart-4: var(--neg);
  --chart-5: var(--accent-2);
  --chart-income: var(--pos);
  --chart-expense: var(--neg);
  --chart-primary: var(--accent);
  --chart-muted: var(--ink-3);
  --chart-grid: var(--rule-soft);
  --chart-color-1: var(--accent);
  --chart-color-2: var(--pos);
  --chart-color-3: var(--warn);
  --chart-color-4: var(--neg);
  --chart-color-5: var(--accent-2);
  --chart-color-6: var(--ink-3);
```

dan blok soft (juga di kedua tempat):

```css
  --success-soft: var(--pos-soft);
  --success-soft-foreground: var(--pos);
  --danger-soft: var(--neg-soft);
  --danger-soft-foreground: var(--neg);
  --warning-soft: var(--warn-soft);
  --warning-soft-foreground: var(--warn);
```

JANGAN sentuh: `--info-soft*`, `--sidebar*`, `--tile*`, `--brand-mint*`, `--glow-*`, `--surface-*`, `--border-subtle/strong`.

- [ ] **Step 3:** Run `npx vitest run src/__tests__/editorial-theme-utilities.test.ts src/__tests__/css-color-tokens.test.ts src/__tests__/globals-css-tokens.test.ts` → PASS semua.
- [ ] **Step 4: CLAUDE.md.** Ganti isi sub-seksi `### Visual Language` (yang menyebut `#2563EB` / Plus Jakarta Sans) menjadi:

```markdown
### Visual Language

> **Source of truth: `design-system/financial-tracker-v.02/MASTER.md`** — baca file itu sebelum menyentuh UI.

- Editorial paper-and-ink: latar `--paper`, teks `--ink`, aksen `--accent` (oranye `#ff5b1f` light / brass `#d3b266` dark)
- Income `--pos`, expense `--neg`, warning `--warn` (+ tint `*-soft`) — selalu lewat token/utility (`text-pos`, `bg-neg-soft`), JANGAN hex mentah atau palet Tailwind mentah
- Fraunces untuk display/heading (`--font-display`), Geist untuk UI, Geist Mono untuk angka mata uang
- Rounded cards (rounded-2xl), hard rule editorial (`--rule`), light & dark mode via `.dark` class on `<html>`
```

- [ ] **Step 5:** `npm run typecheck && npx vitest run` → hijau penuh (token repoint tidak mengubah TS).
- [ ] **Step 6:** Commit: `feat(design): expose editorial palette to Tailwind theme and repoint legacy tokens (E1)`

---

### Task 2 (E2): `chart-theme.ts` bersama + adopsi 7 chart

**Files:**
- Create: `src/lib/chart-theme.ts`
- Test (create): `src/__tests__/chart-theme.test.ts`
- Modify: `src/features/dashboard/CashFlowChart.tsx`, `src/features/reports/TrendChart.tsx`, `src/features/reports/ForecastChart.tsx`, `src/features/net-worth/NetWorthTrendChart.tsx`, `src/features/insights/CategoryComparisonChart.tsx`, `src/features/dashboard/CategoryBreakdown.tsx`

**Interfaces:**
- Produces (dipakai 6 file chart; SavingsRingCard tak butuh axes/tooltip — di luar guard):

```typescript
export const CHART_MARGIN: { top: number; right: number; left: number; bottom: number };
export const chartGridProps: { strokeDasharray: string; stroke: string };
export const chartTickStyle: { fontSize: number; fill: string };
export const chartTooltipStyle: React.CSSProperties;   // border-radius 12, border, card bg, 12px, elevated shadow
export const chartTooltipItemStyle: React.CSSProperties; // font-mono
```

- [ ] **Step 1: Tes gagal** — `src/__tests__/chart-theme.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  CHART_MARGIN,
  chartGridProps,
  chartTickStyle,
  chartTooltipStyle,
  chartTooltipItemStyle,
} from '@/lib/chart-theme';

describe('chart-theme shared config (E2)', () => {
  it('uses token-based colors only', () => {
    expect(chartGridProps.stroke).toBe('var(--chart-grid)');
    expect(chartTickStyle.fill).toBe('var(--muted-foreground)');
    expect(chartTooltipStyle.background).toBe('var(--card)');
    expect(chartTooltipStyle.boxShadow).toBe('var(--elevated-shadow)');
    expect(chartTooltipItemStyle.fontFamily).toBe('var(--font-mono)');
  });
  it('standardizes tick size at 11', () => {
    expect(chartTickStyle.fontSize).toBe(11);
  });
  it('keeps the shared negative-left margin', () => {
    expect(CHART_MARGIN).toEqual({ top: 5, right: 5, left: -20, bottom: 0 });
  });
});

describe('chart components adopt chart-theme (E2 guard)', () => {
  const adopters = [
    'src/features/dashboard/CashFlowChart.tsx',
    'src/features/reports/TrendChart.tsx',
    'src/features/reports/ForecastChart.tsx',
    'src/features/net-worth/NetWorthTrendChart.tsx',
    'src/features/insights/CategoryComparisonChart.tsx',
    'src/features/dashboard/CategoryBreakdown.tsx',
  ];
  for (const file of adopters) {
    it(`${file} imports @/lib/chart-theme and has no inline contentStyle`, () => {
      const src = readFileSync(resolve(file), 'utf-8');
      expect(src).toMatch(/from\s+['"]@\/lib\/chart-theme['"]/);
      expect(src).not.toMatch(/contentStyle=\{\{/);
    });
  }
});
```

Run → FAIL (modul belum ada).

- [ ] **Step 2: Implementasi** — `src/lib/chart-theme.ts`:

```typescript
import type { CSSProperties } from 'react';

/** Shared Recharts styling — single source for all chart surfaces (E2). */
export const CHART_MARGIN = { top: 5, right: 5, left: -20, bottom: 0 };

export const chartGridProps = {
  strokeDasharray: '3 3',
  stroke: 'var(--chart-grid)',
};

export const chartTickStyle = { fontSize: 11, fill: 'var(--muted-foreground)' };

export const chartTooltipStyle: CSSProperties = {
  borderRadius: '12px',
  border: '1px solid var(--border)',
  background: 'var(--card)',
  fontSize: '12px',
  boxShadow: 'var(--elevated-shadow)',
};

export const chartTooltipItemStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
};
```

- [ ] **Step 3: Adopsi per file** (pola sama semua — import lalu ganti literal):
  - `CashFlowChart.tsx`: margin → `CHART_MARGIN`; `<CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />` → `<CartesianGrid {...chartGridProps} />`; kedua axis `tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}` → `tick={chartTickStyle}`; `contentStyle={{…}}` → `contentStyle={chartTooltipStyle}` dan `itemStyle={{ fontFamily: 'var(--font-mono)' }}` → `itemStyle={chartTooltipItemStyle}`.
  - `TrendChart.tsx`: sama; grid `className="stroke-border"` → `{...chartGridProps}`; tick `tick={{ fontSize: 11 }}` + `className="fill-muted-foreground"` → `tick={chartTickStyle}` (hapus className fill).
  - `ForecastChart.tsx`: sama; tick 10 → `chartTickStyle` (11); tooltip fontSize 11px → `chartTooltipStyle` (12px — standar).
  - `NetWorthTrendChart.tsx`: grid → `{...chartGridProps}`; **bug fix**: kedua axis tanpa fill (default #666, rusak di dark) → `tick={chartTickStyle}`; `text-red-500` di CustomTooltip line 80 → `text-neg` (utility E1); tetap custom tooltip (tak pakai contentStyle) tapi WAJIB import chart-theme untuk tick/grid → guard hijau.
  - `CategoryComparisonChart.tsx`: XAxis tick 10 & YAxis tick 11 → keduanya `tick={chartTickStyle}` (YAxis fill foreground boleh tetap: pakai `tick={{ ...chartTickStyle, fill: 'var(--foreground)' }}`); tooltip custom: ganti shell `border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800` → `border-border bg-card`; container cards `border-slate-200 bg-white dark:…` → `border-border-subtle bg-card`; ChangeBadge `bg-red-100 text-red-700 dark:…`/`bg-emerald-100 text-emerald-700 dark:…` → `bg-neg-soft text-neg`/`bg-pos-soft text-pos`.
  - `CategoryBreakdown.tsx`: `contentStyle={{…}}` → `contentStyle={chartTooltipStyle}`; fallback `'#6B7280'` line 25 → `'var(--chart-muted)'`.
- [ ] **Step 4:** `npx vitest run src/__tests__/chart-theme.test.ts` → PASS; `npm run typecheck && npx vitest run` → hijau; `grep -rn "contentStyle={{" src/` → kosong.
- [ ] **Step 5:** Commit: `feat(design): unify chart styling via shared chart-theme module (E2)`

---

### Task 3 (E3 Tier 1–2): Gradien net-worth, DayOfWeekPills, TransactionForm, RecurringTransactionForm, HealthScoreCard

**Files:**
- Modify: `src/features/net-worth/NetWorthDashboardWidget.tsx` (:26 skeleton, :38, :43, :56, :67)
- Modify: `src/features/net-worth/NetWorthSummaryCard.tsx` (:19, :26, :32)
- Modify: `src/features/insights/DayOfWeekPills.tsx` (:43, :73-79)
- Modify: `src/features/transactions/TransactionForm.tsx` (17 kemunculan)
- Modify: `src/features/transactions/RecurringTransactionForm.tsx` (8 kemunculan)
- Modify: `src/features/insights/HealthScoreCard.tsx` (12 kemunculan)

**Interfaces:** Consumes utility E1 (`bg-ink`, `text-paper`, `bg-pos`, `bg-neg`, `text-pos`, `text-neg`, `text-warn`, `bg-pos-soft`, …). Tanpa API baru.

- [ ] **Step 1: Net-worth cards** — perlakuan editorial inversi paper-ink:
  - `NetWorthDashboardWidget.tsx:38` `bg-gradient-to-br from-[#1e3a8a] via-[#1d4ed8] to-[#3b82f6] p-5 text-white` → `bg-ink p-5 text-paper`; `:43` glow `style={{ background: 'rgb(255 255 255 / 0.4)' }}` → hapus div glow ATAU ganti `bg-paper/10` (pilih hapus jika murni dekorasi gradien); `:56` `text-emerald-300`/`text-red-300` → `text-pos-soft`… **catatan:** di atas latar `--ink`, tint soft = warna latar terang; pakai `text-[var(--pos-soft)]`? TIDAK — pos-soft dark adalah hijau gelap. Gunakan pasangan kontras eksplisit di atas ink: `text-success` (mengikuti `--pos`, di dark jadi hijau terang — di light `#1f5b3e` di atas ink `#0a0a0a` KURANG kontras). Solusi terkunci: badge delta memakai chip `bg-paper/10 text-paper` + tanda +/− (warna bukan satu-satunya penanda, sesuai MASTER); `:67` `border-white/15` → `border-paper/15`.
  - `NetWorthSummaryCard.tsx:26` `from-[#1e3a8a] to-[#3b82f6] text-white` → `bg-ink text-paper`; `:19` skeleton `from-blue-900 to-blue-600` → `bg-muted animate-pulse` (samakan dgn pola skeleton kartu); `:32` `border-white/20` → `border-paper/20`.
- [ ] **Step 2: DayOfWeekPills.tsx** — `:76-79` inline `rgba(245,158,11,…)`/`rgba(59,130,246,…)` → `` `color-mix(in srgb, var(--warn) ${Math.round(opacity * 100)}%, transparent)` `` dan `` `color-mix(in srgb, var(--accent) ${Math.round(opacity * 100)}%, transparent)` ``; `:43` `border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900` → `border-border-subtle bg-card`; `:73-74` `text-amber-700 dark:text-amber-300` → `text-warn`, `text-blue-700 dark:text-blue-300` → `text-accent-2`, `border-amber-500/25` → `border-warn/25`.
- [ ] **Step 3: TransactionForm.tsx** — toggle `:176-177` `'bg-emerald-500 text-white'` → `'bg-pos text-paper'`, `'bg-red-500 text-white'` → `'bg-neg text-paper'`; SEMUA `text-red-500` (asterisk :190,:223,:238,:270,:321 + error :212,:233,:261,:313,:356) → `text-destructive`; SEMUA `border-red-500` (:204,:230,:249,:290,:335) → `border-destructive`.
- [ ] **Step 4: RecurringTransactionForm.tsx** — `:116-117` → `'border-pos bg-pos-soft text-pos'` / `'border-neg bg-neg-soft text-neg'` (hapus dark: manual — token sudah dark-aware); asterisks (:130,:145,:162,:184,:206,:226) → `text-destructive`.
- [ ] **Step 5: HealthScoreCard.tsx** — `getRingColor()` :21-23 → `'text-pos' | 'text-warn' | 'text-neg'`; shell :35 `border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 dark:…` → `border-border-subtle bg-card-2`; track :57 `text-slate-200 dark:text-slate-700` → `text-border-subtle`; trend :85,:87 → `text-pos`/`text-neg`; :92 → `text-pos`/`text-neg`; legend dots :104,:115 `bg-emerald-500`/`bg-red-500` → `bg-pos`/`bg-neg`; :118 → `text-neg`.
- [ ] **Step 6:** `npm run typecheck && npx vitest run` → hijau; `grep -n "1e3a8a\|1d4ed8\|3b82f6" src/features/net-worth/*.tsx` → kosong; `grep -n "emerald-500\|red-500" src/features/transactions/TransactionForm.tsx src/features/insights/HealthScoreCard.tsx` → kosong.
- [ ] **Step 7:** Commit: `fix(design): retheme net-worth cards, transaction forms, and health score to editorial tokens (E3 tier 1-2)`

---

### Task 4 (E3 Tier 3–5): Sweep mekanis + fallback kategori + perluasan guard hex

**Files:**
- Modify (per tabel — baris = pengganti): lihat Step 1.
- Modify: `src/features/transactions/CategoryChip.tsx`, `src/features/dashboard/RecentTransactions.tsx`, `src/app/page.tsx:94`, `src/features/transactions/AllTransactionsView.tsx:75`
- Modify: `src/__tests__/no-hardcoded-design-hex.test.ts`

**Interfaces:** Consumes utility E1. Tanpa API baru.

- [ ] **Step 1: Sweep Tier 3** (semua kemunculan TANPA pasangan `dark:` per inventaris — kemunculan yang sudah berpasangan di file yang sama JANGAN disentuh sprint ini):

| File | Baris | Dari → Ke |
|---|---|---|
| `src/components/budget/BudgetCell.tsx` | 29,30,36,37,151,152 | `bg-amber-500`→`bg-warn`; `bg-emerald-500`→`bg-pos`; `border-amber-500/60`→`border-warn/60`; `border-emerald-700/60`→`border-pos/60`; `text-amber-500`→`text-warn`; `text-emerald-500`→`text-pos` |
| `src/components/budget/BudgetCell.tsx` | 87 | `shadow-[0_0_0_3px_rgba(59,130,246,0.15)]` → `shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_15%,transparent)]` |
| `src/features/reports/AnnualSummary.tsx` | 52,53,55,56,174 | `text-red-500`→`text-neg`; `text-emerald-500`→`text-pos`; `bg-red-500`→`bg-neg` |
| `src/components/budget/AnnualBudgetSummary.tsx` | 44,47,52,55 | `text-emerald-500`→`text-pos`; `text-amber-500`→`text-warn` |
| `src/components/budget/BudgetOverview.tsx` | 69,71,72 | `bg-red-500`→`bg-neg`; `bg-amber-500`→`bg-warn`; `bg-emerald-500`→`bg-pos` |
| `src/features/dashboard/BudgetProgress.tsx` | 144,150 | idem pola BudgetOverview; `text-red-500`→`text-neg` |
| `src/components/budget/BudgetCategoryCard.tsx` | 98 | idem pola BudgetOverview |
| `src/features/upload/ConfidenceBar.tsx` | 10 | `bg-emerald-500`→`bg-pos`; `bg-amber-500`→`bg-warn`; `bg-red-500`→`bg-neg` |
| `src/features/dashboard/RecurringDueBanner.tsx` | 203 | `bg-emerald-500`→`bg-pos`; `bg-red-500`→`bg-neg` |
| `src/features/dashboard/BudgetAlertBanner.tsx` | 42 | `text-red-500`→`text-neg`; `text-amber-500`→`text-warn` |
| `src/features/insights/OutlierAlerts.tsx` | 38,64 | `text-emerald-500`→`text-pos`; `text-red-500`→`text-neg` |
| `src/features/insights/OutlierAlerts.tsx` | 32,47,56 | `bg-white border-slate-200 …dark:…`→`bg-card border-border-subtle`; `bg-slate-50 …`→`bg-surface-inset`; `border-l-amber-500`→`border-l-warn` |
| `src/features/insights/BiggestTransactionsCard.tsx` | 33,62 | shell→`bg-card border-border-subtle`; `text-red-500`→`text-neg` |
| `src/features/export/ExportPreview.tsx` | 37 | `text-emerald-600`→`text-pos`; `text-red-600`→`text-neg` |
| `src/features/balances/BalanceCard.tsx` | 72 | `text-red-500`→`text-neg` |
| `src/features/net-worth/AssetsList.tsx` | 40 | `text-emerald-500`→`text-pos` |
| `src/features/net-worth/MonthOverMonthCard.tsx` | 45 | `text-emerald-500`→`text-pos` |
| `src/components/settings/ImportDialog.tsx` | 133,134 | `bg-emerald-500/10`→`bg-pos-soft`; `text-emerald-600`→`text-pos` |
| `src/components/budget/BudgetSuggestionSheet.tsx` | 83 | `text-amber-500`→`text-warn` |
| `src/components/shared/SummaryCard.tsx` | 29,30,31 | `via-emerald-500/50` dkk → `via-pos/50` (ikuti pola paired di :22-24) |
| `src/app/upload/page.tsx` | 159 | `text-emerald-600`→`text-pos` |
| `src/app/upload/bulk/page.tsx` | 102,185 | `text-red-500`/`text-red-400`→`text-neg` |
| `src/components/home/WelcomeHero.tsx` | 26 | `from-blue-50 via-white to-emerald-50 dark:…` → `from-info-soft via-paper to-pos-soft` (hapus rantai dark:) |
| `src/components/layout/HeroHeader.tsx` | 42 | `bg-white/20` → `bg-paper/20` |
| `src/features/dashboard/RecurringDueBanner.tsx` | 195 | `bg-white/60 dark:bg-white/5` → `bg-card-2/60` |

- [ ] **Step 2: Fallback warna kategori** — pola alpha-suffix `${color}15`/`${color}18` pecah bila color = `var(…)`; refactor dua pemakai lalu ganti fallback:
  - `CategoryChip.tsx:9` fallback → `'var(--ink-3)'`; `:14-19` `backgroundColor: \`${color}15\`` → `backgroundColor: \`color-mix(in srgb, ${color} 10%, transparent)\``.
  - `RecentTransactions.tsx:46` fallback → `'var(--ink-3)'`; `:55` `${color}18` → `color-mix(in srgb, ${color} 10%, transparent)`.
  - `src/app/page.tsx:94` dan `AllTransactionsView.tsx:75` `color: '#888'` → `color: 'var(--ink-3)'`.
- [ ] **Step 3: Perluas guard hex** — `no-hardcoded-design-hex.test.ts`: tambah ke `FORBIDDEN_HEX`: `'#1e3a8a', '#1E3A8A', '#1d4ed8', '#1D4ED8', '#3b82f6', '#3B82F6'` dan ganti perintah grep agar meng-exclude sumber sah:

```typescript
out = execSync(
  `git grep -n -F -e "${hex}" -- "src" ` +
    `":(exclude)src/__tests__/no-hardcoded-design-hex.test.ts" ` +
    `":(exclude)src/app/globals.css" ` +
    `":(exclude)src/lib/export-utils.ts" ` +
    `":(exclude)src/lib/chart-renderer.ts" ` +
    `":(exclude)src/lib/chart-xml-injector.ts"`,
  { encoding: 'utf-8' }
);
```

Run test → harus PASS (Task 3 sudah membersihkan net-worth; jika FAIL, sisa kemunculan adalah temuan sweep yang terlewat — bersihkan).

- [ ] **Step 4:** `npm run typecheck && npx vitest run` → hijau penuh.
- [ ] **Step 5:** Commit: `fix(design): sweep raw palette classes and category color fallbacks to editorial tokens (E3 tier 3-5)`

---

### Task 5 (E4.1): Skeleton — `role="status"`, `shadow-card`, normalisasi hand-rolled

**Files:**
- Modify: `src/components/shared/Skeletons.tsx`
- Modify (tambah `shadow-card` + `role="status"` pada root skeleton hand-rolled TANPA shadow): `src/app/budget/page.tsx:81-90`, `src/app/insights/page.tsx:16-32`, `src/components/budget/AnnualBudgetGrid.tsx:49-57`, `src/components/budget/AnnualBudgetSummary.tsx:15-23`, `src/components/budget/ApplyTemplateSheet.tsx:60-66`, `src/components/home/WelcomeHero.tsx:28-33`, `src/features/balances/BalanceGrid.tsx:18-24`, `src/features/net-worth/MonthOverMonthCard.tsx:19`, `src/features/net-worth/NetWorthDashboardWidget.tsx:26`, `src/features/net-worth/NetWorthSummaryCard.tsx:19`
- Modify (hanya `role="status"` — shadow sudah ada): `src/app/page.tsx:123-130`, `src/app/bills/page.tsx:229-236`, `src/app/recurring/page.tsx:95-102`, `src/app/reports/page.tsx:52-62,277-281`, `src/app/savings/page.tsx:27-34`, `src/features/reports/AnnualSummary.tsx:31`
- Modify: `src/app/settings/categories/page.tsx:320-328` (spinner `Loader2` → `<PageSkeleton />`)
- Test (create): `src/__tests__/skeleton-status-role.test.ts`

**Interfaces:** `Skeletons.tsx` exports tak berubah nama; setiap root skeleton kini `role="status"`.

- [ ] **Step 1: Tes gagal** — `src/__tests__/skeleton-status-role.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('shared skeletons announce loading (E4)', () => {
  const src = readFileSync(resolve('src/components/shared/Skeletons.tsx'), 'utf-8');
  it('every exported skeleton root has role="status"', () => {
    const exportCount = (src.match(/export function \w+Skeleton/g) ?? []).length;
    const roleCount = (src.match(/role="status"/g) ?? []).length;
    expect(exportCount).toBeGreaterThanOrEqual(6);
    expect(roleCount).toBeGreaterThanOrEqual(exportCount);
  });
  it('card-shaped skeletons carry shadow-card', () => {
    expect(src).toMatch(/SummaryCardSkeleton[\s\S]*?shadow-card/);
  });
});
```

Run → FAIL.

- [ ] **Step 2:** `Skeletons.tsx` — tambah `role="status"` pada elemen root SETIAP export (`SummaryCardSkeleton`, `ChartCardSkeleton`, `ListSkeleton`, `CardSkeleton`, `PageSkeleton`, `TransactionRowSkeleton`); tambah `shadow-card` pada root ber-border/kartu (`SummaryCardSkeleton`, `ChartCardSkeleton`, `CardSkeleton`).
- [ ] **Step 3:** Sapu daftar file hand-rolled di atas: root div skeleton diberi `role="status"`; yang tanpa shadow diberi `shadow-card` bila elemennya kartu ber-border (samakan chrome dengan kartu termuat — JANGAN restrukturisasi layout). `settings/categories`: ganti blok `Loader2` center dengan `<PageSkeleton />` (import dari `@/components/shared/Skeletons`).
- [ ] **Step 4:** `npx vitest run src/__tests__/skeleton-status-role.test.ts` → PASS; suite penuh hijau.
- [ ] **Step 5:** Commit: `fix(a11y): skeletons announce loading via role=status and match card elevation (E4.1)`

---

### Task 6 (E4.2): Error state dengan retry — insights, net-worth, reports, riwayat upload

**Files:**
- Modify: `src/features/insights/useInsightsData.ts` (ekspos `refetch`)
- Modify: `src/app/insights/page.tsx:52-55`
- Modify: `src/app/net-worth/page.tsx:17-36` (destructure `reload` yang SUDAH ada di `useNetWorth.ts:206`)
- Modify: `src/features/reports/useReportsData.ts:26` (ekspos `isError`+`refetch` trends)
- Modify: `src/app/reports/page.tsx` (render InlineError untuk trends & forecast; forecast error dari `useForecastData.ts:28` yang sudah diekspos tapi diabaikan di `:35`)
- Modify: `src/app/upload/page.tsx:57-65,210-214` (try/catch + state error + loading; `InlineError` sudah diimpor di `:19`)

**Interfaces:**
- `useInsightsData()` kini mengembalikan `{ data, isLoading, error, refetch }` (refetch dari useQuery yang dibungkusnya).
- `useReportsData()` menambah `{ trendsError: boolean; refetchTrends: () => void }` — field lama TIDAK berubah.

- [ ] **Step 1:** Baca keempat hook untuk konfirmasi bentuk react-query; ekspos `refetch`/`isError` sesuai Interfaces (perubahan aditif — pemakai lama tak rusak).
- [ ] **Step 2:** Halaman:
  - `insights/page.tsx`: blok error → `<InlineError message={t(locale, 'error')} onRetry={() => refetch()} />`.
  - `net-worth/page.tsx`: `<p className="text-destructive…">` → `<InlineError message={t(locale, 'error')} onRetry={reload} />`.
  - `reports/page.tsx`: jika `trendsError` → `<InlineError … onRetry={refetchTrends} />` menggantikan chart trends; tab forecast: jika `forecastError` → InlineError dgn retry (bukan jatuh ke "noData" `:307`).
  - `upload/page.tsx`: `fetchUploads` → `try { … if (result.error) throw …; setUploads(result.data ?? []) } catch { setHistoryError(true) }` + state `historyLoading` (render `<ListSkeleton rows={3} />`) + `historyError` (render `<InlineError message={t(locale, 'error')} onRetry={fetchUploads} />`).
- [ ] **Step 3:** `npm run typecheck && npx vitest run` → hijau. `grep -n "InlineError" src/app/insights/page.tsx src/app/net-worth/page.tsx src/app/reports/page.tsx src/app/upload/page.tsx` → ≥1 per file.
- [ ] **Step 4:** Commit: `fix(ux): error states with retry for insights, net-worth, reports, and upload history (E4.2)`

---

### Task 7 (E4.3): Adopsi EmptyState di 26 situs "No data" polos

**Files:**
- Modify (ganti div `{t(locale,'noData')}` polos → `<EmptyState title={t(locale, 'noData')} className="py-6" />` KECUALI dicatat lain): `src/features/dashboard/BillsChecklist.tsx:28-30`, `BudgetProgress.tsx:70-72`, `CashFlowChart.tsx:45-47`, `CategoryBreakdown.tsx:44-46`, `PaymentMethods.tsx:43-45`, `RecentTransactions.tsx:39-41`, `SavingsGoals.tsx:26-28`, `src/components/dashboard/SavingsRingCard.tsx:83,93,99`, `src/app/page.tsx:192-194`, `src/app/reports/page.tsx:307-309`, `src/features/reports/TrendChart.tsx:35-37`, `ForecastChart.tsx:57-59`, `ForecastBreakdownList.tsx:41,76,121-123`, `AnnualSummary.tsx:38-40`, `src/app/insights/page.tsx:57-59`, `src/features/insights/OutlierAlerts.tsx:37-39`, `CategoryComparisonChart.tsx:78-79`, `BiggestTransactionsCard.tsx:38-39`, `src/features/net-worth/LiabilitiesList.tsx:41-42`, `NetWorthTrendChart.tsx:103-104`, `src/features/transactions/TransactionTable.tsx:50-52`, `TransactionFilterSheet.tsx:164`, `AllTransactionsView.tsx:60-62`, `src/features/balances/BalanceGrid.tsx:29-31`, `src/features/export/ExportPreview.tsx:14`, `src/app/upload/bulk/page.tsx:184-187`, `src/features/upload/ImportPreview.tsx:53-56`, `src/components/budget/ApplyTemplateSheet.tsx:70-73`, `BudgetSuggestionSheet.tsx:96-100`, `SaveTemplateDialog.tsx:82-86`, `src/app/upload/page.tsx:210-214` (riwayat upload — pakai deskripsi `emptyUploadHistory`)
- Modify: `src/lib/i18n.ts` (kunci baru — lihat Step 1)
- Test (create): `src/__tests__/empty-state-adoption.test.ts`

**Interfaces:** Consumes `EmptyState` (`src/components/shared/EmptyState.tsx:16`): `{ title: string; description?: string; icon?: ReactNode; className?: string; children?: ReactNode }`. Kunci teks memakai `t(locale, 'noData')` yang SUDAH ada; deskripsi kontekstual opsional hanya untuk situs halaman (bukan widget) via kunci baru.

- [ ] **Step 1: Kunci i18n baru** (tambah di KEDUA kamus):

```typescript
// en
emptyChartHint: 'Add transactions this month to see the chart',
emptyUploadHistory: 'Files you upload will appear here',
// id
emptyChartHint: 'Tambahkan transaksi bulan ini untuk melihat grafik',
emptyUploadHistory: 'File yang kamu unggah akan tampil di sini',
```

Deskripsi HANYA dipakai di: CashFlowChart, TrendChart, ForecastChart (kunci `emptyChartHint`) dan riwayat upload `src/app/upload/page.tsx:211-214` (kunci `emptyUploadHistory`). Situs lain cukup `title` (hindari ledakan kamus).

- [ ] **Step 2: Tes gagal** — `src/__tests__/empty-state-adoption.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const WIDGETS = [
  'src/features/dashboard/BillsChecklist.tsx',
  'src/features/dashboard/BudgetProgress.tsx',
  'src/features/dashboard/CashFlowChart.tsx',
  'src/features/dashboard/CategoryBreakdown.tsx',
  'src/features/dashboard/PaymentMethods.tsx',
  'src/features/dashboard/RecentTransactions.tsx',
  'src/features/dashboard/SavingsGoals.tsx',
];

describe('dashboard widgets use shared EmptyState (E4.3)', () => {
  for (const file of WIDGETS) {
    it(`${file} renders <EmptyState`, () => {
      const src = readFileSync(resolve(file), 'utf-8');
      expect(src).toMatch(/<EmptyState[\s>]/);
    });
  }
});
```

Run → FAIL.

- [ ] **Step 3:** Sapu seluruh daftar file: import `{ EmptyState }` dari `@/components/shared/EmptyState`, ganti div polos dengan `<EmptyState title={t(locale, 'noData')} className="py-6" />`. Pertahankan tinggi kontainer widget (`h-N` wrapper tetap; EmptyState di dalamnya). Situs dengan kunci spesifik yang sudah ada (`txEmpty`, `homeStatsEmpty`, `homeSavingsEmpty`) pakai kunci itu sebagai `title`. Chart kosong tambah `description={t(locale, 'emptyChartHint')}`.
- [ ] **Step 4:** `npx vitest run src/__tests__/empty-state-adoption.test.ts` → PASS; suite + typecheck hijau; `grep -rn "flex h-\[.*items-center justify-center text-sm" src/features/dashboard/` → tak ada lagi div noData polos.
- [ ] **Step 5:** Commit: `fix(ux): adopt shared EmptyState across bare no-data sites (E4.3)`

---

### Task 8 (E4.4): HeroHeader di 9 halaman tersisa + guard test

**Files:**
- Modify: `src/app/bills/page.tsx`, `src/app/savings/page.tsx`, `src/app/recurring/page.tsx`, `src/app/insights/page.tsx`, `src/app/net-worth/page.tsx`, `src/app/export/page.tsx`, `src/app/upload/page.tsx`, `src/app/upload/bulk/page.tsx`, `src/app/settings/categories/page.tsx`
- Test (create): `src/__tests__/page-bills-hero.test.ts` (+ 8 kembarannya: savings, recurring, insights, net-worth, export, upload, upload-bulk, settings-categories)

**Interfaces:** Consumes `HeroHeader` (`src/components/layout/HeroHeader.tsx:8`): `{ title: string; greeting?; subgreeting?; showBack?; onBack?; rightAction?; children?; className? }` — root sudah `lg:hidden`. Pola rujukan: `src/app/reports/page.tsx:48-51` (HeroHeader + PageHeader dibungkus `hidden lg:block`).

- [ ] **Step 1: Tes gagal** — 9 file test, pola persis `page-reports-hero.test.ts` (ganti path halaman):

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/app/bills/page.tsx'), 'utf-8');

describe('Bills page hero mount', () => {
  it('imports HeroHeader', () => {
    expect(src).toMatch(/from\s+['"]@\/components\/layout\/HeroHeader['"]/);
  });
  it('renders <HeroHeader title=', () => {
    expect(src).toMatch(/<HeroHeader[^>]*title=/);
  });
});
```

Run → 9 FAIL.

- [ ] **Step 2:** Per halaman: import HeroHeader; render `<HeroHeader title={t(locale, '<kunciJudulHalaman>')} />` di atas konten (pakai kunci judul halaman yang SUDAH dipakai PageHeader-nya — jangan buat kunci baru); bungkus `PageHeader` existing dengan `<div className="hidden lg:block">…</div>` (contoh: reports:49-51). Terapkan juga pada cabang loading & error halaman bila halaman merender header di sana (ikuti pola reports yang merender HeroHeader di kedua cabang :48,:110).
- [ ] **Step 3:** `npx vitest run src/__tests__/page-*-hero.test.ts` → PASS semua (14 file: 5 lama + 9 baru); suite + typecheck hijau.
- [ ] **Step 4:** Commit: `feat(ui): mount mobile HeroHeader on all remaining pages (E4.4)`

---

### Task 9 (E5.1): `role="progressbar"` + aria-value pada 11 indikator progress

**Files:**
- Modify: `src/components/shared/ProgressRing.tsx` (root fix — mencakup SavingsGoals + savings page)
- Modify: `src/features/insights/HealthScoreCard.tsx` (svg :44-72), `src/components/dashboard/SavingsRingCard.tsx` (:54-67)
- Modify (bar linear — atribut pada div track): `src/components/budget/BudgetOverview.tsx:64`, `BudgetCategoryCard.tsx:94`, `BudgetCell.tsx:161`, `src/features/dashboard/BudgetProgress.tsx:140`, `PaymentMethods.tsx:56`, `src/features/reports/AnnualSummary.tsx:172`, `src/app/page.tsx:166`, `src/features/upload/ConfidenceBar.tsx:22`
- Modify: `src/features/upload/ImportProgress.tsx:29` (`<Progress value={…} aria-label={…} />` — base-ui sudah beri role, tambah nama)
- Modify: `src/lib/i18n.ts` (kunci `progressLabel` bila perlu nama generik)
- Test (create): `src/__tests__/progressbar-aria.test.ts`

**Interfaces:**
- `ProgressRingProps` bertambah `label?: string` (aria-label; opsional agar pemakai lama tetap kompilasi).
- Pola atribut bar: `role="progressbar" aria-valuenow={Math.round(clamped)} aria-valuemin={0} aria-valuemax={100} aria-label={<teks konteks terdekat, mis. nama kategori>}`.

- [ ] **Step 1: Tes gagal** — `src/__tests__/progressbar-aria.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const FILES = [
  'src/components/shared/ProgressRing.tsx',
  'src/features/insights/HealthScoreCard.tsx',
  'src/components/dashboard/SavingsRingCard.tsx',
  'src/components/budget/BudgetOverview.tsx',
  'src/components/budget/BudgetCategoryCard.tsx',
  'src/components/budget/BudgetCell.tsx',
  'src/features/dashboard/BudgetProgress.tsx',
  'src/features/dashboard/PaymentMethods.tsx',
  'src/features/reports/AnnualSummary.tsx',
  'src/app/page.tsx',
  'src/features/upload/ConfidenceBar.tsx',
];

describe('progress indicators expose progressbar semantics (E5.1)', () => {
  for (const file of FILES) {
    it(`${file} has role="progressbar" + aria-valuenow`, () => {
      const src = readFileSync(resolve(file), 'utf-8');
      expect(src).toMatch(/role="progressbar"/);
      expect(src).toMatch(/aria-valuenow=/);
    });
  }
});
```

Run → FAIL semua.

- [ ] **Step 2:** `ProgressRing.tsx` — tambah prop `label?: string`; pada elemen pembungkus svg: `role="progressbar" aria-valuenow={Math.round(Math.min(percentage, 100))} aria-valuemin={0} aria-valuemax={100} aria-label={label}`. Teruskan `label` dari `SavingsGoals.tsx` (nama goal) dan `savings/page.tsx` (nama goal).
- [ ] **Step 3:** Sapu 8 bar linear + 2 ring lain per pola Interfaces (nilai `aria-valuenow` = ekspresi persentase yang SUDAH dipakai untuk `width`/`strokeDashoffset` di baris itu, dibulatkan; `aria-label` = teks konteks terdekat: nama kategori / metode bayar / `t(locale,'confidence')` dsb.). `SavingsRingCard`: atribut di div pembungkus PieChart. `ImportProgress.tsx:29`: tambah `aria-label={t(locale, 'importing')}` (pakai kunci existing bila ada — cek kamus; bila tak ada, tambah pasangan EN/ID).
- [ ] **Step 4:** `npx vitest run src/__tests__/progressbar-aria.test.ts` → PASS; suite + typecheck hijau.
- [ ] **Step 5:** Commit: `fix(a11y): progressbar roles and aria values on all progress indicators (E5.1)`

---

### Task 10 (E5.2): Target sentuh 44px mobile — Button & Input

**Files:**
- Modify: `src/components/ui/button.tsx:25-37`
- Modify: `src/components/ui/input.tsx:12`
- Test (create): `src/__tests__/touch-target-sizes.test.ts`

**Interfaces:** Nama varian TIDAK berubah (`default|xs|sm|lg|icon|icon-xs|icon-sm|icon-lg`); hanya class tinggi menjadi responsif. `xs`/`sm`/`icon-xs`/`icon-sm` SENGAJA tetap (UI padat — pengecualian terdokumentasi di spec).

- [ ] **Step 1: Tes gagal** — `src/__tests__/touch-target-sizes.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const button = readFileSync(resolve('src/components/ui/button.tsx'), 'utf-8');
const input = readFileSync(resolve('src/components/ui/input.tsx'), 'utf-8');

describe('44px mobile touch targets (E5.2)', () => {
  it('button default is 44px on mobile, compact on md+', () => {
    expect(button).toMatch(/default:\s*['"`][^'"`]*h-11[^'"`]*md:h-8/);
  });
  it('button lg is 44px on mobile', () => {
    expect(button).toMatch(/lg:\s*['"`][^'"`]*h-11[^'"`]*md:h-9/);
  });
  it('icon buttons are 44px on mobile', () => {
    expect(button).toMatch(/icon:\s*['"`][^'"`]*size-11[^'"`]*md:size-8/);
  });
  it('input is 44px on mobile', () => {
    expect(input).toMatch(/h-11[^'"`]*md:h-8/);
  });
});
```

Run → FAIL.

- [ ] **Step 2:** `button.tsx` size variants:
  - `default`: `'h-8 gap-1.5 px-2.5 …'` → `'h-11 gap-1.5 px-3 md:h-8 md:px-2.5 …'`
  - `lg`: `'h-9 …'` → `'h-11 px-3 md:h-9 …'`
  - `icon`: `'size-8'` → `'size-11 md:size-8'`
  - `icon-lg`: `'size-9'` → `'size-11 md:size-9'`
  - `xs`/`sm`/`icon-xs`/`icon-sm`: TIDAK diubah.
  `input.tsx:12`: `h-8` → `h-11 md:h-8` (biarkan `text-base md:text-sm` — sudah benar anti-zoom iOS).
- [ ] **Step 3:** `npx vitest run` penuh + `npm run typecheck` → hijau (kalau ada test lama meng-assert class `h-8` literal pada button/input, perbarui ekspektasinya — itu perubahan yang disengaja).
- [ ] **Step 4:** Commit: `fix(a11y): 44px mobile touch targets for button and input primitives (E5.2)`

---

### Task 11 (E5.3): Lantai tipografi 12px — `.ft-eyebrow` + sweep `text-[10px]`

**Files:**
- Modify: `src/app/globals.css:487` (`.ft-eyebrow` `font-size: 10px` → `12px`)
- Modify (54 kemunculan `text-[10px]` → `text-xs`, daftar per file dari inventaris): `src/components/budget/BudgetCategoryCard.tsx` (:59,63,69,140,146,152), `src/features/reports/CurrentMonthForecastCard.tsx` (:64,70,78,110), `src/app/bills/page.tsx` (:324,330,336), `src/features/transactions/TransactionSummary.tsx` (:18,27,36), `src/app/transactions/page.tsx` (:198,206), `src/app/recurring/page.tsx` (:187,194), `src/app/page.tsx` (:148,156), `src/components/budget/BudgetCell.tsx` (:101,108), `src/features/reports/AnnualSummary.tsx` (:58,138), `src/features/dashboard/SavingsGoals.tsx` (:38,42), `src/features/net-worth/AssetsList.tsx` (:20,30), `src/features/net-worth/NetWorthDashboardWidget.tsx` (:46,67), `src/app/savings/page.tsx` (:107), `src/app/settings/categories/page.tsx` (:543), `src/app/reports/page.tsx` (:161), `src/components/shared/PaymentMethodIcon.tsx` (:44), `src/components/shared/IconPicker.tsx` (:83), `src/components/layout/Sidebar.tsx` (:123), `src/components/layout/MobileNav.tsx` (:67), `src/features/upload/ImportPreview.tsx` (:150), `src/features/upload/DropZone.tsx` (:99), `src/components/folders/FolderCard.tsx` (:51), `src/features/navigation/SidebarGroup.tsx` (:57), `src/features/transactions/TransactionTable.tsx` (:108), `src/features/insights/OutlierAlerts.tsx` (:67), `src/features/insights/DayOfWeekPills.tsx` (:85), `src/features/insights/CategoryComparisonChart.tsx` (:57), `src/features/reports/ForecastBreakdownList.tsx` (:89), `src/features/dashboard/RecurringDueBanner.tsx` (:211), `src/features/dashboard/DashboardContent.tsx` (:111), `src/features/dashboard/RecentTransactions.tsx` (:63), `src/features/dashboard/BudgetProgress.tsx` (:150), `src/features/dashboard/BillsChecklist.tsx` (:52), `src/features/net-worth/LiabilitiesList.tsx` (:55)
- Test (create): `src/__tests__/no-sub-12px-text.test.ts`

**Interfaces:** Tidak ada. Perubahan murni class/CSS.

- [ ] **Step 1: Tes gagal** — `src/__tests__/no-sub-12px-text.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('12px typography floor (E5.3 / MASTER.md)', () => {
  it('no text-[<12px] arbitrary classes in src/', () => {
    let out = '';
    try {
      out = execSync(
        `git grep -nE "text-\\[(([0-9])|(1[01]))px\\]" -- "src" ":(exclude)src/__tests__/no-sub-12px-text.test.ts"`,
        { encoding: 'utf-8' }
      );
    } catch (e) {
      const err = e as { status?: number };
      if (err.status === 1) return; // no matches = pass
      throw e;
    }
    expect(out).toBe('');
  });

  it('.ft-eyebrow meets the 12px floor', () => {
    const css = readFileSync(resolve('src/app/globals.css'), 'utf-8');
    const eyebrow = css.slice(css.indexOf('.ft-eyebrow'), css.indexOf('}', css.indexOf('.ft-eyebrow')));
    expect(eyebrow).toContain('font-size: 12px');
  });
});
```

Run → FAIL.

- [ ] **Step 2:** `globals.css:487` `font-size: 10px` → `font-size: 12px`. Sapu 54 kemunculan `text-[10px]` → `text-xs` (find-replace per file dari daftar; `PaymentMethodIcon.tsx:44` map size `md: 'text-[10px]'` → `md: 'text-xs'`).
- [ ] **Step 3:** `npx vitest run src/__tests__/no-sub-12px-text.test.ts` → PASS; suite + typecheck hijau; cek overflow ID: jalankan `npm run build` di Task 13 (teks lebih besar bisa wrap — layout fleksibel kartu aman).
- [ ] **Step 4:** Commit: `fix(a11y): enforce 12px typography floor — eyebrow and text-[10px] sweep (E5.3)`

---

### Task 12 (E5.4): Kebersihan reduced-motion

**Files:**
- Modify: `src/lib/motion.ts:162-167` (hapus `reduceMotionProps` — dead export, 0 pemakai; `MotionConfig reducedMotion="user"` di `StoreProvider.tsx:45` adalah mekanisme yang benar dan SUDAH aktif)
- Modify: `src/components/layout/Sidebar.tsx:49` (animasi width tak tercakup MotionConfig)
- Modify: `src/app/globals.css` blok reduced-motion kedua (:602-615)

**Interfaces:** Tidak ada export baru. `Sidebar` memakai `useReducedMotion()` dari `framer-motion`.

- [ ] **Step 1:** Konfirmasi 0 pemakai: `grep -rn "reduceMotionProps" src/ --include="*.tsx" --include="*.ts"` → hanya `motion.ts` (+ mungkin test motion — jika ada test meng-assert export ini, hapus assertion itu juga). Hapus baris 162–167 `motion.ts`.
- [ ] **Step 2:** `Sidebar.tsx` — di komponen: `const shouldReduceMotion = useReducedMotion();` (import dari `framer-motion`); pada `<motion.aside animate={{ width }}>` tambah `transition={shouldReduceMotion ? { duration: 0 } : undefined}`.
- [ ] **Step 3:** `globals.css` — cari pemakaian `ftFlow`/`ftMarq` (`grep -rn "ftFlow\|ftMarq" src/`); tambahkan class/selector pemakainya ke daftar blok `:602-615` `animation: none !important;` (bila animasi dipasang inline-style, bungkus jadi utility class dulu, mis. `.ft-flow { animation: ftFlow … }`, lalu masukkan `.ft-flow` ke daftar).
- [ ] **Step 4:** `npm run typecheck && npx vitest run` → hijau.
- [ ] **Step 5:** Commit: `fix(a11y): reduced-motion cleanup — dead helper removed, sidebar width and ribbon animations gated (E5.4)`

---

### Task 13: Preflight + PR

- [ ] **Step 1:** `npm run preflight` (format check + typecheck + lint + test + build) → SEMUA hijau. Format error → `npm run format` lalu ulangi.
- [ ] **Step 2:** Smoke visual lokal (`npm run dev`): dashboard, /transactions, /budget, /insights, /net-worth, /reports — cek light + dark (`.dark`), mobile 375px (HeroHeader baru, tombol 44px), chart berwarna editorial.
- [ ] **Step 3:** Push + PR ke `main`: judul `Sprint 3: Design foundation — editorial tokens, chart theme, dark-mode sweep, page states, a11y (E1-E5)`; body merangkum E1–E5 + hasil analisis Playbook Tahap 1 (frontend murni) + daftar guard test baru; akhiri body dengan `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- [ ] **Step 4:** Tunggu CI + Vercel Preview → uji preview login + halaman di Step 2. Merge SETELAH hijau; lalu Tahap 7: `curl https://financial-tracker-v-02.vercel.app/api/health` + `vercel logs` + klik manual 5 menit.

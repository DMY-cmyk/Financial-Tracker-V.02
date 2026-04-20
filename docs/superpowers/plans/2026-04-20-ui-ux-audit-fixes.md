# UI/UX Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 15 UI/UX issues across 20 files covering accessibility (WCAG), dark-mode chart theming, form usability, and navigation polish — with zero new features or behavioral changes.

**Architecture:** All fixes are isolated to their respective component/style files. Fix #1 (CSS color tokens in `globals.css`) is the only dependency other tasks share — chart components reference the new CSS vars. All other fixes are independent of each other.

**Tech Stack:** Next.js 15, React 19, Tailwind v4, Recharts, Framer Motion, shadcn/ui, Vitest + @testing-library/react (happy-dom), TypeScript strict.

**Worktree:** `.worktrees/ui-ux-audit-fixes` — branch `feature/ui-ux-audit-fixes`

**Spec:** `docs/superpowers/specs/2026-04-20-ui-ux-audit-fixes-design.md`

**Run all commands from the worktree root:** `D:\VsCode\Financial Tracker\Financial-Tracker-V.02\.worktrees\ui-ux-audit-fixes`

---

## Pre-flight

Before starting any task, confirm baseline:

```bash
npx vitest run 2>&1 | tail -4
# Expected: 32 passed, 496 passed, 0 failed
```

---

## Task 1: Add CSS color token system to globals.css

> **This task is the foundation for Tasks 12–18. Complete it first.**

**Files:**
- Modify: `src/app/globals.css`
- Test: `src/__tests__/css-color-tokens.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/css-color-tokens.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const css = readFileSync(resolve('src/app/globals.css'), 'utf-8');

describe('CSS color tokens', () => {
  it('defines semantic chart vars in :root', () => {
    expect(css).toContain('--chart-income:');
    expect(css).toContain('--chart-expense:');
    expect(css).toContain('--chart-primary:');
    expect(css).toContain('--chart-muted:');
    expect(css).toContain('--chart-grid:');
  });

  it('defines palette vars in :root', () => {
    expect(css).toContain('--chart-color-1:');
    expect(css).toContain('--chart-color-6:');
  });

  it('overrides semantic vars in .dark', () => {
    const darkSection = css.slice(css.indexOf('.dark'));
    expect(darkSection).toContain('--chart-income:');
    expect(darkSection).toContain('--chart-expense:');
  });

  it('overrides palette vars in .dark', () => {
    const darkSection = css.slice(css.indexOf('.dark'));
    expect(darkSection).toContain('--chart-color-1:');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/css-color-tokens.test.ts
# Expected: FAIL — cannot find '--chart-income:' in globals.css
```

- [ ] **Step 3: Add the color token blocks to globals.css**

Open `src/app/globals.css`. Find the `:root` block. Append these two blocks **before** the closing brace of the file's `:root` section (or at the end of the `:root` block), and add the dark overrides inside the existing `.dark` block:

```css
/* Chart semantic tokens */
  --chart-income: #059669;
  --chart-expense: #DC2626;
  --chart-primary: #3B82F6;
  --chart-muted: #94A3B8;
  --chart-grid: #E2E8F0;
  /* Chart palette tokens (index-based, for dynamic series) */
  --chart-color-1: #3B82F6;
  --chart-color-2: #10B981;
  --chart-color-3: #8B5CF6;
  --chart-color-4: #F59E0B;
  --chart-color-5: #EC4899;
  --chart-color-6: #06B6D4;
```

Inside the existing `.dark { ... }` block, add:

```css
  --chart-income: #34D399;
  --chart-expense: #F87171;
  --chart-primary: #60A5FA;
  --chart-muted: #64748B;
  --chart-grid: #334155;
  --chart-color-1: #60A5FA;
  --chart-color-2: #34D399;
  --chart-color-3: #A78BFA;
  --chart-color-4: #FCD34D;
  --chart-color-5: #F9A8D4;
  --chart-color-6: #67E8F9;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/css-color-tokens.test.ts
# Expected: 4 passed
```

- [ ] **Step 5: TypeScript + lint check**

```bash
npx tsc --noEmit && npx eslint src/app/globals.css --max-warnings 0 2>/dev/null || echo "CSS lint skipped"
# Expected: no TS errors
```

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css src/__tests__/css-color-tokens.test.ts
git commit -m "feat: add CSS chart color token system (semantic + palette vars)"
```

---

## Task 2: Add `lastMonth` i18n key

**Files:**
- Modify: `src/lib/i18n.ts`
- Test: `src/__tests__/i18n-keys.test.ts`

> Note: `thisMonth` already exists in i18n.ts (verified). Only `lastMonth` needs to be added.

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/i18n-keys.test.ts
import { describe, it, expect } from 'vitest';
import { t } from '@/lib/i18n';

describe('i18n keys — audit fixes', () => {
  it('lastMonth returns correct EN string', () => {
    expect(t('en', 'lastMonth')).toBe('Last Month');
  });

  it('lastMonth returns correct ID string', () => {
    expect(t('id', 'lastMonth')).toBe('Bulan Lalu');
  });

  it('thisMonth still returns correct EN string (regression)', () => {
    expect(t('en', 'thisMonth')).toBe('This Month');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/i18n-keys.test.ts
# Expected: FAIL — t('en', 'lastMonth') does not return 'Last Month'
```

- [ ] **Step 3: Add `lastMonth` key to i18n.ts**

In `src/lib/i18n.ts`, find the TypeScript interface that defines the keys (search for `thisMonth: string`). Add `lastMonth: string` immediately after it:

```typescript
  thisMonth: string;
  lastMonth: string;   // ADD THIS LINE
```

Then find the English translations object (where `thisMonth: 'This Month'` appears). Add:

```typescript
    thisMonth: 'This Month',
    lastMonth: 'Last Month',  // ADD THIS LINE
```

Then find the Indonesian translations object (where `thisMonth: 'Bulan Ini'` appears). Add:

```typescript
    thisMonth: 'Bulan Ini',
    lastMonth: 'Bulan Lalu',  // ADD THIS LINE
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/i18n-keys.test.ts
# Expected: 3 passed
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n.ts src/__tests__/i18n-keys.test.ts
git commit -m "feat: add lastMonth i18n key (EN/ID)"
```

---

## Task 3: Wrap StoreProvider with MotionConfig (Fix #4)

**Files:**
- Modify: `src/components/providers/StoreProvider.tsx`
- Test: `src/__tests__/StoreProvider.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StoreProvider } from '@/components/providers/StoreProvider';

describe('StoreProvider', () => {
  it('renders children', () => {
    render(
      <StoreProvider>
        <span data-testid="child">hello</span>
      </StoreProvider>
    );
    expect(screen.getByTestId('child')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it passes (it should — establishes baseline)**

```bash
npx vitest run src/__tests__/StoreProvider.test.tsx
# Expected: 1 passed (baseline)
```

- [ ] **Step 3: Add MotionConfig wrapper to StoreProvider.tsx**

In `src/components/providers/StoreProvider.tsx`:

Add to imports:
```typescript
import { MotionConfig } from 'framer-motion';
```

Wrap the return value:
```typescript
  return (
    <MotionConfig reducedMotion="user">
      <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
    </MotionConfig>
  );
```

- [ ] **Step 4: Run test to verify it still passes**

```bash
npx vitest run src/__tests__/StoreProvider.test.tsx
# Expected: 1 passed
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
# Expected: no errors
```

- [ ] **Step 6: Commit**

```bash
git add src/components/providers/StoreProvider.tsx src/__tests__/StoreProvider.test.tsx
git commit -m "feat: wrap app with MotionConfig reducedMotion='user' for OS reduced-motion support"
```

---

## Task 4: Fix skip link classes in layout.tsx (Fix #2)

**Files:**
- Modify: `src/app/layout.tsx`
- Test: `src/__tests__/layout-skip-link.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/layout-skip-link.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/app/layout.tsx'), 'utf-8');

describe('Skip link classes', () => {
  it('uses focus:absolute (not focus:fixed)', () => {
    expect(src).toContain('focus:absolute');
    expect(src).not.toContain('focus:fixed');
  });

  it('uses focus:z-50 (not focus:z-[100])', () => {
    expect(src).toContain('focus:z-50');
    expect(src).not.toContain('focus:z-[100]');
  });

  it('uses focus:rounded-md (not focus:rounded-lg)', () => {
    expect(src).toContain('focus:rounded-md');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/layout-skip-link.test.ts
# Expected: FAIL — src contains focus:fixed and focus:z-[100]
```

- [ ] **Step 3: Update the three classes in layout.tsx:48**

In `src/app/layout.tsx`, on the `<a href="#main-content"` element, make these three changes to the `className`:

```
focus:fixed     →  focus:absolute
focus:z-[100]   →  focus:z-50
focus:rounded-lg →  focus:rounded-md
```

The result should look like:
```tsx
          className="focus:bg-primary focus:text-primary-foreground sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg"
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/layout-skip-link.test.ts
# Expected: 3 passed
```

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/__tests__/layout-skip-link.test.ts
git commit -m "fix: tweak skip link to focus:absolute/z-50/rounded-md per spec"
```

---

## Task 5: Fix modal backdrop opacity (Fix #7)

**Files:**
- Modify: `src/components/ui/sheet.tsx`
- Modify: `src/components/ui/alert-dialog.tsx`
- Test: `src/__tests__/backdrop-opacity.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/backdrop-opacity.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Modal backdrop opacity', () => {
  it('sheet overlay uses bg-black/25', () => {
    const src = readFileSync(resolve('src/components/ui/sheet.tsx'), 'utf-8');
    expect(src).toContain('bg-black/25');
    expect(src).not.toContain('bg-black/10');
  });

  it('alert-dialog overlay uses bg-black/25', () => {
    const src = readFileSync(resolve('src/components/ui/alert-dialog.tsx'), 'utf-8');
    expect(src).toContain('bg-black/25');
    expect(src).not.toContain('bg-black/10');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/backdrop-opacity.test.ts
# Expected: FAIL — both files contain bg-black/10
```

- [ ] **Step 3: Update sheet.tsx**

In `src/components/ui/sheet.tsx`, find the overlay element (the one with `data-slot="sheet-overlay"`). Change `bg-black/10` to `bg-black/25`:

```typescript
// Before:
'... bg-black/10 ...'
// After:
'... bg-black/25 ...'
```

- [ ] **Step 4: Update alert-dialog.tsx**

In `src/components/ui/alert-dialog.tsx`, find the overlay element (the one with `data-slot="alert-dialog-overlay"`). Change `bg-black/10` to `bg-black/25`:

```typescript
// Before:
'... bg-black/10 ...'
// After:
'... bg-black/25 ...'
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run src/__tests__/backdrop-opacity.test.ts
# Expected: 2 passed
```

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/sheet.tsx src/components/ui/alert-dialog.tsx src/__tests__/backdrop-opacity.test.ts
git commit -m "fix: increase modal backdrop opacity from /10 to /25 for WCAG compliance"
```

---

## Task 6: Fix RecurringTransactionForm missing htmlFor (Fix #8)

**Files:**
- Modify: `src/features/transactions/RecurringTransactionForm.tsx`
- Test: `src/__tests__/RecurringTransactionForm.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { RecurringTransactionForm } from '@/features/transactions/RecurringTransactionForm';

vi.mock('@/lib/api/client', () => ({
  api: {
    categories: { list: vi.fn().mockResolvedValue({ data: { categories: [] } }) },
    paymentMethods: { list: vi.fn().mockResolvedValue({ data: { paymentMethods: [] } }) },
  },
}));

afterEach(() => cleanup());

describe('RecurringTransactionForm — htmlFor accessibility', () => {
  it('description label links to its input via htmlFor', () => {
    const { container } = render(<RecurringTransactionForm onClose={() => {}} />);
    const label = Array.from(container.querySelectorAll('label')).find(
      (l) => l.textContent?.includes('Description')
    );
    expect(label?.getAttribute('for')).toBe('rtf-description');
    expect(container.querySelector('#rtf-description')).not.toBeNull();
  });

  it('amount label links to its input via htmlFor', () => {
    const { container } = render(<RecurringTransactionForm onClose={() => {}} />);
    const label = Array.from(container.querySelectorAll('label')).find(
      (l) => l.textContent?.includes('Amount')
    );
    expect(label?.getAttribute('for')).toBe('rtf-amount');
    expect(container.querySelector('#rtf-amount')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/RecurringTransactionForm.test.tsx
# Expected: FAIL — labels have no 'for' attribute
```

- [ ] **Step 3: Add htmlFor to all Labels and id to all inputs in RecurringTransactionForm.tsx**

In `src/features/transactions/RecurringTransactionForm.tsx`, update each Label + its corresponding input:

**Description field:**
```tsx
<Label htmlFor="rtf-description">{t(locale, 'description')}</Label>
<Input id="rtf-description" ... />
```

**Amount field:**
```tsx
<Label htmlFor="rtf-amount">{t(locale, 'amount')}</Label>
<Input id="rtf-amount" ... />
```

**Category field** (select):
```tsx
<Label htmlFor="rtf-category">{t(locale, 'category')}</Label>
<select id="rtf-category" ... >
```

**Payment Method field** (select):
```tsx
<Label htmlFor="rtf-paymentMethod">{t(locale, 'paymentMethod')}</Label>
<select id="rtf-paymentMethod" ... >
```

**Frequency field** (select):
```tsx
<Label htmlFor="rtf-frequency">{t(locale, 'frequency')}</Label>
<select id="rtf-frequency" ... >
```

**Start Date field:**
```tsx
<Label htmlFor="rtf-startDate">{t(locale, 'startDate')}</Label>
<Input id="rtf-startDate" ... />
```

**End Date field:**
```tsx
<Label htmlFor="rtf-endDate">{t(locale, 'endDate')}</Label>
<Input id="rtf-endDate" ... />
```

**Notes field:**
```tsx
<Label htmlFor="rtf-notes">{t(locale, 'notes')}</Label>
<Input id="rtf-notes" ... />
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/RecurringTransactionForm.test.tsx
# Expected: 2 passed
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
# Expected: no errors
```

- [ ] **Step 6: Commit**

```bash
git add src/features/transactions/RecurringTransactionForm.tsx src/__tests__/RecurringTransactionForm.test.tsx
git commit -m "fix: add htmlFor/id linkage to all labels in RecurringTransactionForm"
```

---

## Task 7: Add required asterisks to both forms (Fix #9)

**Files:**
- Modify: `src/features/transactions/RecurringTransactionForm.tsx`
- Modify: `src/features/transactions/TransactionForm.tsx`
- Test: `src/__tests__/form-required-indicators.test.tsx`

> **Depends on Task 6** (RecurringTransactionForm htmlFor must be in place first)

**Required fields per Zod schema:**
- `RecurringTransactionForm`: description, amount, category, paymentMethod, frequency, startDate
- `TransactionForm`: amount, date, category, description, paymentMethod

- [ ] **Step 1: Write the failing test**

```typescript
// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { RecurringTransactionForm } from '@/features/transactions/RecurringTransactionForm';
import { TransactionForm } from '@/features/transactions/TransactionForm';

vi.mock('@/lib/api/client', () => ({
  api: {
    categories: { list: vi.fn().mockResolvedValue({ data: { categories: [] } }) },
    paymentMethods: { list: vi.fn().mockResolvedValue({ data: { paymentMethods: [] } }) },
  },
}));

afterEach(() => cleanup());

describe('Required field indicators', () => {
  it('RecurringTransactionForm shows asterisk on description label', () => {
    const { container } = render(<RecurringTransactionForm onClose={() => {}} />);
    const label = Array.from(container.querySelectorAll('label')).find(
      (l) => l.textContent?.includes('Description')
    );
    expect(label?.querySelector('.text-red-500')).not.toBeNull();
  });

  it('TransactionForm shows asterisk on amount label', () => {
    const { container } = render(
      <TransactionForm onSave={() => Promise.resolve()} onCancel={() => {}} />
    );
    const label = Array.from(container.querySelectorAll('label')).find(
      (l) => l.textContent?.includes('Amount')
    );
    expect(label?.querySelector('.text-red-500')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/form-required-indicators.test.tsx
# Expected: FAIL — no .text-red-500 spans in labels
```

- [ ] **Step 3: Add asterisks to RecurringTransactionForm required fields**

For each required field label in `src/features/transactions/RecurringTransactionForm.tsx` (description, amount, category, paymentMethod, frequency, startDate), add the asterisk span:

```tsx
<Label htmlFor="rtf-description">
  {t(locale, 'description')}
  <span className="ml-0.5 text-red-500">*</span>
</Label>

<Label htmlFor="rtf-amount">
  {t(locale, 'amount')}
  <span className="ml-0.5 text-red-500">*</span>
</Label>

<Label htmlFor="rtf-category">
  {t(locale, 'category')}
  <span className="ml-0.5 text-red-500">*</span>
</Label>

<Label htmlFor="rtf-paymentMethod">
  {t(locale, 'paymentMethod')}
  <span className="ml-0.5 text-red-500">*</span>
</Label>

<Label htmlFor="rtf-frequency">
  {t(locale, 'frequency')}
  <span className="ml-0.5 text-red-500">*</span>
</Label>

<Label htmlFor="rtf-startDate">
  {t(locale, 'startDate')}
  <span className="ml-0.5 text-red-500">*</span>
</Label>
```

Do NOT add asterisks to endDate or notes — they are optional.

- [ ] **Step 4: Add asterisks to TransactionForm required fields**

For each required field label in `src/features/transactions/TransactionForm.tsx` (amount, date, category, description, paymentMethod), add the asterisk span inside the Label:

```tsx
<Label htmlFor="amount">
  {t(locale, 'amount')}
  <span className="ml-0.5 text-red-500">*</span>
</Label>

<Label htmlFor="date">
  {t(locale, 'date')}
  <span className="ml-0.5 text-red-500">*</span>
</Label>

<Label htmlFor="category">
  {t(locale, 'category')}
  <span className="ml-0.5 text-red-500">*</span>
</Label>

<Label htmlFor="description">
  {t(locale, 'description')}
  <span className="ml-0.5 text-red-500">*</span>
</Label>

<Label htmlFor="paymentMethod">
  {t(locale, 'paymentMethod')}
  <span className="ml-0.5 text-red-500">*</span>
</Label>
```

Do NOT add asterisk to notes — it is optional.

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run src/__tests__/form-required-indicators.test.tsx
# Expected: 2 passed
```

- [ ] **Step 6: Commit**

```bash
git add src/features/transactions/RecurringTransactionForm.tsx src/features/transactions/TransactionForm.tsx src/__tests__/form-required-indicators.test.tsx
git commit -m "feat: add required field asterisks to TransactionForm and RecurringTransactionForm"
```

---

## Task 8: Add ARIA roles to DayOfWeekPills (Fix #10)

**Files:**
- Modify: `src/features/insights/DayOfWeekPills.tsx`
- Test: `src/__tests__/DayOfWeekPills.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { DayOfWeekPills } from '@/features/insights/DayOfWeekPills';
import type { DayOfWeekItem } from '@/lib/api/contracts';

afterEach(() => cleanup());

const mockData: DayOfWeekItem[] = [
  { dayIndex: 0, totalAmount: 100000 },
  { dayIndex: 1, totalAmount: 200000 },
];

describe('DayOfWeekPills accessibility', () => {
  it('pill container has role="list" with aria-label', () => {
    render(<DayOfWeekPills data={mockData} locale="en" />);
    const list = screen.getByRole('list');
    expect(list).toBeDefined();
    expect(list.getAttribute('aria-label')).toBeTruthy();
  });

  it('each pill has role="listitem" with aria-label containing day name', () => {
    render(<DayOfWeekPills data={mockData} locale="en" />);
    const items = screen.getAllByRole('listitem');
    expect(items.length).toBe(mockData.length);
    expect(items[0].getAttribute('aria-label')).toContain('Sun');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/DayOfWeekPills.test.tsx
# Expected: FAIL — no elements with role="list" found
```

- [ ] **Step 3: Add roles to DayOfWeekPills.tsx**

In `src/features/insights/DayOfWeekPills.tsx`, update the pill row `div` (the one with `className="flex justify-between gap-1.5"`):

```tsx
{/* Pill row */}
<div
  role="list"
  aria-label={t(locale, 'spendingByDay')}
  className="flex justify-between gap-1.5"
>
  {sorted.map((day) => {
    const ratio = day.totalAmount / maxAmount;
    const opacity = allZero ? 0.15 : 0.15 + ratio * 0.45;
    const isTop2 = !allZero && top2Indices.has(day.dayIndex);
    const dayName = dayNames[day.dayIndex];
    const formattedAmount = allZero ? '0' : compactAmount(day.totalAmount);

    return (
      <div
        key={day.dayIndex}
        role="listitem"
        aria-label={`${dayName}: ${formattedAmount}`}
        className="flex flex-1 flex-col items-center gap-1.5"
      >
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/DayOfWeekPills.test.tsx
# Expected: 2 passed
```

- [ ] **Step 5: Commit**

```bash
git add src/features/insights/DayOfWeekPills.tsx src/__tests__/DayOfWeekPills.test.tsx
git commit -m "fix: add role=list/listitem and aria-labels to DayOfWeekPills"
```

---

## Task 9: Fix HealthScoreCard SVG aria-label and ring animation (Fixes #3, #12)

**Files:**
- Modify: `src/features/insights/HealthScoreCard.tsx`
- Test: `src/__tests__/HealthScoreCard.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { HealthScoreCard } from '@/features/insights/HealthScoreCard';
import type { HealthScore } from '@/lib/api/contracts';

afterEach(() => cleanup());

const mockHealthScore: HealthScore = {
  income: 5000000,
  expense: 3000000,
  savingsRate: 40,
  lastMonthRate: 35,
  rateChange: 5,
};

describe('HealthScoreCard accessibility', () => {
  it('SVG ring has role="img"', () => {
    const { container } = render(
      <HealthScoreCard healthScore={mockHealthScore} locale="en" />
    );
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
  });

  it('SVG ring has aria-label containing the savings rate', () => {
    const { container } = render(
      <HealthScoreCard healthScore={mockHealthScore} locale="en" />
    );
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-label')).toContain('40');
  });

  it('foreground ring circle uses duration-500 (not duration-700)', () => {
    const src = require('fs').readFileSync(
      require('path').resolve('src/features/insights/HealthScoreCard.tsx'),
      'utf-8'
    );
    expect(src).toContain('duration-500');
    expect(src).not.toContain('duration-700');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/HealthScoreCard.test.tsx
# Expected: FAIL — SVG has no role/aria-label, and file contains duration-700
```

- [ ] **Step 3: Update HealthScoreCard.tsx**

In `src/features/insights/HealthScoreCard.tsx`:

1. Add `role="img"` and `aria-label` to the `<svg>` element:

```tsx
<svg
  role="img"
  aria-label={`${t(locale, 'healthScore')}: ${Math.round(savingsRate)}%`}
  width={RING_RADIUS * 2 + RING_STROKE * 2}
  height={RING_RADIUS * 2 + RING_STROKE * 2}
  className="-rotate-90"
>
```

2. Change `duration-700` to `duration-500` on the foreground ring circle:

```tsx
className={cn(ringColor, 'transition-all duration-500')}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/HealthScoreCard.test.tsx
# Expected: 3 passed
```

- [ ] **Step 5: Commit**

```bash
git add src/features/insights/HealthScoreCard.tsx src/__tests__/HealthScoreCard.test.tsx
git commit -m "fix: add SVG role=img/aria-label to HealthScoreCard ring, reduce animation to 500ms"
```

---

## Task 10: Add section grouping to BottomNav More drawer (Fix #14)

**Files:**
- Modify: `src/components/layout/BottomNav.tsx`
- Test: `src/__tests__/BottomNav.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { BottomNav } from '@/components/layout/BottomNav';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

afterEach(() => cleanup());

describe('BottomNav More drawer grouping', () => {
  it('More drawer renders Finance section header', () => {
    const { container } = render(<BottomNav />);
    // Open the More drawer by finding moreItems structure in DOM
    // The section headers are rendered inside the Sheet content
    const src = require('fs').readFileSync(
      require('path').resolve('src/components/layout/BottomNav.tsx'),
      'utf-8'
    );
    expect(src).toContain('Finance');
    expect(src).toContain('Tools');
    expect(src).toContain('Settings');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/BottomNav.test.tsx
# Expected: FAIL — source does not contain section header strings
```

- [ ] **Step 3: Add grouped rendering to BottomNav.tsx**

In `src/components/layout/BottomNav.tsx`, replace the `moreItems` flat array definition and its rendering in the Sheet with grouped rendering.

First, replace the `moreItems` flat array with a grouped structure:

```typescript
const moreGroups: { label: string; labelId: string; items: typeof mainItems }[] = [
  {
    label: 'Finance',
    labelId: 'finance',
    items: [
      { href: '/bills', key: 'bills', icon: CalendarCheck },
      { href: '/recurring', key: 'recurringTransactions', icon: Repeat },
      { href: '/savings', key: 'savingsPage', icon: PiggyBank },
      { href: '/insights', key: 'insights', icon: TrendingUp },
    ],
  },
  {
    label: 'Tools',
    labelId: 'tools',
    items: [
      { href: '/reports', key: 'reports', icon: BarChart3 },
      { href: '/upload', key: 'upload', icon: Upload },
      { href: '/export', key: 'export', icon: Download },
    ],
  },
  {
    label: 'Settings',
    labelId: 'settings',
    items: [
      { href: '/settings', key: 'settings', icon: Settings },
      { href: '/settings/categories', key: 'categories', icon: Tag },
    ],
  },
];

// Keep moreItems as a flat list for isMoreActive calculation
const moreItems = moreGroups.flatMap((g) => g.items);
```

Then replace the flat `<div className="grid grid-cols-4 gap-3">` rendering inside the Sheet with:

```tsx
<div className="space-y-4">
  {moreGroups.map((group, gi) => (
    <div key={group.labelId}>
      {gi > 0 && <div className="border-border border-t" />}
      <p className="text-muted-foreground mb-2 px-1 pt-2 text-[10px] font-semibold uppercase tracking-widest">
        {group.label}
      </p>
      <div className="grid grid-cols-4 gap-3">
        {group.items.map(({ href, key, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMoreOpen(false)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl p-3 text-xs transition-colors',
              isActive(href)
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-center leading-tight">{t(locale, key)}</span>
          </Link>
        ))}
      </div>
    </div>
  ))}
</div>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/BottomNav.test.tsx
# Expected: 1 passed
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
# Expected: no errors
```

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/BottomNav.tsx src/__tests__/BottomNav.test.tsx
git commit -m "feat: add Finance/Tools/Settings section grouping to BottomNav More drawer"
```

---

## Task 11: Fix color indicators in BiggestTransactionsCard and OutlierAlerts (Fixes #11, #16)

**Files:**
- Modify: `src/features/insights/BiggestTransactionsCard.tsx`
- Modify: `src/features/insights/OutlierAlerts.tsx`
- Test: `src/__tests__/color-indicators.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { BiggestTransactionsCard } from '@/features/insights/BiggestTransactionsCard';
import type { BiggestTransaction } from '@/lib/api/contracts';

afterEach(() => cleanup());

const mockTransactions: BiggestTransaction[] = [
  {
    id: '1',
    description: 'Grocery shopping',
    category: 'Food',
    date: '2026-04-10',
    amount: 350000,
    color: '#F59E0B',
  },
];

describe('BiggestTransactionsCard — color indicator accessibility', () => {
  it('category color dot has aria-hidden="true"', () => {
    const { container } = render(
      <BiggestTransactionsCard transactions={mockTransactions} locale="en" />
    );
    const dot = container.querySelector('[style*="background"]');
    expect(dot?.getAttribute('aria-hidden')).toBe('true');
  });

  it('amount has minus prefix for expense', () => {
    const { container } = render(
      <BiggestTransactionsCard transactions={mockTransactions} locale="en" />
    );
    const amountEl = container.querySelector('.font-mono');
    expect(amountEl?.textContent).toMatch(/^-/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/color-indicators.test.tsx
# Expected: FAIL — dot has no aria-hidden, amount has no minus prefix
```

- [ ] **Step 3: Update BiggestTransactionsCard.tsx**

In `src/features/insights/BiggestTransactionsCard.tsx`:

1. Add `aria-hidden="true"` to the category color dot:

```tsx
<div
  aria-hidden="true"
  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
  style={{ backgroundColor: tx.color }}
/>
```

2. Add minus prefix to the amount. The `idrFormatter.format(tx.amount)` already returns positive — prepend `-`:

```tsx
<span className="flex-shrink-0 font-mono text-sm font-semibold text-red-500">
  -{idrFormatter.format(tx.amount)}
</span>
```

- [ ] **Step 4: Update OutlierAlerts.tsx**

In `src/features/insights/OutlierAlerts.tsx`, add a minus prefix to the outlier amount (OutlierAlerts shows expense spikes — always expenses):

```tsx
<p className="font-mono text-sm font-semibold text-red-500">
  -{idrFormatter.format(outlier.amount)}
</p>
```

> OutlierAlerts has no color dot — the amber left border is the visual indicator. No `aria-hidden` change needed there.

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run src/__tests__/color-indicators.test.tsx
# Expected: 2 passed
```

- [ ] **Step 6: Commit**

```bash
git add src/features/insights/BiggestTransactionsCard.tsx src/features/insights/OutlierAlerts.tsx src/__tests__/color-indicators.test.tsx
git commit -m "fix: add aria-hidden to category dots and minus prefix to expense amounts in Insights"
```

---

## Task 12: Update CashFlowChart — CSS vars, Legend, aria wrapper, tooltip mono (Fixes #1, #6, #13, #16)

> **Depends on Task 1** (CSS vars must be in globals.css first)

**Files:**
- Modify: `src/features/dashboard/CashFlowChart.tsx`
- Test: `src/__tests__/CashFlowChart.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/CashFlowChart.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/features/dashboard/CashFlowChart.tsx'), 'utf-8');

describe('CashFlowChart — CSS vars and accessibility', () => {
  it('uses var(--chart-income) instead of hardcoded #059669', () => {
    expect(src).toContain('var(--chart-income)');
    expect(src).not.toContain('#059669');
  });

  it('uses var(--chart-expense) instead of hardcoded #DC2626', () => {
    expect(src).toContain('var(--chart-expense)');
    expect(src).not.toContain('#DC2626');
  });

  it('includes a Legend component', () => {
    expect(src).toContain('<Legend');
  });

  it('wraps ResponsiveContainer with role="img"', () => {
    expect(src).toContain('role="img"');
  });

  it('tooltip uses itemStyle with monospace font', () => {
    expect(src).toContain('itemStyle');
    expect(src).toContain('monospace');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/CashFlowChart.test.ts
# Expected: FAIL — hardcoded hex colors present, no Legend, no aria wrapper
```

- [ ] **Step 3: Update CashFlowChart.tsx**

In `src/features/dashboard/CashFlowChart.tsx`:

**a) Add `Legend` to imports:**

```typescript
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
```

**b) Replace both `<linearGradient>` `<stop>` elements to use CSS vars via `style` prop:**

```tsx
<linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" style={{ stopColor: 'var(--chart-income)', stopOpacity: 0.2 }} />
  <stop offset="100%" style={{ stopColor: 'var(--chart-income)', stopOpacity: 0 }} />
</linearGradient>
<linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" style={{ stopColor: 'var(--chart-expense)', stopOpacity: 0.2 }} />
  <stop offset="100%" style={{ stopColor: 'var(--chart-expense)', stopOpacity: 0 }} />
</linearGradient>
```

**c) Replace `stroke` props on the two `<Area>` elements:**

```tsx
<Area
  type="monotone"
  dataKey="income"
  stroke="var(--chart-income)"
  strokeWidth={2}
  fill="url(#incomeGrad)"
/>
<Area
  type="monotone"
  dataKey="expense"
  stroke="var(--chart-expense)"
  strokeWidth={2}
  fill="url(#expenseGrad)"
/>
```

**d) Add `itemStyle` with monospace font to `<Tooltip>`:**

```tsx
<Tooltip
  contentStyle={{
    borderRadius: '12px',
    border: '1px solid var(--border)',
    background: 'var(--card)',
    fontSize: '12px',
  }}
  itemStyle={{ fontFamily: 'monospace' }}
  formatter={(value, name) => [
    formatCurrencyShort(Number(value)),
    String(name) === 'income' ? 'Income' : 'Expense',
  ]}
/>
```

**e) Add `<Legend>` inside `<AreaChart>` (after the last `<Area>`):**

```tsx
<Legend
  verticalAlign="bottom"
  height={36}
  formatter={(value: string) => t(locale, value)}
/>
```

**f) Wrap the `<ResponsiveContainer>` with an accessible `role="img"` div:**

```tsx
<div role="img" aria-label={t(locale, 'cashFlow')} className="h-full">
  <ResponsiveContainer width="100%" height="100%">
    ...
  </ResponsiveContainer>
</div>
```

Remove the outer `<div className="h-full transition-[clip-path]...">` wrapper — it wraps the accessible div instead:

```tsx
<div
  className="h-full transition-[clip-path] duration-700 ease-out"
  style={{ clipPath: revealed ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)' }}
>
  <div role="img" aria-label={t(locale, 'cashFlow')} className="h-full">
    <ResponsiveContainer width="100%" height="100%">
      ...
    </ResponsiveContainer>
  </div>
</div>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/CashFlowChart.test.ts
# Expected: 5 passed
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
# Expected: no errors
```

- [ ] **Step 6: Commit**

```bash
git add src/features/dashboard/CashFlowChart.tsx src/__tests__/CashFlowChart.test.ts
git commit -m "fix: use CSS vars in CashFlowChart, add Legend, aria wrapper, and monospace tooltip"
```

---

## Task 13: Update CategoryBreakdown — CSS vars and aria wrapper (Fixes #1, #13)

> **Depends on Task 1**

**Files:**
- Modify: `src/features/dashboard/CategoryBreakdown.tsx`
- Test: `src/__tests__/CategoryBreakdown.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/CategoryBreakdown.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/features/dashboard/CategoryBreakdown.tsx'), 'utf-8');

describe('CategoryBreakdown — accessibility', () => {
  it('wraps chart with role="img"', () => {
    expect(src).toContain('role="img"');
  });

  it('has aria-label on chart wrapper', () => {
    expect(src).toContain('aria-label');
  });
});
```

> Note: CategoryBreakdown uses `cat?.color` from DB and `CATEGORY_COLORS` fallbacks — these are not chart income/expense colors. No CSS var replacement needed here beyond the aria wrapper.

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/CategoryBreakdown.test.ts
# Expected: FAIL — no role="img" in source
```

- [ ] **Step 3: Update CategoryBreakdown.tsx**

In `src/features/dashboard/CategoryBreakdown.tsx`, wrap the `<ResponsiveContainer>` with an accessible div. Find the `<div className="mx-auto h-40 w-40">` wrapping the `<ResponsiveContainer>` and update it:

```tsx
<div className="mx-auto h-40 w-40">
  <div role="img" aria-label={t(locale, 'categoryBreakdown')} className="h-full w-full">
    <ResponsiveContainer width="100%" height="100%">
      ...
    </ResponsiveContainer>
  </div>
</div>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/CategoryBreakdown.test.ts
# Expected: 2 passed
```

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/CategoryBreakdown.tsx src/__tests__/CategoryBreakdown.test.ts
git commit -m "fix: add role=img aria wrapper to CategoryBreakdown chart"
```

---

## Task 14: Update ForecastChart — CSS vars (Fix #1)

> **Depends on Task 1**

**Files:**
- Modify: `src/features/reports/ForecastChart.tsx`
- Test: `src/__tests__/ForecastChart.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/ForecastChart.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/features/reports/ForecastChart.tsx'), 'utf-8');

describe('ForecastChart — CSS vars', () => {
  it('uses var(--chart-income) instead of #059669', () => {
    expect(src).toContain('var(--chart-income)');
    expect(src).not.toContain('#059669');
  });

  it('uses var(--chart-expense) instead of #DC2626', () => {
    expect(src).toContain('var(--chart-expense)');
    expect(src).not.toContain('#DC2626');
  });

  it('gradient stops use style prop (not stopColor attribute)', () => {
    expect(src).toContain("style={{ stopColor: 'var(--chart-income)'");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/ForecastChart.test.ts
# Expected: FAIL — hardcoded hex found in file
```

- [ ] **Step 3: Update ForecastChart.tsx**

In `src/features/reports/ForecastChart.tsx`, replace all `stopColor="#059669"` with `style={{ stopColor: 'var(--chart-income)', stopOpacity: <original_value> }}` and all `stopColor="#DC2626"` with `style={{ stopColor: 'var(--chart-expense)', stopOpacity: <original_value> }}`.

Remove the now-redundant `stopOpacity={...}` attribute when moving to `style` prop (put it inside the style object instead).

For `stroke` props on Area/Line components, replace:
- `stroke="#059669"` → `stroke="var(--chart-income)"`
- `stroke="#DC2626"` → `stroke="var(--chart-expense)"`

The file has 4 gradient definitions (fcIncomeGrad, fcExpenseGrad, fcProjIncomeGrad, fcProjExpenseGrad) and 4 Area components (lines 183–217). Update all of them.

Example for one gradient:
```tsx
<linearGradient id="fcIncomeGrad" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" style={{ stopColor: 'var(--chart-income)', stopOpacity: 0.2 }} />
  <stop offset="100%" style={{ stopColor: 'var(--chart-income)', stopOpacity: 0 }} />
</linearGradient>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/ForecastChart.test.ts
# Expected: 3 passed
```

- [ ] **Step 5: Commit**

```bash
git add src/features/reports/ForecastChart.tsx src/__tests__/ForecastChart.test.ts
git commit -m "fix: replace hardcoded hex colors with CSS vars in ForecastChart"
```

---

## Task 15: Update TrendChart — CSS vars (Fix #1)

> **Depends on Task 1**

**Files:**
- Modify: `src/features/reports/TrendChart.tsx`
- Test: `src/__tests__/TrendChart.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/TrendChart.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/features/reports/TrendChart.tsx'), 'utf-8');

describe('TrendChart — CSS vars', () => {
  it('uses var(--chart-income) instead of #059669', () => {
    expect(src).toContain('var(--chart-income)');
    expect(src).not.toContain('#059669');
  });

  it('uses var(--chart-expense) instead of #DC2626', () => {
    expect(src).toContain('var(--chart-expense)');
    expect(src).not.toContain('#DC2626');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/TrendChart.test.ts
# Expected: FAIL
```

- [ ] **Step 3: Update TrendChart.tsx**

In `src/features/reports/TrendChart.tsx`, apply the same pattern as ForecastChart. The file has 2 gradients (trendIncomeGrad, trendExpenseGrad) and 2 Area components. Replace all occurrences:

- `stopColor="#059669"` → `style={{ stopColor: 'var(--chart-income)', stopOpacity: <value> }}` (remove standalone `stopOpacity` prop)
- `stopColor="#DC2626"` → `style={{ stopColor: 'var(--chart-expense)', stopOpacity: <value> }}`
- `stroke="#059669"` → `stroke="var(--chart-income)"`
- `stroke="#DC2626"` → `stroke="var(--chart-expense)"`

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/TrendChart.test.ts
# Expected: 2 passed
```

- [ ] **Step 5: Commit**

```bash
git add src/features/reports/TrendChart.tsx src/__tests__/TrendChart.test.ts
git commit -m "fix: replace hardcoded hex colors with CSS vars in TrendChart"
```

---

## Task 16: Update NetWorthTrendChart — CSS vars (Fix #1)

> **Depends on Task 1**

**Files:**
- Modify: `src/features/net-worth/NetWorthTrendChart.tsx`
- Test: `src/__tests__/NetWorthTrendChart.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/NetWorthTrendChart.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/features/net-worth/NetWorthTrendChart.tsx'), 'utf-8');

describe('NetWorthTrendChart — CSS vars', () => {
  it('uses var(--chart-primary) instead of #2563eb', () => {
    expect(src).toContain('var(--chart-primary)');
    expect(src).not.toContain('#2563eb');
  });

  it('gradient stop uses style prop', () => {
    expect(src).toContain("style={{ stopColor: 'var(--chart-primary)'");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/NetWorthTrendChart.test.ts
# Expected: FAIL
```

- [ ] **Step 3: Update NetWorthTrendChart.tsx**

In `src/features/net-worth/NetWorthTrendChart.tsx`, the chart uses `#2563eb` (blue-600, the primary chart color):

- Gradient at lines 123–124:
```tsx
<stop offset="5%" style={{ stopColor: 'var(--chart-primary)', stopOpacity: 0.3 }} />
<stop offset="95%" style={{ stopColor: 'var(--chart-primary)', stopOpacity: 0 }} />
```

- Area/Line stroke at line 144:
```tsx
stroke="var(--chart-primary)"
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/NetWorthTrendChart.test.ts
# Expected: 2 passed
```

- [ ] **Step 5: Commit**

```bash
git add src/features/net-worth/NetWorthTrendChart.tsx src/__tests__/NetWorthTrendChart.test.ts
git commit -m "fix: replace hardcoded hex colors with CSS vars in NetWorthTrendChart"
```

---

## Task 17: Update CategoryComparisonChart — CSS vars, i18n, aria wrapper (Fixes #1, #5, #13)

> **Depends on Task 1 (CSS vars) AND Task 2 (lastMonth i18n key)**

**Files:**
- Modify: `src/features/insights/CategoryComparisonChart.tsx`
- Test: `src/__tests__/CategoryComparisonChart.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/CategoryComparisonChart.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/features/insights/CategoryComparisonChart.tsx'), 'utf-8');

describe('CategoryComparisonChart — CSS vars, i18n, aria', () => {
  it('uses var(--chart-primary) instead of #3B82F6', () => {
    expect(src).toContain('var(--chart-primary)');
    expect(src).not.toContain('#3B82F6');
  });

  it('uses var(--chart-muted) instead of #475569', () => {
    expect(src).toContain('var(--chart-muted)');
    expect(src).not.toContain('#475569');
  });

  it('uses t(locale) for thisMonth/lastMonth (no hardcoded strings)', () => {
    expect(src).not.toContain("'This Month'");
    expect(src).not.toContain("'Last Month'");
    expect(src).toContain("'thisMonth'");
    expect(src).toContain("'lastMonth'");
  });

  it('chart has role="img" wrapper', () => {
    expect(src).toContain('role="img"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/CategoryComparisonChart.test.ts
# Expected: FAIL — hardcoded colors and strings present
```

- [ ] **Step 3: Update CategoryComparisonChart.tsx**

**a) Add `locale` prop to `CustomTooltipProps` and update `CustomTooltip`:**

```typescript
interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  locale?: 'en' | 'id';
}

function CustomTooltip({ active, payload, label, locale = 'en' }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-800">
      <p className="mb-1.5 text-xs font-semibold">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">
            {t(locale, entry.dataKey === 'thisMonth' ? 'thisMonth' : 'lastMonth')}:
          </span>
          <span className="font-mono font-medium">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}
```

**b) Pass `locale` to `<Tooltip content>` in the `CategoryComparisonChart` component:**

```tsx
<Tooltip content={<CustomTooltip locale={locale} />} cursor={{ fill: 'transparent' }} />
```

**c) Replace bar colors with CSS vars:**

```tsx
<Bar dataKey="thisMonth" fill="var(--chart-primary)" radius={[0, 4, 4, 0]} barSize={10} />
<Bar dataKey="lastMonth" fill="var(--chart-muted)" radius={[0, 4, 4, 0]} barSize={10} />
```

**d) Replace hardcoded strings in Legend formatter:**

```tsx
<Legend
  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
  formatter={(value: string) =>
    t(locale, value === 'thisMonth' ? 'thisMonth' : 'lastMonth')
  }
/>
```

**e) Wrap the chart `<div style={{ height: chartHeight }}>` with role="img":**

```tsx
<div role="img" aria-label={t(locale, 'categoryComparison')} style={{ height: chartHeight }}>
  <ResponsiveContainer width="100%" height="100%">
    ...
  </ResponsiveContainer>
</div>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/CategoryComparisonChart.test.ts
# Expected: 4 passed
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
# Expected: no errors
```

- [ ] **Step 6: Commit**

```bash
git add src/features/insights/CategoryComparisonChart.tsx src/__tests__/CategoryComparisonChart.test.ts
git commit -m "fix: CSS vars, i18n, and aria wrapper in CategoryComparisonChart"
```

---

## Task 18: Replace PaymentMethods METHOD_COLORS with CSS palette (Fix #15)

> **Depends on Task 1**

**Files:**
- Modify: `src/features/dashboard/PaymentMethods.tsx`
- Test: `src/__tests__/PaymentMethods.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/PaymentMethods.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/features/dashboard/PaymentMethods.tsx'), 'utf-8');

describe('PaymentMethods — CSS palette', () => {
  it('does not contain METHOD_COLORS hardcoded object', () => {
    expect(src).not.toContain('METHOD_COLORS');
  });

  it('uses var(--chart-color-1) from the palette', () => {
    expect(src).toContain('var(--chart-color-1)');
  });

  it('assigns color by index with modulo', () => {
    expect(src).toContain('% PALETTE.length');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/PaymentMethods.test.ts
# Expected: FAIL — METHOD_COLORS found, no CSS vars
```

- [ ] **Step 3: Update PaymentMethods.tsx**

In `src/features/dashboard/PaymentMethods.tsx`:

**Remove** the `METHOD_COLORS` object entirely:

```typescript
// DELETE this entire block:
const METHOD_COLORS: Record<string, string> = {
  'Bank BCA': '#3B82F6',
  Cash: '#10B981',
  GoPay: '#06B6D4',
  OVO: '#8B5CF6',
};
```

**Add** the `PALETTE` constant after the imports:

```typescript
const PALETTE = [
  'var(--chart-color-1)',
  'var(--chart-color-2)',
  'var(--chart-color-3)',
  'var(--chart-color-4)',
  'var(--chart-color-5)',
  'var(--chart-color-6)',
];
```

**Update** the `data` mapping inside `PaymentMethodsSummary` to use index-based color assignment:

```typescript
const data = Object.entries(totals)
  .sort((a, b) => b[1] - a[1])
  .map(([name, value], index) => ({
    name,
    value,
    color: PALETTE[index % PALETTE.length],
  }));
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/PaymentMethods.test.ts
# Expected: 3 passed
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
# Expected: no errors
```

- [ ] **Step 6: Commit**

```bash
git add src/features/dashboard/PaymentMethods.tsx src/__tests__/PaymentMethods.test.ts
git commit -m "fix: replace METHOD_COLORS with index-based CSS var palette in PaymentMethods"
```

---

## Final Verification

After all 18 tasks are complete:

- [ ] **Run the full test suite**

```bash
npx vitest run
# Expected: all 496 + 18 new tests passing (514 total), 0 failed
```

- [ ] **TypeScript strict check**

```bash
npx tsc --noEmit
# Expected: 0 errors
```

- [ ] **ESLint check**

```bash
npx eslint src/ --max-warnings 0
# Expected: 0 warnings
```

- [ ] **Prettier check**

```bash
npx prettier --check "src/**/*.{ts,tsx}"
# Expected: all formatted
```

- [ ] **Manual verification checklist**
  - Toggle dark/light mode — all chart colors adapt (income green, expense red, bars blue/muted)
  - PaymentMethods bars use palette colors (not hardcoded brand colors)
  - Tab from top of page — skip link appears at `focus:absolute` position
  - Open a Sheet or AlertDialog — backdrop is clearly visible at 25% opacity
  - Enable DevTools `prefers-reduced-motion` — all Framer Motion animations are disabled
  - Open More drawer on mobile — Finance / Tools / Settings sections visible with headers
  - RecurringTransactionForm: clicking "Description" label focuses the input
  - Both forms: required fields show red asterisk `*`

---

## Parallel Execution Map

```
Sequential:   Task 1  (CSS vars foundation — must complete first)

Parallel Group A (all independent, run simultaneously with each other and with Group B setup):
              Task 2  (i18n lastMonth key)
              Task 3  (MotionConfig StoreProvider)
              Task 4  (Skip link tweak)
              Task 5  (Backdrop opacity)
              Task 6  (RecurringTransactionForm htmlFor)
              Task 8  (DayOfWeekPills ARIA)
              Task 9  (HealthScoreCard aria + duration)
              Task 10 (BottomNav grouping)
              Task 11 (BiggestTransactionsCard + OutlierAlerts)

Sequential:   Task 7  (required asterisks — after Task 6)

Parallel Group B (all depend only on Task 1):
              Task 12 (CashFlowChart)
              Task 13 (CategoryBreakdown)
              Task 14 (ForecastChart)
              Task 15 (TrendChart)
              Task 16 (NetWorthTrendChart)
              Task 18 (PaymentMethods)

Sequential:   Task 17 (CategoryComparisonChart — after Task 1 AND Task 2)
```

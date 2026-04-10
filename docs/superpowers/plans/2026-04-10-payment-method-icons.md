# Payment Method Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-payment-method icon support — a `PaymentMethodIcon` component with Lucide icons or auto-initials badge, an `IconPicker` for Settings and Edit dialogs, and icon display in the Transaction Form dropdown.

**Architecture:** Three new shared components (`PaymentMethodIcon`, `IconPicker`) and a utility module (`payment-method-icon-utils.ts`) replace the hard-coded `TYPE_ICONS` record in `BalanceCard`. Settings and the Transaction Form consume these components. The icon value is stored as a string column (`'initials'`, `'lucide:landmark'`, etc.) already present in the DB schema; no migration needed.

**Tech Stack:** TypeScript strict, React function components, Tailwind utilities, Lucide React icons, `@testing-library/react` + happy-dom for component tests, Vitest for all tests.

> **Run all commands from the worktree root:** `.worktrees/feature/payment-method-icons/`

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/lib/payment-method-icon-utils.ts` | `computeInitials`, `suggestIconFromName`, `normalizeIconValue` |
| Create | `src/components/shared/PaymentMethodIcon.tsx` | Renders Lucide icon or initials badge; 3 sizes |
| Create | `src/components/shared/IconPicker.tsx` | 3-col inline grid; solid + dashed rings |
| Create | `src/__tests__/payment-method-icon-utils.test.ts` | ~17 pure function unit tests |
| Create | `src/__tests__/PaymentMethodIcon.test.tsx` | ~7 rendering tests (happy-dom) |
| Modify | `src/lib/api/validation.ts:107` | Icon default `'wallet'` → `'initials'` |
| Modify | `src/lib/i18n.ts` | Add 4 keys (type def + EN + ID) |
| Modify | `src/__tests__/payment-method.service.test.ts:37` | Update default icon assertion + 4 regression cases |
| Modify | `src/features/balances/BalanceCard.tsx` | Swap `TYPE_ICONS` for `<PaymentMethodIcon>` |
| Modify | `src/features/transactions/TransactionForm.tsx` | Convert native `<select>` → shadcn `<Select>` + icons |
| Modify | `src/app/settings/categories/page.tsx` | Add `newMethodIcon`/`editIcon` state + `<IconPicker>` |
| Modify | `src/server/db/seed.ts` | Assign meaningful icons to seeded payment methods |

---

## Task 1: `computeInitials` — utility + test

**Files:**
- Create: `src/lib/payment-method-icon-utils.ts`
- Create: `src/__tests__/payment-method-icon-utils.test.ts`

- [ ] **Step 1.1: Write the failing test**

```typescript
// src/__tests__/payment-method-icon-utils.test.ts
import { describe, it, expect } from 'vitest';
import { computeInitials } from '@/lib/payment-method-icon-utils';

describe('computeInitials', () => {
  // Single words: take first 3 chars uppercase
  it('"BCA" → "BCA"', () => expect(computeInitials('BCA')).toBe('BCA'));
  it('"OVO" → "OVO"', () => expect(computeInitials('OVO')).toBe('OVO'));
  it('"DANA" → "DAN"', () => expect(computeInitials('DANA')).toBe('DAN'));
  it('"Mandiri" → "MAN"', () => expect(computeInitials('Mandiri')).toBe('MAN'));
  it('"Cash" → "CAS"', () => expect(computeInitials('Cash')).toBe('CAS'));
  it('"Tunai" → "TUN"', () => expect(computeInitials('Tunai')).toBe('TUN'));
  it('"SeaBank" → "SEA"', () => expect(computeInitials('SeaBank')).toBe('SEA'));
  it('"GoPay" → "GOP"', () => expect(computeInitials('GoPay')).toBe('GOP'));

  // Multi-word: first letter of each word, max 3, uppercase
  it('"CIMB Niaga" → "CN"', () => expect(computeInitials('CIMB Niaga')).toBe('CN'));
  it('"BCA Syariah" → "BS"', () => expect(computeInitials('BCA Syariah')).toBe('BS'));

  // Edge cases
  it('empty string → "?"', () => expect(computeInitials('')).toBe('?'));
  it('whitespace-only → "?"', () => expect(computeInitials('   ')).toBe('?'));
});
```

- [ ] **Step 1.2: Run test to confirm it fails**

```bash
npx vitest run src/__tests__/payment-method-icon-utils.test.ts --reporter=verbose
```

Expected: FAIL — `Cannot find module '@/lib/payment-method-icon-utils'`

- [ ] **Step 1.3: Create the utility file with `computeInitials`**

```typescript
// src/lib/payment-method-icon-utils.ts

/**
 * Derives 1–3 character initials from a payment method name.
 *
 * Rule 1 (multi-word): take the first letter of each space-separated word, max 3.
 * Rule 2 (single word): take the first 3 characters.
 * Rule 3 (empty/whitespace): return "?".
 */
export function computeInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';

  const words = trimmed.split(/\s+/);
  if (words.length > 1) {
    return words
      .map((w) => w[0].toUpperCase())
      .slice(0, 3)
      .join('');
  }

  return trimmed.slice(0, 3).toUpperCase();
}
```

- [ ] **Step 1.4: Run test to confirm it passes**

```bash
npx vitest run src/__tests__/payment-method-icon-utils.test.ts --reporter=verbose
```

Expected: PASS — 12 tests

- [ ] **Step 1.5: Commit**

```bash
git add src/lib/payment-method-icon-utils.ts src/__tests__/payment-method-icon-utils.test.ts
git commit -m "feat: add computeInitials utility with 12 unit tests"
```

---

## Task 2: `suggestIconFromName` — utility + test

**Files:**
- Modify: `src/lib/payment-method-icon-utils.ts`
- Modify: `src/__tests__/payment-method-icon-utils.test.ts`

- [ ] **Step 2.1: Add failing tests for `suggestIconFromName`**

Append to `src/__tests__/payment-method-icon-utils.test.ts`:

```typescript
import { computeInitials, suggestIconFromName } from '@/lib/payment-method-icon-utils';

// ... existing computeInitials tests ...

describe('suggestIconFromName', () => {
  it('"BCA Saving" → lucide:landmark', () =>
    expect(suggestIconFromName('BCA Saving')).toBe('lucide:landmark'));
  it('"GoPay Saldo" → lucide:smartphone', () =>
    expect(suggestIconFromName('GoPay Saldo')).toBe('lucide:smartphone'));
  it('"Uang Tunai" → lucide:banknote', () =>
    expect(suggestIconFromName('Uang Tunai')).toBe('lucide:banknote'));
  it('"BCA Credit Card" → lucide:credit-card (highest priority)', () =>
    expect(suggestIconFromName('BCA Credit Card')).toBe('lucide:credit-card'));
  it('"Investasi" → initials (no match)', () =>
    expect(suggestIconFromName('Investasi')).toBe('initials'));
  it('"gopay" → lucide:smartphone (case-insensitive)', () =>
    expect(suggestIconFromName('gopay')).toBe('lucide:smartphone'));
});
```

> Note: Update the import at the top of the file to include `suggestIconFromName`.

- [ ] **Step 2.2: Run test to confirm new cases fail**

```bash
npx vitest run src/__tests__/payment-method-icon-utils.test.ts --reporter=verbose
```

Expected: 12 pass, 6 fail — `suggestIconFromName is not a function`

- [ ] **Step 2.3: Implement `suggestIconFromName`**

Append to `src/lib/payment-method-icon-utils.ts`:

```typescript
/**
 * Suggests an icon value based on the payment method name.
 * Pattern matching is case-insensitive.
 *
 * Priority order (highest first):
 *   1. Credit card keywords → lucide:credit-card
 *   2. Cash/tunai keywords → lucide:banknote
 *   3. E-wallet brand names → lucide:smartphone
 *   4. Bank brand names → lucide:landmark
 *   5. No match → 'initials'
 */
export function suggestIconFromName(name: string): string {
  const lower = name.toLowerCase();

  if (lower.includes('credit card') || lower.includes('kartu kredit')) {
    return 'lucide:credit-card';
  }
  if (lower.includes('cash') || lower.includes('tunai') || lower.includes('uang')) {
    return 'lucide:banknote';
  }
  if (
    lower.includes('gopay') ||
    lower.includes('ovo') ||
    lower.includes('dana') ||
    lower.includes('shopeepay') ||
    lower.includes('linkaja') ||
    lower.includes('sakuku') ||
    lower.includes('flazz')
  ) {
    return 'lucide:smartphone';
  }
  if (
    lower.includes('bank') ||
    lower.includes('bca') ||
    lower.includes('bri') ||
    lower.includes('bni') ||
    lower.includes('mandiri') ||
    lower.includes('cimb') ||
    lower.includes('danamon') ||
    lower.includes('permata') ||
    lower.includes('bsi') ||
    lower.includes('maybank')
  ) {
    return 'lucide:landmark';
  }

  return 'initials';
}
```

- [ ] **Step 2.4: Run all tests to confirm 18 pass**

```bash
npx vitest run src/__tests__/payment-method-icon-utils.test.ts --reporter=verbose
```

Expected: PASS — 18 tests

- [ ] **Step 2.5: Commit**

```bash
git add src/lib/payment-method-icon-utils.ts src/__tests__/payment-method-icon-utils.test.ts
git commit -m "feat: add suggestIconFromName utility with 6 unit tests"
```

---

## Task 3: `normalizeIconValue` — utility + test

**Files:**
- Modify: `src/lib/payment-method-icon-utils.ts`
- Modify: `src/__tests__/payment-method-icon-utils.test.ts`

- [ ] **Step 3.1: Add failing tests for `normalizeIconValue`**

Append to `src/__tests__/payment-method-icon-utils.test.ts`:

```typescript
import {
  computeInitials,
  suggestIconFromName,
  normalizeIconValue,
} from '@/lib/payment-method-icon-utils';

// ... existing tests ...

describe('normalizeIconValue', () => {
  it("bare 'wallet' → 'lucide:wallet' (legacy row normalization)", () =>
    expect(normalizeIconValue('wallet')).toBe('lucide:wallet'));
  it("'lucide:landmark' → 'lucide:landmark' (already prefixed, unchanged)", () =>
    expect(normalizeIconValue('lucide:landmark')).toBe('lucide:landmark'));
  it("null → 'initials'", () => expect(normalizeIconValue(null)).toBe('initials'));
  it("'' → 'initials'", () => expect(normalizeIconValue('')).toBe('initials'));
  it("'initials' → 'initials' (unchanged)", () =>
    expect(normalizeIconValue('initials')).toBe('initials'));
});
```

> Update the import at the top to include `normalizeIconValue`.

- [ ] **Step 3.2: Run test to confirm new cases fail**

```bash
npx vitest run src/__tests__/payment-method-icon-utils.test.ts --reporter=verbose
```

Expected: 18 pass, 5 fail — `normalizeIconValue is not a function`

- [ ] **Step 3.3: Implement `normalizeIconValue`**

Append to `src/lib/payment-method-icon-utils.ts`:

```typescript
/**
 * Normalises a raw icon value from the database to a canonical form.
 *
 * - null or empty string  → 'initials'
 * - 'initials'            → 'initials' (unchanged)
 * - 'lucide:*'            → unchanged (already canonical)
 * - bare word (no ':')    → prepend 'lucide:' (handles legacy rows saved as e.g. 'wallet')
 *
 * This is a read-time transform only; it never writes back to the DB.
 */
export function normalizeIconValue(icon: string | null): string {
  if (!icon) return 'initials';
  if (icon === 'initials') return 'initials';
  if (icon.startsWith('lucide:')) return icon;
  // Legacy bare name (e.g. 'wallet') → treat as Lucide icon
  return `lucide:${icon}`;
}
```

- [ ] **Step 3.4: Run all tests to confirm 23 pass**

```bash
npx vitest run src/__tests__/payment-method-icon-utils.test.ts --reporter=verbose
```

Expected: PASS — 23 tests

- [ ] **Step 3.5: Commit**

```bash
git add src/lib/payment-method-icon-utils.ts src/__tests__/payment-method-icon-utils.test.ts
git commit -m "feat: add normalizeIconValue utility with 5 unit tests"
```

---

## Task 4: i18n — 4 new keys

**Files:**
- Modify: `src/lib/i18n.ts`

- [ ] **Step 4.1: Add keys to the TypeScript type definition**

In `src/lib/i18n.ts`, find the line `selectIcon: string;` (around line 333) and add the 4 new keys immediately after it:

```typescript
  // Category icons
  selectIcon: string;
  chooseIcon: string;
  iconStyle: string;
  autoInitials: string;
  paymentMethodIcon: string;
```

- [ ] **Step 4.2: Add EN translations**

Find `selectIcon: 'Select Icon',` in the EN locale object (around line 811) and add immediately after:

```typescript
    selectIcon: 'Select Icon',
    chooseIcon: 'Choose Icon',
    iconStyle: 'Icon Style',
    autoInitials: 'Auto (Initials)',
    paymentMethodIcon: 'Payment Method Icon',
```

- [ ] **Step 4.3: Add ID translations**

Find `selectIcon: 'Pilih Ikon',` in the ID locale object (around line 1264) and add immediately after:

```typescript
    selectIcon: 'Pilih Ikon',
    chooseIcon: 'Pilih Ikon',
    iconStyle: 'Gaya Ikon',
    autoInitials: 'Otomatis (Inisial)',
    paymentMethodIcon: 'Ikon Metode Pembayaran',
```

- [ ] **Step 4.4: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors from i18n.ts

- [ ] **Step 4.5: Commit**

```bash
git add src/lib/i18n.ts
git commit -m "feat: add 4 i18n keys for payment method icon picker (EN + ID)"
```

---

## Task 5: Zod default + API regression tests

**Files:**
- Modify: `src/lib/api/validation.ts:107`
- Modify: `src/__tests__/payment-method.service.test.ts`

- [ ] **Step 5.1: Write failing regression tests**

Open `src/__tests__/payment-method.service.test.ts`. At line 37, change the existing assertion from `'wallet'` to `'initials'`:

```typescript
  it('creates with default icon', async () => {
    const result = await createPaymentMethod({ name: 'Cash', type: 'cash' });
    expect(result.data).toBeDefined();
    expect(result.data!.icon).toBe('initials'); // was: 'wallet'
  });
```

Then, add these 4 new test cases inside the `describe('createPaymentMethod', ...)` block (after the existing tests):

```typescript
  it('stores an explicit lucide icon value correctly', async () => {
    const result = await createPaymentMethod({
      name: 'Bank BCA',
      icon: 'lucide:landmark',
      type: 'bank',
    });
    expect(result.data).toBeDefined();
    expect(result.data!.icon).toBe('lucide:landmark');
  });

  it('defaults icon to "initials" when omitted', async () => {
    const result = await createPaymentMethod({ name: 'Cash', type: 'cash' });
    expect(result.data).toBeDefined();
    expect(result.data!.icon).toBe('initials');
  });
```

Add these 2 test cases to the `describe('updatePaymentMethod', ...)` block:

```typescript
  it('updates the icon field', async () => {
    const created = await createPaymentMethod({
      name: 'Bank BCA',
      icon: 'lucide:landmark',
      type: 'bank',
    });
    const result = await updatePaymentMethod(created.data!.id, { icon: 'lucide:wallet' });
    expect(result.error).toBeUndefined();
    expect(result.data!.icon).toBe('lucide:wallet');
  });
```

Add these 1 test case to the `describe('listPaymentMethods', ...)` block:

```typescript
  it('returns icon field on every item', async () => {
    const result = await listPaymentMethods();
    expect(result.data).toBeDefined();
    for (const pm of result.data!) {
      expect(typeof pm.icon).toBe('string');
      expect(pm.icon.length).toBeGreaterThan(0);
    }
  });
```

- [ ] **Step 5.2: Run tests to confirm existing default-icon test fails**

```bash
npx vitest run src/__tests__/payment-method.service.test.ts --reporter=verbose
```

Expected: ~1–3 failures (the `'wallet'` assertion fails, new tests fail because the validation still defaults to `'wallet'`)

- [ ] **Step 5.3: Update the Zod schema default**

In `src/lib/api/validation.ts` at line 107, change:

```typescript
  icon: z.string().max(50).optional().default('wallet'),
```

to:

```typescript
  icon: z.string().max(50).optional().default('initials'),
```

- [ ] **Step 5.4: Run tests to confirm all pass**

```bash
npx vitest run src/__tests__/payment-method.service.test.ts --reporter=verbose
```

Expected: PASS — all tests (was ~11, now ~14)

- [ ] **Step 5.5: Run the full test suite to confirm no regressions**

```bash
npm run test
```

Expected: all tests pass

- [ ] **Step 5.6: Commit**

```bash
git add src/lib/api/validation.ts src/__tests__/payment-method.service.test.ts
git commit -m "feat: change payment method icon default from 'wallet' to 'initials'; add API regression tests"
```

---

## Task 6: `PaymentMethodIcon` — initials badge

**Files:**
- Create: `src/components/shared/PaymentMethodIcon.tsx`
- Create: `src/__tests__/PaymentMethodIcon.test.tsx`

- [ ] **Step 6.1: Write failing component tests (initials cases only)**

```typescript
// src/__tests__/PaymentMethodIcon.test.tsx
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PaymentMethodIcon } from '@/components/shared/PaymentMethodIcon';

describe('PaymentMethodIcon — initials badge', () => {
  it('renders initials "BCA" for icon=initials name=BCA', () => {
    render(<PaymentMethodIcon name="BCA" icon="initials" type="bank" />);
    expect(screen.getByText('BCA')).toBeDefined();
  });

  it('renders initials fallback for icon=null without crashing', () => {
    render(<PaymentMethodIcon name="Test" icon={null} type="cash" />);
    // computeInitials('Test') → 'TES'
    expect(screen.getByText('TES')).toBeDefined();
  });
});
```

- [ ] **Step 6.2: Run test to confirm it fails**

```bash
npx vitest run src/__tests__/PaymentMethodIcon.test.tsx --reporter=verbose
```

Expected: FAIL — `Cannot find module '@/components/shared/PaymentMethodIcon'`

- [ ] **Step 6.3: Create `PaymentMethodIcon` with initials-only rendering**

```typescript
// src/components/shared/PaymentMethodIcon.tsx
'use client';

import { cn } from '@/lib/utils';
import {
  Landmark,
  Building2,
  Smartphone,
  Wallet,
  CreditCard,
  Banknote,
  Coins,
  PiggyBank,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { normalizeIconValue, computeInitials } from '@/lib/payment-method-icon-utils';

// Static map of supported Lucide icons.
// Add new entries here to support more icon options in the picker.
const ICON_MAP: Record<string, LucideIcon> = {
  'lucide:landmark': Landmark,
  'lucide:building-2': Building2,
  'lucide:smartphone': Smartphone,
  'lucide:wallet': Wallet,
  'lucide:credit-card': CreditCard,
  'lucide:banknote': Banknote,
  'lucide:coins': Coins,
  'lucide:piggy-bank': PiggyBank,
};

const SIZE_CONTAINER: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

const SIZE_ICON: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

const SIZE_TEXT: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'text-[8px]',
  md: 'text-[10px]',
  lg: 'text-xs',
};

const TYPE_COLORS: Record<'bank' | 'cash' | 'ewallet', string> = {
  bank: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  cash: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  ewallet: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

export interface PaymentMethodIconProps {
  name: string;
  icon: string | null;
  type: 'bank' | 'cash' | 'ewallet';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PaymentMethodIcon({
  name,
  icon,
  type,
  size = 'md',
  className,
}: PaymentMethodIconProps) {
  const normalized = normalizeIconValue(icon);
  const colorClass = TYPE_COLORS[type];

  // Try to look up a Lucide icon from the static map
  const LucideIconComponent = ICON_MAP[normalized];
  if (LucideIconComponent) {
    return (
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-lg',
          SIZE_CONTAINER[size],
          colorClass,
          className
        )}
        aria-hidden="true"
      >
        <LucideIconComponent className={SIZE_ICON[size]} />
      </div>
    );
  }

  // Initials badge: used for 'initials' value OR unknown lucide icon names (graceful fallback)
  const initials = computeInitials(name);
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg font-mono',
        SIZE_CONTAINER[size],
        colorClass,
        className
      )}
      aria-hidden="true"
    >
      <span className={cn('font-semibold leading-none', SIZE_TEXT[size])}>{initials}</span>
    </div>
  );
}
```

- [ ] **Step 6.4: Run tests to confirm initials cases pass**

```bash
npx vitest run src/__tests__/PaymentMethodIcon.test.tsx --reporter=verbose
```

Expected: PASS — 2 tests

- [ ] **Step 6.5: Commit**

```bash
git add src/components/shared/PaymentMethodIcon.tsx src/__tests__/PaymentMethodIcon.test.tsx
git commit -m "feat: add PaymentMethodIcon component with initials badge rendering"
```

---

## Task 7: `PaymentMethodIcon` — Lucide icons + size variants

**Files:**
- Modify: `src/__tests__/PaymentMethodIcon.test.tsx`

> The implementation already handles Lucide icons (Task 6 added the full component); this task only adds the missing test cases.

- [ ] **Step 7.1: Add Lucide + size tests**

Append to `src/__tests__/PaymentMethodIcon.test.tsx`:

```typescript
describe('PaymentMethodIcon — Lucide icons', () => {
  it('renders an SVG for icon=lucide:landmark with blue container (bank)', () => {
    const { container } = render(
      <PaymentMethodIcon name="BCA" icon="lucide:landmark" type="bank" />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('bg-blue-100');
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders an SVG for icon=lucide:smartphone with emerald container (ewallet)', () => {
    const { container } = render(
      <PaymentMethodIcon name="GoPay" icon="lucide:smartphone" type="ewallet" />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('bg-emerald-100');
    expect(container.querySelector('svg')).not.toBeNull();
  });
});

describe('PaymentMethodIcon — size variants', () => {
  it('size=sm → container has class h-6 w-6', () => {
    const { container } = render(
      <PaymentMethodIcon name="BCA" icon="initials" type="bank" size="sm" />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('h-6');
    expect(el.className).toContain('w-6');
  });

  it('size=lg → container has class h-10 w-10', () => {
    const { container } = render(
      <PaymentMethodIcon name="BCA" icon="initials" type="bank" size="lg" />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('h-10');
    expect(el.className).toContain('w-10');
  });
});
```

- [ ] **Step 7.2: Run tests to confirm all 6 pass**

```bash
npx vitest run src/__tests__/PaymentMethodIcon.test.tsx --reporter=verbose
```

Expected: PASS — 6 tests

- [ ] **Step 7.3: Commit**

```bash
git add src/__tests__/PaymentMethodIcon.test.tsx
git commit -m "test: add Lucide icon + size variant tests for PaymentMethodIcon"
```

---

## Task 8: `PaymentMethodIcon` — legacy normalization + unknown fallback

**Files:**
- Modify: `src/__tests__/PaymentMethodIcon.test.tsx`

> The implementation already handles both cases (Task 6 calls `normalizeIconValue` and falls back to initials on ICON_MAP miss). This task adds the test coverage.

- [ ] **Step 8.1: Add legacy + fallback tests**

Append to `src/__tests__/PaymentMethodIcon.test.tsx`:

```typescript
describe('PaymentMethodIcon — edge cases', () => {
  it('icon="wallet" (legacy bare name) renders Wallet SVG via normalization', () => {
    const { container } = render(
      <PaymentMethodIcon name="My Wallet" icon="wallet" type="cash" />
    );
    // normalizeIconValue('wallet') → 'lucide:wallet', which is in ICON_MAP → renders SVG
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('unknown lucide icon name falls back to initials without crashing', () => {
    render(<PaymentMethodIcon name="Test" icon="lucide:nonexistent" type="cash" />);
    // computeInitials('Test') → 'TES'
    expect(screen.getByText('TES')).toBeDefined();
  });
});
```

- [ ] **Step 8.2: Run tests to confirm all 8 pass**

```bash
npx vitest run src/__tests__/PaymentMethodIcon.test.tsx --reporter=verbose
```

Expected: PASS — 8 tests

- [ ] **Step 8.3: Commit**

```bash
git add src/__tests__/PaymentMethodIcon.test.tsx
git commit -m "test: add legacy normalization and unknown-icon fallback tests for PaymentMethodIcon"
```

---

## Task 9: `IconPicker` — static grid + selection ring

**Files:**
- Create: `src/components/shared/IconPicker.tsx`

- [ ] **Step 9.1: Create `IconPicker`**

```typescript
// src/components/shared/IconPicker.tsx
'use client';

import {
  Landmark,
  Building2,
  Smartphone,
  Wallet,
  CreditCard,
  Banknote,
  Coins,
  PiggyBank,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { computeInitials, suggestIconFromName } from '@/lib/payment-method-icon-utils';

interface IconOption {
  value: string;
  label: string;
  Icon: LucideIcon | null; // null = use initials preview
}

const ICON_OPTIONS: IconOption[] = [
  { value: 'initials', label: 'Auto', Icon: null },
  { value: 'lucide:landmark', label: 'Landmark', Icon: Landmark },
  { value: 'lucide:building-2', label: 'Building', Icon: Building2 },
  { value: 'lucide:smartphone', label: 'Smartphone', Icon: Smartphone },
  { value: 'lucide:wallet', label: 'Wallet', Icon: Wallet },
  { value: 'lucide:credit-card', label: 'Credit Card', Icon: CreditCard },
  { value: 'lucide:banknote', label: 'Banknote', Icon: Banknote },
  { value: 'lucide:coins', label: 'Coins', Icon: Coins },
  { value: 'lucide:piggy-bank', label: 'Piggy Bank', Icon: PiggyBank },
];

export interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  paymentMethodName?: string;
  type?: 'bank' | 'cash' | 'ewallet';
  locale: 'en' | 'id';
}

export function IconPicker({ value, onChange, paymentMethodName = '', locale }: IconPickerProps) {
  const suggestion = paymentMethodName ? suggestIconFromName(paymentMethodName) : null;

  return (
    <div>
      <p className="text-muted-foreground mb-1.5 text-xs">{t(locale, 'chooseIcon')}</p>
      <div className="grid grid-cols-3 gap-1.5">
        {ICON_OPTIONS.map((opt) => {
          const isSelected = value === opt.value;
          const isSuggested = suggestion === opt.value;

          return (
            <button
              key={opt.value}
              type="button"
              aria-label={opt.label}
              aria-pressed={isSelected}
              onClick={() => onChange(opt.value)}
              className={cn(
                'flex h-10 flex-col items-center justify-center gap-0.5 rounded-lg border transition-colors hover:bg-accent',
                isSelected && 'border-primary ring-2 ring-primary ring-offset-1',
                !isSelected && isSuggested && 'border-primary/40',
                !isSelected && !isSuggested && 'border-border'
              )}
            >
              {opt.Icon ? (
                <opt.Icon className="h-4 w-4" />
              ) : (
                <span className="font-mono text-[9px] font-semibold leading-none">
                  {paymentMethodName
                    ? computeInitials(paymentMethodName)
                    : t(locale, 'autoInitials').slice(0, 2)}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {suggestion && suggestion !== value && (
        <p className="text-muted-foreground mt-1 text-[10px]">
          {t(locale, 'iconStyle')}: {ICON_OPTIONS.find((o) => o.value === suggestion)?.label}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 9.2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | grep -i "IconPicker\|icon-picker" | head -10
```

Expected: no errors for the new file

- [ ] **Step 9.3: Commit**

```bash
git add src/components/shared/IconPicker.tsx
git commit -m "feat: add IconPicker component with 3-col grid and selection ring"
```

---

## Task 10: `BalanceCard` — swap TYPE_ICONS for `PaymentMethodIcon`

**Files:**
- Modify: `src/features/balances/BalanceCard.tsx`

- [ ] **Step 10.1: Modify `BalanceCard.tsx`**

Remove the old icon imports and `TYPE_ICONS` record, then replace the icon rendering:

```typescript
// src/features/balances/BalanceCard.tsx
'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { staggerGridItem, tapScale } from '@/lib/motion';
import { t } from '@/lib/i18n';
import { PaymentMethodIcon } from '@/components/shared/PaymentMethodIcon';
import type { PaymentMethodBalance } from './types';

const TYPE_LABELS: Record<PaymentMethodBalance['type'], { en: string; id: string }> = {
  bank: { en: 'Bank', id: 'Bank' },
  cash: { en: 'Cash', id: 'Tunai' },
  ewallet: { en: 'E-Wallet', id: 'E-Wallet' },
};

interface BalanceCardProps {
  balance: PaymentMethodBalance;
  locale: 'en' | 'id';
  onClick?: () => void;
}

export function BalanceCard({ balance, locale, onClick }: BalanceCardProps) {
  const typeLabel = TYPE_LABELS[balance.type][locale];
  const closingPositive = balance.balance >= 0;

  return (
    <motion.div
      variants={staggerGridItem}
      whileTap={onClick ? tapScale : undefined}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        'bg-card border-border rounded-2xl border p-4 shadow-sm',
        onClick && 'hover:border-primary/50 cursor-pointer transition-colors'
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <PaymentMethodIcon
          name={balance.name}
          icon={balance.icon}
          type={balance.type}
          size="md"
        />
        <div>
          <p className="text-sm font-medium">{balance.name}</p>
          <p className="text-muted-foreground text-xs">{typeLabel}</p>
        </div>
      </div>

      {/* Ledger rows */}
      <div className="space-y-1 text-xs">
        <div className="text-muted-foreground flex justify-between">
          <span>{t(locale, 'beginningBalance')}</span>
          <span className="font-mono">{formatCurrency(balance.beginningBalance)}</span>
        </div>
        <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {t(locale, 'income')}
          </span>
          <span className="font-mono">+{formatCurrency(balance.income)}</span>
        </div>
        <div className="flex justify-between text-red-500">
          <span className="flex items-center gap-1">
            <TrendingDown className="h-3 w-3" />
            {t(locale, 'expense')}
          </span>
          <span className="font-mono">-{formatCurrency(balance.expense)}</span>
        </div>
        <div
          className={cn(
            'border-border mt-2 flex justify-between border-t pt-2 font-medium',
            closingPositive ? 'text-foreground' : 'text-destructive'
          )}
        >
          <span>{t(locale, 'closing')}</span>
          <span className="font-mono">{formatCurrency(balance.balance)}</span>
        </div>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 10.2: Run the full test suite**

```bash
npm run test
```

Expected: all tests pass (BalanceCard has no unit tests; the change is visual)

- [ ] **Step 10.3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 10.4: Commit**

```bash
git add src/features/balances/BalanceCard.tsx
git commit -m "feat: replace TYPE_ICONS with PaymentMethodIcon in BalanceCard"
```

---

## Task 11: `TransactionForm` — convert native select to shadcn Select with icons

**Files:**
- Modify: `src/features/transactions/TransactionForm.tsx`

The current code at lines 296–323 uses a native `<select>`. Replace it with the shadcn `Select` component so each option can show a `PaymentMethodIcon`.

- [ ] **Step 11.1: Add imports to `TransactionForm.tsx`**

Add these imports after the existing imports at the top of the file:

```typescript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PaymentMethodIcon } from '@/components/shared/PaymentMethodIcon';
```

- [ ] **Step 11.2: Replace the native `<select>` block**

Find and replace the entire `{/* Payment Method */}` block (lines ~296–323):

**Remove:**
```tsx
      {/* Payment Method */}
      <div>
        <Label htmlFor="paymentMethod">{t(locale, 'paymentMethod')}</Label>
        <select
          id="paymentMethod"
          value={paymentMethod}
          onChange={(e) => {
            setPaymentMethod(e.target.value);
            if (fieldError('paymentMethod'))
              setErrors(errors.filter((e) => e.field !== 'paymentMethod'));
          }}
          className={cn(
            'bg-background mt-1 w-full rounded-md border px-3 py-2 text-sm',
            fieldError('paymentMethod') ? 'border-red-500' : 'border-input'
          )}
          aria-invalid={!!fieldError('paymentMethod')}
        >
          <option value="">{locale === 'id' ? 'Pilih...' : 'Select...'}</option>
          {paymentMethods.map((p) => (
            <option key={p.id} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
        {fieldError('paymentMethod') && (
          <p className="mt-1 text-xs text-red-500">{fieldError('paymentMethod')}</p>
        )}
      </div>
```

**Insert:**
```tsx
      {/* Payment Method */}
      <div>
        <Label htmlFor="paymentMethod">{t(locale, 'paymentMethod')}</Label>
        <Select
          value={paymentMethod}
          onValueChange={(val) => {
            setPaymentMethod(val);
            if (fieldError('paymentMethod'))
              setErrors(errors.filter((e) => e.field !== 'paymentMethod'));
          }}
        >
          <SelectTrigger
            id="paymentMethod"
            className={cn(
              'mt-1 w-full',
              fieldError('paymentMethod') ? 'border-red-500' : ''
            )}
            aria-invalid={!!fieldError('paymentMethod')}
          >
            <SelectValue placeholder={locale === 'id' ? 'Pilih...' : 'Select...'} />
          </SelectTrigger>
          <SelectContent>
            {paymentMethods.map((p) => (
              <SelectItem key={p.id} value={p.name}>
                <PaymentMethodIcon
                  name={p.name}
                  icon={p.icon}
                  type={p.type}
                  size="sm"
                  aria-hidden="true"
                />
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldError('paymentMethod') && (
          <p className="mt-1 text-xs text-red-500">{fieldError('paymentMethod')}</p>
        )}
      </div>
```

- [ ] **Step 11.3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -i "transactionform\|transaction-form" | head -10
```

Expected: no errors

- [ ] **Step 11.4: Run the full test suite**

```bash
npm run test
```

Expected: all tests pass

- [ ] **Step 11.5: Commit**

```bash
git add src/features/transactions/TransactionForm.tsx
git commit -m "feat: convert TransactionForm payment method picker to shadcn Select with icons"
```

---

## Task 12: Settings — add form: `newMethodIcon` + `IconPicker`

**Files:**
- Modify: `src/app/settings/categories/page.tsx`

- [ ] **Step 12.1: Add import for `IconPicker`**

Near the top of `src/app/settings/categories/page.tsx`, with other component imports, add:

```typescript
import { IconPicker } from '@/components/shared/IconPicker';
```

- [ ] **Step 12.2: Add `newMethodIcon` state**

In the state declarations section (after `newMethodBeginningBalance` state, around line 99), add:

```typescript
  const [newMethodIcon, setNewMethodIcon] = useState('initials');
```

- [ ] **Step 12.3: Wire `newMethodIcon` into `handleAddMethod`**

In `handleAddMethod` (around line 206), change:

```typescript
    const result = await api.paymentMethods.create({
      name: newMethodName,
      icon: 'wallet',        // ← remove this line
      type: newMethodType,
      beginningBalance: parseCurrencyInput(newMethodBeginningBalance),
    });
```

to:

```typescript
    const result = await api.paymentMethods.create({
      name: newMethodName,
      icon: newMethodIcon,   // ← use state value
      type: newMethodType,
      beginningBalance: parseCurrencyInput(newMethodBeginningBalance),
    });
```

Also reset the icon state after a successful add. After `setNewMethodName('');` and `setNewMethodBeginningBalance('');`, add:

```typescript
      setNewMethodIcon('initials');
```

- [ ] **Step 12.4: Insert `<IconPicker>` in the add form**

Find the add form area (around line 474–515). Inside the `flex flex-wrap items-end gap-3` div, before the type `<select>`, insert:

```tsx
          <div className="w-full">
            <IconPicker
              value={newMethodIcon}
              onChange={setNewMethodIcon}
              paymentMethodName={newMethodName}
              type={newMethodType}
              locale={locale}
            />
          </div>
```

So the full block becomes (only showing the relevant portion with surrounding context):

```tsx
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <Input
              value={newMethodName}
              onChange={(e) => setNewMethodName(e.target.value)}
              placeholder={t(locale, 'methodName')}
            />
          </div>
          <div className="w-full">
            <IconPicker
              value={newMethodIcon}
              onChange={setNewMethodIcon}
              paymentMethodName={newMethodName}
              type={newMethodType}
              locale={locale}
            />
          </div>
          <select
            value={newMethodType}
            ...
```

- [ ] **Step 12.5: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -i "categories\|settings" | head -10
```

Expected: no errors

- [ ] **Step 12.6: Run the full test suite**

```bash
npm run test
```

Expected: all tests pass

- [ ] **Step 12.7: Commit**

```bash
git add src/app/settings/categories/page.tsx
git commit -m "feat: add icon picker to payment method add form in Settings"
```

---

## Task 13: Settings — edit dialog: `editIcon` + `IconPicker`

**Files:**
- Modify: `src/app/settings/categories/page.tsx`

- [ ] **Step 13.1: Add `editIcon` state**

After the `savingEdit` state declaration (around line 106), add:

```typescript
  const [editIcon, setEditIcon] = useState('initials');
```

- [ ] **Step 13.2: Seed `editIcon` when opening the edit dialog**

In `handleOpenEdit` (around line 235), add one line to seed the icon from the existing record:

```typescript
  const handleOpenEdit = (method: PaymentMethod) => {
    setEditingMethod(method);
    setEditName(method.name);
    setEditType(method.type);
    setEditIcon(method.icon);  // ← add this line
    setEditBeginningBalance(
      method.beginningBalance !== 0 ? formatCurrencyInput(method.beginningBalance) : ''
    );
  };
```

- [ ] **Step 13.3: Include `editIcon` in the PATCH payload**

In `handleEditSave` (around line 244), add `icon: editIcon` to the update call:

```typescript
    const result = await api.paymentMethods.update(editingMethod.id, {
      name: editName,
      type: editType,
      icon: editIcon,          // ← add this line
      beginningBalance: parseCurrencyInput(editBeginningBalance),
    });
```

- [ ] **Step 13.4: Insert `<IconPicker>` in the edit dialog**

In the edit `Dialog` content (around line 530–570), after the Name `<Input>` block and before the Type `<select>` block, insert:

```tsx
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">
                {t(locale, 'paymentMethodIcon')}
              </label>
              <IconPicker
                value={editIcon}
                onChange={setEditIcon}
                paymentMethodName={editName}
                type={editType}
                locale={locale}
              />
            </div>
```

- [ ] **Step 13.5: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 13.6: Run the full test suite**

```bash
npm run test
```

Expected: all tests pass

- [ ] **Step 13.7: Commit**

```bash
git add src/app/settings/categories/page.tsx
git commit -m "feat: add icon picker to payment method edit dialog in Settings"
```

---

## Task 14: `seed.ts` — meaningful icons for seeded payment methods

**Files:**
- Modify: `src/server/db/seed.ts`

The seed reads payment methods from `getSampleData()`. We override icons inline in the loop so the first-run experience shows meaningful icons.

- [ ] **Step 14.1: Create the name-to-icon override map and apply it in the seed loop**

In `src/server/db/seed.ts`, replace the payment methods seed loop (around lines 70–75):

**Remove:**
```typescript
  for (const p of data.paymentMethods) {
    await db.query(
      'INSERT INTO payment_methods (id, name, icon, type) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING',
      [p.id, p.name, p.icon, p.type]
    );
  }
```

**Insert:**
```typescript
  // Icon overrides for seeded payment methods.
  // Keys are lowercased fragments of the name.
  const SEED_ICON_MAP: Record<string, string> = {
    bca: 'lucide:landmark',
    bri: 'lucide:landmark',
    bni: 'lucide:landmark',
    mandiri: 'lucide:landmark',
    bsi: 'lucide:landmark',
    maybank: 'lucide:landmark',
    cimb: 'lucide:landmark',
    danamon: 'lucide:landmark',
    permata: 'lucide:landmark',
    gopay: 'lucide:smartphone',
    ovo: 'lucide:smartphone',
    dana: 'lucide:smartphone',
    shopeepay: 'lucide:smartphone',
    linkaja: 'lucide:smartphone',
    cash: 'lucide:banknote',
    tunai: 'lucide:banknote',
  };

  for (const p of data.paymentMethods) {
    const lowerName = p.name.toLowerCase();
    const icon =
      Object.entries(SEED_ICON_MAP).find(([key]) => lowerName.includes(key))?.[1] ??
      p.icon ??
      'initials';
    await db.query(
      'INSERT INTO payment_methods (id, name, icon, type) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING',
      [p.id, p.name, icon, p.type]
    );
  }
```

- [ ] **Step 14.2: Run the full test suite**

```bash
npm run test
```

Expected: all tests pass (seed is tested indirectly via service tests that call `ensureSeeded`)

- [ ] **Step 14.3: Commit**

```bash
git add src/server/db/seed.ts
git commit -m "feat: assign meaningful lucide icons to seeded payment methods"
```

---

## Task 15: Final verification

- [ ] **Step 15.1: Run the full test suite one final time**

```bash
npm run test
```

Expected: all tests pass (was 374 baseline; now 374 + 23 new utility/component tests = ~397 passing)

- [ ] **Step 15.2: TypeScript strict check**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 15.3: Lint**

```bash
npm run lint
```

Expected: 0 errors, 0 warnings on new files

- [ ] **Step 15.4: Format**

```bash
npm run format
```

- [ ] **Step 15.5: Commit format changes (if any)**

```bash
git add -A
git status
# Only commit if there are actual format-only changes
git commit -m "style: prettier format payment method icon files"
```

- [ ] **Step 15.6: Final summary**

All 12 files touched. New public surface:
- `computeInitials(name)` — pure, 23 tests
- `suggestIconFromName(name)` — pure, 23 tests
- `normalizeIconValue(icon)` — pure, 23 tests
- `<PaymentMethodIcon name icon type size? className?>` — renders icon or badge
- `<IconPicker value onChange paymentMethodName? type? locale>` — icon selection grid

Consumers updated: `BalanceCard`, `TransactionForm`, `settings/categories/page`.

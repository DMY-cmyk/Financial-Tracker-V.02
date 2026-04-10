---
feature: Payment Method Icons
type: spec
date: 2026-04-10
status: approved
tier: 4
supersedes: 2026-03-27-payment-method-icons-design.md
---

# Feature 17 — Payment Method Icons (Final Design)

**Date:** 2026-04-10
**Scope:** Add user-selectable visual icons to each payment method; update the balance cards, settings form, and transaction form dropdown to display and pick icons.

---

## 1. Overview

The `icon` column already exists in the `payment_methods` table and is wired through every layer of the stack (repository → service → API → TypeScript types → contracts). However, the Settings UI hard-codes `icon: 'wallet'` on create and omits it entirely on edit. Balance cards show the same generic type icon for every account — a user with BCA, BRI, and Mandiri sees three identical blue building icons and must read the label to tell them apart.

This feature completes the loop between the stored column and the visible UI.

---

## 2. Goals

1. **Icon picker in Settings form:** User can select a visual icon for each payment method when adding or editing. Inline 3-column grid. Both add form and edit dialog.
2. **BalanceCard icons:** Each card renders its selected icon (Lucide or initials badge) instead of the current type-only generic icon.
3. **Transaction form dropdown:** Payment method select shows the icon alongside the name so users can identify accounts instantly when recording a transaction.
4. **Auto-suggestion:** Typing a recognizable name (BCA, GoPay, Cash, etc.) highlights the best-match icon with a dashed ring. The user's explicit click shows a solid ring. Both rings can coexist independently.
5. **No schema changes:** The `icon` column is already in the DB and wired through every layer. Only the Zod default changes: `'wallet'` → `'initials'`.
6. **Bilingual:** All new strings in both EN and ID via `t(locale, key)`. 4 new i18n keys.

---

## 3. Non-Goals

- No custom image upload (PNG, SVG, JPEG). No brand logos — IP/trademark concerns.
- No per-icon color overrides. Color is always derived from payment method `type`.
- No animated icons or micro-animations on the icon itself.
- No `credit` type support. Credit cards are modelled as `bank` for now.
- No icons on transaction list rows (the table itself). Only the transaction *form dropdown* is in scope.
- No unifying the category icon picker with the payment method icon picker (different icon format, different data).

---

## 4. Icon Strategy

**Strategy D — adopted.** Combine a curated set of Lucide icons with an auto-generated colored initials badge as the default fallback.

- Lucide icons give users quick semantic choices (bank, wallet, card, cash).
- The initials badge provides a unique identity for specific Indonesian payment methods where no generic icon is distinct enough.
- Badge color is always driven by `type`, keeping the color system consistent.
- Avoids all IP concerns while being immediately useful for the target audience.

---

## 5. Design

### 5.1 Icon Value Format

The `icon` column stores a plain string. Valid formats:

| Stored value | Meaning |
|---|---|
| `"initials"` | Auto-compute abbreviation from payment method name (default) |
| `"lucide:landmark"` | Lucide `Landmark` icon |
| `"lucide:building2"` | Lucide `Building2` icon |
| `"lucide:wallet"` | Lucide `Wallet` icon |
| `"lucide:smartphone"` | Lucide `Smartphone` icon |
| `"lucide:credit-card"` | Lucide `CreditCard` icon |
| `"lucide:banknote"` | Lucide `Banknote` icon |
| `"lucide:coins"` | Lucide `Coins` icon |
| `"lucide:piggy-bank"` | Lucide `PiggyBank` icon |
| `"wallet"` *(legacy)* | Normalized to `"lucide:wallet"` at render time. Existing DB rows created before this feature. Not written by new code. |
| `null` / `""` | Falls back to `"initials"` rendering. Never stored intentionally. |

**Legacy handling:** `normalizeIconValue()` prepends `"lucide:"` if the value contains no colon and is a known Lucide icon name. This handles existing `icon = 'wallet'` rows transparently. A code comment in `PaymentMethodIcon` explains this for future maintainers.

The Zod default for `createPaymentMethodSchema` changes from `'wallet'` to `'initials'`. `updatePaymentMethodSchema` already accepts `icon` as optional with max-length 50 — no structural change needed.

### 5.2 Color Theming by Type

Icon backgrounds and initials badges use Tailwind utility classes keyed to the payment method type:

| Type | Background | Text | Dark mode |
|---|---|---|---|
| `bank` | `bg-blue-100` | `text-blue-700` | `dark:bg-blue-900/30 dark:text-blue-400` |
| `ewallet` | `bg-emerald-100` | `text-emerald-700` | `dark:bg-emerald-900/30 dark:text-emerald-400` |
| `cash` | `bg-amber-100` | `text-amber-700` | `dark:bg-amber-900/30 dark:text-amber-400` |

Color is always derived from `type` — never user-configurable. No inline hex values.

### 5.3 Initials Computation Algorithm

When `icon === 'initials'` (or null/empty), `computeInitials(name)` derives a 1–3 character abbreviation:

**Rule 1 — Space-separated words:** Split on spaces → take first letter of each word, uppercase, max 3 chars.
- "CIMB Niaga" → CN
- "BCA Syariah" → BS
- "Sea Bank" → SB

**Rule 2 — Single word (any case):** Take first 3 chars, uppercase.
- BCA → BCA · OVO → OVO · DANA → DAN
- Mandiri → MAN · Cash → CAS · Tunai → TUN
- SeaBank → SEA · GoPay → GOP · ShopeePay → SHO

**Rule 3 — Fallback:** `"?"`

All results are 1–3 characters. The badge container is fixed-size (`h-8 w-8`) so overflow is impossible. Initials are rendered in `font-mono` (JetBrains Mono) for consistent fixed-width display.

> **Note:** The simplified two-rule algorithm replaces the more complex camelCase-extraction approach in the draft spec. GoPay now renders as **GOP** (not GP). In practice, GoPay users will pick `lucide:smartphone` via auto-suggestion — the initials badge is only a fallback.

### 5.4 Curated Icon Picker List

**Auto option (always first):**

| Label (EN / ID) | Value |
|---|---|
| Auto (Initials) / Otomatis (Inisial) | `initials` |

Rendered as a live `PaymentMethodIcon` preview using the current name field value.

**Lucide icons (8 options):**

| Label (EN / ID) | Value | Lucide component |
|---|---|---|
| Bank / Bank | `lucide:landmark` | `Landmark` |
| Building / Gedung | `lucide:building2` | `Building2` |
| Wallet / Dompet | `lucide:wallet` | `Wallet` |
| Phone / Ponsel | `lucide:smartphone` | `Smartphone` |
| Card / Kartu | `lucide:credit-card` | `CreditCard` |
| Cash / Tunai | `lucide:banknote` | `Banknote` |
| Coins / Koin | `lucide:coins` | `Coins` |
| Savings / Tabungan | `lucide:piggy-bank` | `PiggyBank` |

All Lucide components are already bundled — no additional packages needed.

### 5.5 Auto-Suggestion Behavior

**Option 2 — Always suggest (highlight only).**

`suggestIconFromName(name)` runs on every render and returns the best-match icon value based on case-insensitive name pattern matching:

| Name pattern | Suggested value |
|---|---|
| Contains: BCA, BRI, BNI, Mandiri, BSI, CIMB, Permata, BTN, Jenius, Danamon, Bank | `lucide:landmark` |
| Contains: GoPay, OVO, Dana, Shopee, LinkAja, Flip, QRIS, Pay, Wallet | `lucide:smartphone` |
| Contains: Cash, Tunai, Uang | `lucide:banknote` |
| Contains: Credit, Kredit, Kartu | `lucide:credit-card` |
| Anything else | `initials` |

**Ring visual states:**

| State | Visual |
|---|---|
| Default (neither) | `border-border` — no ring |
| Suggested only | Dashed ring: `border-2 border-dashed border-primary/60` |
| Selected only | Solid ring + glow: `border-2 border-primary ring-2 ring-primary/20 bg-primary/5` |
| Both (selected = suggested) | Both layers applied simultaneously — they coexist |

The suggestion ring tracks the current name field on every keystroke. The selection ring only changes on explicit user click. Both are visual only — the `value` prop (from parent state) is the single source of truth for the saved icon.

### 5.6 Updated BalanceCard

Replace `TYPE_ICONS` record and the `bg-primary/10` icon container with:

```tsx
<PaymentMethodIcon
  name={balance.name}
  icon={balance.icon}
  type={balance.type}
  size="md"
/>
```

Container sizing (`h-8 w-8`, `rounded-lg`) is maintained by `PaymentMethodIcon` — no layout shift. `TYPE_LABELS` and the type badge text are unaffected. The `PaymentMethodBalance` contract already includes `icon: string` and the balance service already selects it — no changes needed in those layers.

### 5.7 Updated Settings Form

**Add form:**
- Add `newMethodIcon` state (default: `'initials'`)
- Insert `<IconPicker>` between Name and Type
- Pass live name field value as `paymentMethodName` prop
- Replace `icon: 'wallet'` in `handleAddMethod` with `icon: newMethodIcon`

**Edit dialog:**
- Add `editIcon` state
- Initialise `editIcon` from `editingMethod.icon` when the dialog opens (reset on close)
- Insert `<IconPicker>` between Name and Type
- Add `icon: editIcon` to the `handleEditSave` update payload

### 5.8 Updated Transaction Form

`TransactionForm.tsx` currently uses a native HTML `<select>` element, which cannot render React components inside `<option>` tags. To show icons in the dropdown, the payment method field must be converted from a native `<select>` to a shadcn `Select` (the `select.tsx` component already exists in `src/components/ui/`).

Changes to `src/features/transactions/TransactionForm.tsx`:
- Replace the native `<select>` / `<option>` block for payment method with `<Select>` / `<SelectTrigger>` / `<SelectContent>` / `<SelectItem>`
- `SelectTrigger` inner content: `flex items-center gap-2` wrapper + `<PaymentMethodIcon size="sm">` + payment method name
- Each `SelectItem`: same `flex items-center gap-2` wrapper + `<PaymentMethodIcon size="sm">` + name
- Wire `value` / `onValueChange` to the existing `paymentMethod` state — behaviour is unchanged, only the visual element is replaced

No API change required — `paymentMethods` state already contains `icon` via `api.paymentMethods.list()`.

### 5.9 Component Specifications

#### `PaymentMethodIcon`

File: `src/components/shared/PaymentMethodIcon.tsx`

```typescript
interface PaymentMethodIconProps {
  name: string;                          // for initials computation
  icon: string;                          // 'initials' | 'lucide:*' | legacy bare
  type: 'bank' | 'cash' | 'ewallet';
  size?: 'sm' | 'md' | 'lg';            // default: 'md'
  className?: string;
}
```

Size mapping:

| size | Container | Lucide icon | Initials text |
|---|---|---|---|
| `sm` | `h-6 w-6` | `h-3 w-3` | `text-[9px]` |
| `md` | `h-8 w-8` | `h-4 w-4` | `text-[10px]` |
| `lg` | `h-10 w-10` | `h-5 w-5` | `text-xs` |

Render decision tree:
1. `icon` starts with `"lucide:"` → look up Lucide component in static map → render icon
2. `icon` has no colon (legacy `"wallet"`) → `normalizeIconValue()` prepends `"lucide:"` → look up → render icon
3. `icon = "initials"` / null / `""` → `computeInitials(name)` → render badge
4. `"lucide:"` prefix but unknown name → static map miss → fall back to initials (graceful degradation)

Use a static lookup object for Lucide components — no dynamic imports.

When used alongside a visible text label, add `aria-hidden="true"` (decorative role).

#### `IconPicker`

File: `src/components/shared/IconPicker.tsx`

```typescript
interface IconPickerProps {
  value: string;                         // current selected icon value
  onChange: (icon: string) => void;
  paymentMethodName?: string;            // live name field value → drives suggestion
  type?: 'bank' | 'cash' | 'ewallet';   // for initials preview color
  locale: 'en' | 'id';
}
```

Layout: `grid grid-cols-3 gap-1.5`. Each cell: icon preview + label side by side.

- Suggestion ring (dashed) and selection ring (solid + glow) applied independently per cell
- Each button: `aria-label` with EN icon name + `aria-pressed={value === cellIconValue}`
- "Auto" cell at top-left renders a live `PaymentMethodIcon` preview using `paymentMethodName`
- Does not open in a dropdown — renders inline in the form

#### `paymentMethodIconUtils.ts`

File: `src/lib/payment-method-icon-utils.ts`

```typescript
// Derives 1–3 char abbreviation from payment method name
computeInitials(name: string): string

// Returns suggested icon value based on name pattern matching
// Returns 'lucide:*' or 'initials'
suggestIconFromName(name: string): string

// Normalizes legacy bare values ('wallet' → 'lucide:wallet')
// Returns 'initials' for null / empty
normalizeIconValue(icon: string | null): string
```

Pure functions — no React, no side effects. Extracted here so they can be unit tested in isolation.

---

## 6. API Layer Changes

### `createPaymentMethodSchema` (`src/lib/api/validation.ts`)

```diff
- icon: z.string().max(50).optional().default('wallet'),
+ icon: z.string().max(50).optional().default('initials'),
```

Non-breaking. Existing rows with `icon = 'wallet'` render as `lucide:wallet` via normalization.

### No other API changes needed

`updatePaymentMethodSchema`, route handlers, repository, service, balance service, `contracts.ts`, and `client.ts` are all untouched.

### `src/server/db/seed.ts`

Update seeded payment methods with meaningful icons:

| Name pattern | Icon |
|---|---|
| BCA, BRI, BNI, Mandiri, BSI | `lucide:landmark` |
| GoPay, OVO, Dana, ShopeePay | `lucide:smartphone` |
| Cash / Tunai | `lucide:banknote` |
| Jenius, Jago, SeaBank | `initials` |

---

## 7. i18n Keys

Add to `src/lib/i18n.ts` under the `// Category icons` comment block:

| Key | EN | ID |
|---|---|---|
| `chooseIcon` | Choose Icon | Pilih Ikon |
| `iconStyle` | Icon Style | Gaya Ikon |
| `autoInitials` | Auto (Initials) | Otomatis (Inisial) |
| `paymentMethodIcon` | Payment Method Icon | Ikon Metode Pembayaran |

---

## 8. Files to Create

| File | Purpose |
|---|---|
| `src/components/shared/PaymentMethodIcon.tsx` | Renders Lucide icon or initials badge; 3 sizes |
| `src/components/shared/IconPicker.tsx` | 3-column inline grid; solid + dashed ring states |
| `src/lib/payment-method-icon-utils.ts` | `computeInitials`, `suggestIconFromName`, `normalizeIconValue` |
| `src/tests/payment-method-icon-utils.test.ts` | ~12 unit test cases for pure functions |
| `src/tests/PaymentMethodIcon.test.tsx` | ~6 rendering test cases |

---

## 9. Files to Modify

| File | Change summary |
|---|---|
| `src/features/balances/BalanceCard.tsx` | Swap `TYPE_ICONS` + `bg-primary/10` for `<PaymentMethodIcon>` |
| `src/app/settings/categories/page.tsx` | Add `newMethodIcon` + `editIcon` state; insert `<IconPicker>` in add form and edit dialog; wire handlers |
| `src/features/transactions/TransactionForm.tsx` | Convert native `<select>` to shadcn `Select`; add `<PaymentMethodIcon size="sm">` to trigger and each item |
| `src/lib/api/validation.ts` | Change `createPaymentMethodSchema` icon default: `'wallet'` → `'initials'` |
| `src/lib/i18n.ts` | Add 4 new i18n keys to type definition and both locale objects |
| `src/server/db/seed.ts` | Assign meaningful icon values to seeded payment methods |
| Existing API test file | Add 4 regression test cases for icon field |

---

## 10. Testing

### Unit tests — `payment-method-icon-utils.test.ts`

**`computeInitials`:**
- "BCA" → "BCA" · "OVO" → "OVO" · "DANA" → "DAN"
- "Mandiri" → "MAN" · "Cash" → "CAS" · "Tunai" → "TUN"
- "SeaBank" → "SEA" · "GoPay" → "GOP"
- "CIMB Niaga" → "CN" · "BCA Syariah" → "BS"
- `""` → `"?"` · `"   "` → `"?"`

**`suggestIconFromName`:**
- "BCA Saving" → `lucide:landmark`
- "GoPay Saldo" → `lucide:smartphone`
- "Uang Tunai" → `lucide:banknote`
- "BCA Credit Card" → `lucide:credit-card`
- "Investasi" → `initials`
- "gopay" → `lucide:smartphone` (case-insensitive)

**`normalizeIconValue`:**
- `'wallet'` → `'lucide:wallet'`
- `'lucide:landmark'` → `'lucide:landmark'` (unchanged)
- `null` → `'initials'` · `''` → `'initials'`

### Component tests — `PaymentMethodIcon.test.tsx`

- `icon='lucide:landmark'`, `type='bank'` → renders Landmark icon with blue background
- `icon='lucide:smartphone'`, `type='ewallet'` → renders Smartphone icon with emerald background
- `icon='initials'`, `name='BCA'` → renders text "BCA" in blue badge
- `icon=null` → falls back to initials (no crash)
- `icon='lucide:nonexistent'` → graceful fallback to initials
- `size='sm'` → container has `h-6 w-6` · `size='lg'` → `h-10 w-10`

### API regression tests (additions to existing test file)

- `POST /api/payment-methods` with `icon: 'lucide:landmark'` → stores and returns value
- `POST /api/payment-methods` without `icon` → defaults to `'initials'` (not `'wallet'`)
- `PATCH /api/payment-methods/[id]` with `icon: 'lucide:wallet'` → updates stored value
- `GET /api/payment-methods` → `icon` field present on every item

---

## 11. Edge Cases

| Case | Handling |
|---|---|
| Legacy `icon = 'wallet'` rows | `normalizeIconValue('wallet')` prepends `'lucide:'` at render time. Not re-saved. Code comment in `PaymentMethodIcon` explains dual format. |
| Unknown Lucide icon name | Static lookup map miss → graceful fallback to initials badge. Covered by unit test. |
| `null` or empty `icon` from DB | Repository mapper returns `icon: row.icon ?? 'initials'`. `PaymentMethod` type declares `icon: string` — null must not propagate. |
| Very long names in badge | `computeInitials` bounded to 3 chars max. Fixed container size makes overflow impossible. |
| Edit dialog state reset | `editIcon` initialised from `editingMethod.icon` when dialog opens. Resets when closed and reopened for a different method. |
| Initials font | `font-mono` (JetBrains Mono) for fixed-width character alignment, consistent with currency display. |
| Accessibility | `IconPicker` buttons: `aria-label` (EN name) + `aria-pressed`. `PaymentMethodIcon`: `aria-hidden="true"` when decorative (alongside visible text label). |

---

## 12. Out of Scope / Future Considerations

- **`credit` type:** Adding a credit card payment method type requires schema migration and Zod enum updates. Deferred. Users can model credit cards as `bank` type.
- **Color customization:** Allowing users to pick a custom background color per method (independent of type) is a natural follow-on.
- **Icons on transaction list rows:** The `PaymentMethodIcon` component can be reused in the transaction table with no API changes — separate UX work.

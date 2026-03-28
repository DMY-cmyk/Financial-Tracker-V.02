---
feature: Payment Method Icons
type: spec
date: 2026-03-27
status: draft
tier: 4
---

# Feature 17 — Payment Method Icons

**Date:** 2026-03-27
**Scope:** Add user-selectable visual icons to each payment method; update the balance cards and settings form to display and pick icons.

---

## 1. Overview

The balance cards on the dashboard (`AccountBalancesWidget` → `BalanceGrid` → `BalanceCard`) currently identify each payment method using only a type-based Lucide icon: `Building2` for banks, `Wallet` for cash, and `Smartphone` for e-wallets. All bank accounts share the same icon regardless of their name. A user with BCA, BRI, and Mandiri accounts sees three identical blue building icons — they must read the small text label to distinguish cards.

For Indonesian users managing multiple accounts across banks and e-wallets this is a friction point. The goal is to make each balance card immediately recognizable at a glance by assigning a distinct visual icon per payment method.

The `icon` column already exists in the `payment_methods` table and is mapped through every layer of the stack (repository, service, API, TypeScript types, contracts). However the Settings UI never exposes it for selection: the add form hard-codes `'wallet'` and the edit dialog omits it entirely. This feature completes the loop between the stored column and the visible UI.

---

## 2. Goals

1. Allow users to select a visual icon for each payment method from a curated, predefined list when adding or editing a payment method.
2. Display the selected icon (or a computed initials fallback) on every `BalanceCard` in place of the current type-only generic icon.
3. Show the icon alongside the payment method name in the transaction form's payment method dropdown so users can identify accounts quickly when recording transactions.
4. Auto-suggest a sensible icon when the user types a recognizable Indonesian payment method name (BCA, GoPay, Dana, etc.).
5. Ensure the icon selection is persisted through the existing API — no schema changes required.
6. Keep all new strings bilingual (EN/ID) via `t(locale, key)`.

---

## 3. Non-Goals

- No custom image upload (PNG, SVG, JPEG).
- No official brand logo assets. Using actual bank or e-wallet logos would raise trademark and IP concerns. All icons must be either standard Lucide icons or auto-generated initials badges.
- No animated icons or micro-animations on the icon itself (the card wrapper already has Framer Motion entrance animation from `staggerGridItem`).
- No `credit` type support in this feature. The current schema, TypeScript types, Zod schemas, and UI all use `'bank' | 'cash' | 'ewallet'`. Credit card accounts are modelled as `bank` type for now and are out of scope here.
- No per-icon color overrides by the user. Color is derived from the payment method type (see Section 5.2), not user-configurable.
- No icon search or filtering beyond the predefined grid.

---

## 4. Icon Strategy

Four strategies were considered.

### Strategy A — Lucide icons only

Use generic Lucide icons from the existing dependency: `Landmark`, `Building2`, `Wallet`, `Smartphone`, `CreditCard`, `Banknote`, `Coins`. Safe and technically trivial, but offers no way to distinguish between BCA and BRI since both are banks.

**Verdict:** Insufficient differentiation.

### Strategy B — Colored initials badge

Auto-compute a 2–3 character abbreviation from the payment method name (e.g., "BCA" from "BCA", "GP" from "GoPay", "OVO" from "OVO"). Render the abbreviation inside a colored rounded rectangle, where the color is determined by the payment method type. Requires no icon library additions and produces a unique, instantly recognizable badge for each account.

**Verdict:** Strong differentiation, no IP issues, scales to any payment method name.

### Strategy C — Emoji set

Use emoji characters (🏦 💳 📱 💰 💵) as icons. Universally supported, zero dependencies. However, emoji rendering varies significantly across operating systems and browsers, they do not respect the app's dark/light theme, and they look out of place in a professional finance dashboard.

**Verdict:** Rejected — inconsistent rendering, unprofessional appearance.

### Strategy D — Combination (recommended)

Combine a curated set of Lucide icons (for generic choices) with an auto-generated colored initials badge as the default fallback. Lucide icons give users quick semantic choices (bank, wallet, card, cash). The initials badge provides a unique identity for specific Indonesian payment methods where no generic icon is distinct enough. The badge color is always driven by type, keeping the color system consistent with the rest of the UI.

**Verdict: Adopt Strategy D.** It provides the best balance of visual distinctiveness, technical simplicity, and consistency with the existing design language. It avoids all IP concerns while being immediately useful for the target audience.

---

## 5. Design

### 5.1 Icon Value Format

The `icon` column stores a plain string. The following formats are valid:

| String value | Meaning |
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
| `null` / empty string | Falls back to `"initials"` |

The `"initials"` value is the application default. The existing payment methods in the database that have `icon = 'wallet'` (set by the current hard-coded create handler) will render as `lucide:wallet` until the user updates them, which is acceptable behavior.

The Zod schema for `createPaymentMethodSchema` already accepts `icon: z.string().max(50).optional().default('wallet')`. This must be updated to `default('initials')` to align with the new default. The `updatePaymentMethodSchema` already accepts `icon` as an optional string field and needs no structural change, only a max-length increase to 50 characters which it already has.

### 5.2 Color Theming by Type

Icon backgrounds and initials badges use a fixed color palette keyed to the payment method type. This keeps the visual language consistent with the existing type badge colors already used throughout the dashboard.

| Type | Background (light) | Text color | Hex |
|---|---|---|---|
| `bank` | `bg-blue-100` | `text-blue-700` | Primary blue family |
| `ewallet` | `bg-emerald-100` | `text-emerald-700` | Emerald family |
| `cash` | `bg-amber-100` | `text-amber-700` | Amber family |

In dark mode the same semantic tokens apply with their dark-mode counterparts (`dark:bg-blue-900/30 dark:text-blue-400`, etc.). Use Tailwind utility classes rather than inline hex values to respect the theme system.

### 5.3 Initials Computation

When `icon === 'initials'` (or null/empty), the `PaymentMethodIcon` component derives a display abbreviation from the payment method name:

1. Split the name on spaces and non-alphanumeric boundaries.
2. If the first token is already 2–4 uppercase letters (e.g., "BCA", "OVO", "BRI", "DANA"), use it as-is.
3. If the name is a single lowercase/mixed-case word, take the first 2–3 uppercase characters.
4. If the name contains multiple words (e.g., "CIMB Niaga", "Sea Bank", "BCA Syariah"), take the first letter of each word up to 3 letters (e.g., "CN", "SB", "BS").
5. If a fallback cannot be computed, use "?" as the abbreviation.
6. The result is always 1–3 characters.

Examples:

| Payment method name | Computed initials |
|---|---|
| BCA | BCA |
| BRI | BRI |
| Mandiri | MAN |
| GoPay | GP |
| OVO | OVO |
| Dana | DAN |
| ShopeePay | SP |
| CIMB Niaga | CN |
| BCA Syariah | BS |
| Jenius | JEN |
| SeaBank | SEA |
| Cash / Tunai | CA / TUN |

### 5.4 Curated Icon Picker List

The icon picker presents two sections:

**Section 1 — Lucide Icons (8 options)**

| Display label (EN / ID) | Icon name | Lucide component |
|---|---|---|
| Bank / Bank | `lucide:landmark` | `Landmark` |
| Building / Gedung | `lucide:building2` | `Building2` |
| Wallet / Dompet | `lucide:wallet` | `Wallet` |
| Phone / Ponsel | `lucide:smartphone` | `Smartphone` |
| Card / Kartu | `lucide:credit-card` | `CreditCard` |
| Cash / Tunai | `lucide:banknote` | `Banknote` |
| Coins / Koin | `lucide:coins` | `Coins` |
| Savings / Tabungan | `lucide:piggy-bank` | `PiggyBank` |

All of these Lucide components are already bundled with Lucide React. No additional package installation is needed.

**Section 2 — Auto (always shown first)**

| Display label (EN / ID) | Value |
|---|---|
| Auto (Initials) / Otomatis (Inisial) | `initials` |

The "Auto" option appears above the Lucide grid as the default/reset option, rendered as a small badge preview using the computed initials of the payment method name entered in the name field.

### 5.5 Auto-Suggestion Logic

When the user types in the payment method name field, the icon picker updates its suggestion highlight based on name pattern matching (case-insensitive):

| Name pattern | Suggested icon value |
|---|---|
| Contains: BCA, BRI, BNI, Mandiri, BSI, CIMB, Permata, BTN, Jenius, Danamon, Bank | `lucide:landmark` |
| Contains: GoPay, OVO, Dana, Shopee, LinkAja, Flip, QRIS, Pay, Wallet | `lucide:smartphone` |
| Contains: Cash, Tunai, Uang | `lucide:banknote` |
| Contains: Credit, Kredit, Kartu | `lucide:credit-card` |
| Anything else | `initials` |

The suggestion is shown as a highlighted default in the picker but the user can override it. The suggestion only updates the picker highlight — it does not silently change the user's existing explicit selection if they have already made one.

### 5.6 Updated BalanceCard Rendering

The current `BalanceCard` uses a `TYPE_ICONS` record mapping `type → LucideComponent` and renders a single 32×32 icon container with `bg-primary/10`. This will be replaced with `PaymentMethodIcon` which:

- Renders the correct Lucide icon when `icon` starts with `"lucide:"`.
- Renders a colored initials badge when `icon === 'initials'` or is null/empty.
- Uses the type-keyed color scheme from Section 5.2 for both the icon background and initials badge background.
- Maintains the existing 32×32 (`h-8 w-8`) container size and `rounded-lg` border radius to avoid layout changes.

The `TYPE_LABELS` record and type badge text below the name are unaffected.

The `PaymentMethodBalance` contract type in `src/lib/api/contracts.ts` already includes `icon: string`, so no contract changes are needed.

### 5.7 Updated Settings Form

**Add Payment Method section** (currently inline in the page card):

Add an "Icon" label and `IconPicker` component between the name input and the type select. The picker renders as a horizontal scrollable row on mobile and a wrapped grid on desktop, fitting within the existing `flex flex-wrap items-end gap-3` layout.

The picker occupies approximately the same width as the existing category icon grid (`max-w-[280px]`). A preview badge renders next to the picker showing the currently selected icon with the name abbreviation as it would appear on the balance card.

**Edit Payment Method dialog** (`sm:max-w-sm` Dialog):

Add an "Icon" field between the Name and Type fields. The same `IconPicker` component is used. Pre-populate it with the method's current `icon` value when the dialog opens.

The API call in `handleEditSave` currently sends only `name` and `type`. It must be updated to also send `icon` from the new `editIcon` state field.

### 5.8 Component Specifications

#### `PaymentMethodIcon`

File: `src/components/shared/PaymentMethodIcon.tsx`

Props:
```
interface PaymentMethodIconProps {
  name: string;            // used for initials computation
  icon: string;            // icon value from DB (e.g., 'initials', 'lucide:wallet')
  type: 'bank' | 'cash' | 'ewallet';
  size?: 'sm' | 'md' | 'lg';  // sm=24px, md=32px (default), lg=40px
  className?: string;
}
```

Responsibilities:
- Parse `icon` string to determine render mode (`lucide:*` vs `initials` vs fallback).
- Map the Lucide icon name (e.g., `"landmark"`) to the correct Lucide component. Use a static lookup object — do not use dynamic imports.
- Apply type-keyed background and text color classes.
- Compute initials from `name` using the algorithm in Section 5.3.
- Render initials in `font-mono` to ensure fixed-width display.
- Render Lucide icon at `h-4 w-4` (sm), `h-4 w-4` (md, matching current BalanceCard), or `h-5 w-5` (lg).
- `size` controls the container dimensions: `h-6 w-6` (sm), `h-8 w-8` (md), `h-10 w-10` (lg).
- For initials, text size scales accordingly: `text-[9px]` (sm), `text-[10px]` (md), `text-xs` (lg).

#### `IconPicker`

File: `src/components/shared/IconPicker.tsx`

Props:
```
interface IconPickerProps {
  value: string;               // current icon value
  onChange: (icon: string) => void;
  paymentMethodName?: string;  // for initials preview and auto-suggestion
  type?: 'bank' | 'cash' | 'ewallet';
  locale: 'en' | 'id';
}
```

Responsibilities:
- Render the "Auto (Initials)" option first, shown as a small `PaymentMethodIcon` preview badge with the `initials` value.
- Render the 8 Lucide icon options in a responsive grid (`grid grid-cols-4 gap-1.5` or similar).
- Highlight the selected option with `ring-primary ring-1 bg-primary/10`.
- Accept `paymentMethodName` to show the auto-suggestion highlight when `value` hasn't been explicitly changed by the user.
- Each option button has an `aria-label` with the EN icon name for accessibility.
- The picker does not open in a dropdown — it renders inline in the form to match the existing category icon picker pattern in `CategoriesPage`.

---

## 6. API Layer Changes

### `createPaymentMethodSchema` (src/lib/api/validation.ts)

Change the default for `icon` from `'wallet'` to `'initials'`:

```
icon: z.string().max(50).optional().default('initials'),
```

This is a non-breaking change. Existing DB rows with `icon = 'wallet'` continue to render as `lucide:wallet` since the `PaymentMethodIcon` component handles that value correctly.

### `updatePaymentMethodSchema` (src/lib/api/validation.ts)

No structural change needed. The field is already present as `icon: z.string().max(50).optional()`. The max-length of 50 is sufficient for all icon values in Section 5.1.

### API route handlers (src/app/api/payment-methods/route.ts and [id]/route.ts)

No changes required. The routes delegate to the service, which delegates to the repository, all of which already handle the `icon` field end-to-end.

### Typed API client (src/lib/api/client.ts)

The `paymentMethods.create` call in the settings page currently passes `icon: 'wallet'` hard-coded. This will be replaced by the user-selected value from the new `IconPicker`. The client's `create` and `update` method signatures are unaffected since they accept the full `CreatePaymentMethodInput` / `UpdatePaymentMethodInput` types which already include `icon`.

---

## 7. i18n Keys

Four new keys are required. Both EN and ID translations must be added to `src/lib/i18n.ts` in the `TranslationKeys` type definition and both locale objects.

| Key | EN | ID |
|---|---|---|
| `chooseIcon` | Choose Icon | Pilih Ikon |
| `iconStyle` | Icon Style | Gaya Ikon |
| `autoInitials` | Auto (Initials) | Otomatis (Inisial) |
| `paymentMethodIcon` | Payment Method Icon | Ikon Metode Pembayaran |

Add them under the `// Category icons` comment block near `selectIcon` in the type definition. Place the translation values immediately after the `selectIcon` translations in both locale objects.

---

## 8. Files to Create

| File | Purpose |
|---|---|
| `src/components/shared/PaymentMethodIcon.tsx` | Renders Lucide icon or initials badge; used in BalanceCard and IconPicker |
| `src/components/shared/IconPicker.tsx` | Icon selection grid rendered inline in the payment method add/edit forms |

---

## 9. Files to Modify

| File | Change summary |
|---|---|
| `src/lib/api/validation.ts` | Change `createPaymentMethodSchema` icon default from `'wallet'` to `'initials'` |
| `src/lib/i18n.ts` | Add 4 new i18n keys to type definition and both locale objects |
| `src/features/balances/BalanceCard.tsx` | Replace `TYPE_ICONS` lookup + Lucide render with `PaymentMethodIcon` component |
| `src/app/settings/categories/page.tsx` | Add `IconPicker` to add form and edit dialog; update `handleAddMethod` and `handleEditSave` to pass icon value |

---

## 10. Testing

### Unit tests

**PaymentMethodIcon rendering (new test file)**

- Given `icon = 'lucide:landmark'` and `type = 'bank'`, renders a Lucide `Landmark` icon with blue background.
- Given `icon = 'lucide:smartphone'` and `type = 'ewallet'`, renders a Lucide `Smartphone` icon with emerald background.
- Given `icon = 'lucide:banknote'` and `type = 'cash'`, renders a Lucide `Banknote` icon with amber background.
- Given `icon = 'initials'` and `name = 'BCA'`, renders the text "BCA" inside a blue badge.
- Given `icon = 'initials'` and `name = 'GoPay'`, renders "GP" inside an emerald badge.
- Given `icon = null` (empty string), falls back to initials rendering.
- Given `icon = 'lucide:unknown-icon'`, falls back to initials rendering (graceful degradation, not an error).
- Initials truncation: `name = 'CIMB Niaga'` → renders "CN"; `name = 'BCA Syariah'` → renders "BS".
- `size = 'sm'` applies `h-6 w-6` container class.
- `size = 'lg'` applies `h-10 w-10` container class.

**Icon auto-suggestion logic (new test file or added to existing utils tests)**

- Name "BCA Saving" → suggested icon is `lucide:landmark`.
- Name "GoPay Saldo" → suggested icon is `lucide:smartphone`.
- Name "Uang Tunai" → suggested icon is `lucide:banknote`.
- Name "BCA Credit Card" → suggested icon is `lucide:credit-card`.
- Name "Investasi" → suggested icon is `initials` (no pattern match).
- Logic is case-insensitive: "gopay" → `lucide:smartphone`.

**API icon field persistence**

- `POST /api/payment-methods` with `icon: 'lucide:landmark'` stores and returns the value.
- `POST /api/payment-methods` without `icon` defaults to `'initials'` (not `'wallet'`).
- `PATCH /api/payment-methods/[id]` with `icon: 'lucide:wallet'` updates the stored value.
- `GET /api/payment-methods` returns `icon` on every item (regression check — currently returns `'wallet'` for existing rows).

---

## 11. Edge Cases and Risks

### Very long payment method names

The initials algorithm is bounded to 3 characters maximum. A name like "Bank Tabungan Negara Syariah Indonesia" produces "BTN" (first letters of first 3 words) rather than exceeding the badge width. The badge container has a fixed `h-8 w-8` size, so text must never exceed 3 characters.

### Existing DB rows with `icon = 'wallet'`

Rows seeded or created by the current hard-coded handler have `icon = 'wallet'`. The `PaymentMethodIcon` component must treat `'wallet'` as `'lucide:wallet'` (matching the new format `'lucide:wallet'`) — i.e., the legacy bare value `'wallet'` should also be handled. The simplest approach: in the Lucide lookup map, include `'wallet'` (without prefix) as an alias for `Wallet`. Alternatively, the component can normalize: if the value contains no colon and is a known Lucide name, prepend `'lucide:'` before lookup.

Document this legacy handling in a code comment so future maintainers understand the dual format.

### `icon` column Zod max-length

Current max is 50 characters. All values in Section 5.1 are well under 50. No change required.

### `updatePaymentMethodSchema` — icon not currently sent from edit dialog

The edit dialog in `CategoriesPage` currently calls `api.paymentMethods.update(id, { name, type })` without `icon`. After this feature ships, it must also send `icon`. If this is missed, editing any field of a payment method will silently leave the icon unchanged (since the PATCH is partial and the update schema is fully optional). This is acceptable as a fallback but the intent is to fully round-trip the value. Make sure `editIcon` state is initialised from `editingMethod.icon` when the dialog opens.

### `PaymentMethodBalance.icon` in the balance API response

The `balance.service.ts` computes balances by joining with `payment_methods`. The `PaymentMethodBalance` contract in `contracts.ts` already includes `icon: string`. Verify the balance service includes `icon` in the `SELECT` and maps it through. If it does not, this must be fixed as part of this feature (the service already maps `type` and `name`, so `icon` should be straightforward to add if missing).

### Empty icon field in older seeded data

The seed file in `src/server/db/seed.ts` may create payment methods with `icon = null` or an older value. Verify the `rowToPm` mapper in the repository returns `icon: row.icon ?? 'initials'` rather than allowing null to propagate to the type system (the `PaymentMethod` type declares `icon: string`, not `string | null`).

### IconPicker accessibility

Each icon button in the picker must have an `aria-label` so screen readers can announce the icon choice. Use the EN label regardless of locale since icon names like "Landmark" or "Wallet" are internationally understood. The selected icon must be marked `aria-pressed={true}` or use a visible checkmark overlay.

---

## 12. Out of Scope / Future Considerations

- **`credit` type**: Adding a `credit` payment method type (e.g., BCA Credit Card, Mandiri Credit) would require schema migration, Zod enum updates, and UI changes. This is deferred. Users can currently model credit cards as `bank` type with a name that makes the purpose clear.
- **Color customization**: Allowing users to pick a custom background color per method (independent of type) would be a natural follow-on to this feature.
- **Icon on transaction rows**: Showing the `PaymentMethodIcon` in the transaction list and form dropdowns is a natural use of the new component but is separate UX work. The component can be reused without any API changes.
- **Seeded defaults**: Updating the `src/server/db/seed.ts` sample data to assign meaningful icons (e.g., BCA → `lucide:landmark`, GoPay → `lucide:smartphone`) would improve the first-run experience for new users or developers resetting their local DB. This is low-effort and should be done alongside the implementation.

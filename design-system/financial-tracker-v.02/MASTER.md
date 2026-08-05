# Design System Master File — Financial Tracker V.02

> **LOGIC:** When building a specific page, first check `design-system/financial-tracker-v.02/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Financial Tracker V.02
**Updated:** 2026-08-05
**Category:** Personal finance / budgeting dashboard (IDR)
**Style:** Editorial — paper-and-ink surfaces, hard rules, warm accent; card-based bento grid. NEVER spreadsheet-like.

This file documents the design system **as implemented** in `src/app/globals.css` (source of truth for tokens) and `src/lib/motion.ts` (source of truth for animation). If code and this file disagree, the code wins — update this file.

---

## Global Rules

### Color Palette (Editorial tokens)

All colors are CSS variables defined in `src/app/globals.css` under `:root` (light) and `.dark` (dark). **Never hardcode hex values in components** — use Tailwind semantic classes or `var(--token)`.

| Role                          | Token                           | Light     | Dark      |
| ----------------------------- | ------------------------------- | --------- | --------- |
| Page background               | `--paper`                       | `#ffffff` | `#14110d` |
| Section band                  | `--paper-2`                     | `#f4f4f2` | `#1c1813` |
| Primary text                  | `--ink`                         | `#0a0a0a` | `#f6f1e8` |
| Secondary text                | `--ink-2`                       | `#1a1a1a` | `#d9cfb9` |
| Muted/help text               | `--ink-3`                       | `#6b6b6b` | `#97907f` |
| Hard rule (editorial divider) | `--rule`                        | `#0a0a0a` | `#f6f1e8` |
| Hairline border               | `--rule-soft`                   | `#e6e6e3` | `#2e2820` |
| Card surface                  | `--card`                        | `#ffffff` | `#1c1813` |
| Inset card fill               | `--card-2`                      | `#fafaf8` | `#221d16` |
| Accent (primary CTA)          | `--accent`                      | `#ff5b1f` | `#d3b266` |
| Income / positive             | `--pos` (+ `--pos-soft` tint)   | `#1f5b3e` | `#7cc295` |
| Expense / negative            | `--neg` (+ `--neg-soft` tint)   | `#a8341f` | `#e88871` |
| Warning                       | `--warn` (+ `--warn-soft` tint) | `#a76b1c` | `#e0b169` |

Legacy shadcn semantic tokens (`--primary`, `--muted`, `--destructive`, `--ring`, …) alias to the editorial tokens — keep using `bg-primary`, `text-muted-foreground`, etc. in components. Charts use `--chart-income` / `--chart-expense` / `--chart-color-{1..6}`. Brand mint (`--brand-mint`) is opt-in chrome only (hero band).

**Semantic conventions:**

- Income amounts → `--pos`; expenses → `--neg`; warnings → `--warn`. Always pair color with an icon or sign (+/−) — never color alone.
- One primary CTA (accent) per screen; secondary actions are outline/ghost.
- Destructive actions use the destructive/neg color AND require `ConfirmDialog` (never `window.confirm()`).

### Typography

Fonts are loaded via `next/font` in `src/app/layout.tsx`:

- **Display / headings:** Fraunces (`--font-display`) — editorial serif for page titles and hero numbers
- **UI / body:** Geist (`--font-sans`)
- **Currency & tabular figures:** Geist Mono (`--font-mono`) — all IDR amounts, dates in tables, timers

Rules:

- Base body 16px, line-height 1.5–1.75; never below 12px.
- Use `font-mono` + tabular figures for money columns so digits align and don't shift.
- IDR formatting via `src/lib/formatters` — locale-aware, never hand-rolled.
- Bilingual EN/ID: all user-facing strings via `t(locale, 'key')` from `src/lib/i18n.ts`; add both EN and ID keys. Indonesian runs 20–40% longer — test for overflow.

### Radius, Spacing, Elevation

- `--radius: 1rem` — cards are `rounded-2xl`, inner controls step down (`rounded-md`/`rounded-lg`).
- 4/8px spacing rhythm (Tailwind scale). Section tiers: 16 / 24 / 32 / 48.
- Surface ladder: `--surface-1` (page) → `--surface-2` (card) → `--surface-3` (raised) → `--surface-inset` (well).
- Border ladder: `--border-subtle` → `--border` (`--rule-soft`) → `--border-strong` (active).
- Shadows: `--card-shadow` (rest) → `--card-shadow-hover` → `--elevated-shadow` (modals/popovers). Do not invent ad-hoc shadow values.

### Layout

- App shell: `h-screen` shell, content scrolls independently. Sidebar nav ≥1024px, bottom nav (≤5 items) below.
- Max widths: dashboard `max-w-7xl`, forms `max-w-lg`, settings/export `max-w-2xl`.
- Mobile-first; breakpoints 640 / 1024 / 1440. No horizontal page scroll — wide tables scroll inside their own container.

### Animation

Use presets from `src/lib/motion.ts` **only** — no inline animation configs:

- `fadeInUp` — page sections (opacity + y:8, 300ms)
- `staggerGrid` — card grids (80ms stagger, 400ms)
- `staggerList` — lists (40ms stagger, 250ms)
- `tapScale` — button press (scale 0.97)

Micro-interactions 150–300ms, ease-out enter / ease-in exit, transform+opacity only, respect `prefers-reduced-motion`.

---

## Component Rules

- shadcn/ui primitives in `src/components/ui/` (do not edit); compose in domain folders.
- Props interface `{ComponentName}Props`; `cn()` for conditional classes.
- Icons: Lucide only — consistent stroke, sized via tokens, never emojis.
- Every data view has loading (skeleton), empty (`EmptyState` with action), and error states.
- Forms: visible labels, inline errors below the field, semantic input types, submit buttons disabled + spinner during async, Sonner toast on success/failure (3–5s auto-dismiss).
- Touch targets ≥44×44px; visible focus rings; `aria-label` on icon-only buttons.

---

## Anti-Patterns (Do NOT Use)

- ❌ Spreadsheet UX — grid lines, editable cells, formula bars
- ❌ Browser dialogs (`confirm()`/`alert()`) — use `ConfirmDialog` / inline errors
- ❌ Emojis as icons — Lucide SVG only
- ❌ Hardcoded hex in components — semantic tokens only
- ❌ Hardcoded user-facing strings — i18n `t()` with EN + ID
- ❌ Inline Framer Motion configs — presets from `src/lib/motion.ts`
- ❌ AI purple/pink gradients; playful/toy styling — this is a finance product
- ❌ Color-only meaning (income/expense must also show sign or icon)
- ❌ Layout-shifting hover transforms; instant (0ms) state changes
- ❌ Invisible focus states; disabled zoom; text `<12px`

---

## Pre-Delivery Checklist

- [ ] Tokens only (no raw hex), both light AND dark verified — contrast ≥4.5:1 body text, ≥3:1 secondary
- [ ] Currency in Geist Mono with locale formatting; EN + ID strings present, no overflow at ID lengths
- [ ] Motion presets used; `prefers-reduced-motion` respected
- [ ] Loading / empty / error states for every data view
- [ ] Touch targets ≥44px; focus visible; icon-only buttons labeled
- [ ] Responsive at 375 / 768 / 1024 / 1440; no horizontal scroll; content not hidden behind bottom nav
- [ ] Destructive actions gated by ConfirmDialog; toasts for save/delete/export

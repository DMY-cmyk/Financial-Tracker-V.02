# Financial Tracker V.02 — Project Instructions

## Product Goals

This is a modern personal finance tracking dashboard designed for Indonesian Rupiah (IDR) budgeting. The primary user interaction is an at-a-glance bento grid dashboard with widget cards, NOT a spreadsheet.

- Card-based, widget-driven UI inspired by Mercury, Copilot Money, and Wise
- Bilingual: English and Bahasa Indonesia (EN/ID toggle)
- Fully client-side — static export via Next.js `output: 'export'` deployed to GitHub Pages
- Data persisted in localStorage via Zustand

## UX Constraints

- The app must NEVER look or feel like Google Sheets or a spreadsheet
- No visible grid lines, cell-based editing, or formula bars
- Tables are used sparingly and styled as card lists or structured data views
- Export files may use spreadsheet layouts — the app UI must not
- Interactions happen inline, in slide-over panels, or in modals — not in editable cells
- All destructive actions require confirmation via AlertDialog (not browser `confirm()`)
- Form validation shows inline errors, not alert boxes
- Toast notifications for save/delete/export feedback via Sonner

## Design Direction

### Visual Language
- Rounded cards (rounded-2xl), soft borders, subtle shadows
- Blue primary (#2563EB), Emerald for income, Red for expense, Amber for warnings
- Plus Jakarta Sans for UI text, JetBrains Mono for currency amounts
- Light and dark mode via `.dark` class on `<html>`

### Spacing & Layout
- Sidebar navigation on desktop (lg+), bottom nav on mobile
- Content area scrolls independently within h-screen shell
- Pages use `mx-auto max-w-{size}` for comfortable reading widths
- Dashboard: max-w-7xl, Forms: max-w-lg, Settings/Export: max-w-2xl

### Animation (Framer Motion)
- Subtle and purposeful — never distracting
- Page sections use `fadeInUp` entrance (opacity + y:8, 300ms)
- Card grids use `staggerGrid` variants (80ms stagger, 400ms duration)
- Lists use `staggerList` variants (40ms stagger, 250ms duration)
- Buttons: `tapScale` (scale 0.97) for press feedback
- Use presets from `src/lib/motion.ts` — don't create inline animation configs
- Respect `prefers-reduced-motion` where possible

## Coding Conventions

### General
- TypeScript strict mode, no `any`
- React function components only
- `'use client'` directive on components using hooks/state/browser APIs
- Clean prop interfaces defined at top of file or in `lib/types.ts`

### File Organization
```
src/app/          — Page routes (App Router)
src/components/   — UI components by domain
  ui/             — shadcn/ui primitives (do not edit)
  layout/         — AppShell, Sidebar, Topbar, BottomNav, PageHeader
  dashboard/      — Bento grid widget components
  transactions/   — Table, Form, Filters, CategoryChip, Summary
  upload/         — DropZone, OcrPreview, ProcessingOverlay, etc.
  export/         — FormatCard, ScopeSelector, ExportOptions, etc.
  settings/       — SettingsSection
  shared/         — Reusable: SummaryCard, EmptyState, Skeletons, ConfirmDialog, etc.
  providers/      — StoreProvider
src/hooks/        — Custom hooks (useDashboardData, useTransactions, useUpload, useExport)
src/lib/          — Utilities, types, constants, formatters, i18n, validation, motion, services
src/store/        — Zustand store and memoized selectors
```

### Component Conventions
- One component per file (except small related exports like EmptyState + NoResults)
- Props interface named `{ComponentName}Props`
- Use `cn()` from `@/lib/utils` for conditional classNames
- Prefer Tailwind utilities over custom CSS
- Use shadcn/ui primitives (Button, Input, Label, Dialog, Sheet, etc.)
- Wrap data-fetching logic in custom hooks, not in page components

### State Management
- Zustand store at `src/store/index.ts` with localStorage persistence
- Memoized selectors in `src/store/selectors.ts`
- UI state (month, year, theme, locale) in store's `ui` slice
- Derived/computed values via custom hooks or selectors, not in components

### Internationalization
- Translation dictionary in `src/lib/i18n.ts` (~110+ keys)
- Use `t(locale, 'key')` for translations
- Always add both EN and ID entries for new keys
- Keep strings short and clear for both languages
- Indonesian text is ~20-40% longer — test for overflow

### Code Quality
- Prettier for formatting (`npm run format`)
- ESLint for linting (`npm run lint`)
- `npm run preflight` runs format check + typecheck + lint + build
- CI runs on every push to `redesign` and every PR

## Responsiveness Expectations

| Breakpoint | Layout |
|------------|--------|
| < 640px (mobile) | Single column, bottom nav, compact cards, FAB for add |
| 640–1023px (tablet) | 2-column grids, bottom nav still visible |
| 1024px+ (desktop) | Sidebar visible, multi-column grids, hover states |
| 1440px+ (wide) | Same as desktop with comfortable max-widths |

## Anti-Patterns to Avoid

- **No spreadsheet UX**: No editable grid cells, no visible row/column headers, no formula bars
- **No browser dialogs**: Use `ConfirmDialog` component, not `window.confirm()`
- **No untyped props**: Always define TypeScript interfaces
- **No inline animation configs**: Use presets from `src/lib/motion.ts`
- **No raw localStorage**: Use Zustand store with persist middleware
- **No monolithic pages**: Extract logic into hooks, UI into components
- **No hardcoded strings**: Use i18n `t()` function for user-facing text
- **No unhandled states**: Every data view needs loading, empty, and error states

## Build & Deploy

```bash
npm run dev          # Local development
npm run build        # Static export to out/
npm run typecheck    # TypeScript check
npm run lint         # ESLint
npm run format       # Prettier auto-format
npm run format:check # Prettier verify
npm run validate     # typecheck + lint + build
npm run preflight    # Full CI check locally
```

GitHub Actions CI runs on pushes to `redesign` and PRs.
Deploy workflow builds from `main` branch and deploys `out/` to GitHub Pages.

## Key Dependencies

| Package | Purpose |
|---------|---------|
| next | App framework (static export) |
| zustand | State management |
| recharts | Charts (area, pie) |
| framer-motion | Animations |
| lucide-react | Icons |
| sonner | Toast notifications |
| xlsx (SheetJS) | Excel export |
| jspdf + jspdf-autotable | PDF export |
| tesseract.js | Client-side OCR |
| date-fns | Date formatting |

# Release & Deployment Guide

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
# Open http://localhost:3000

# Quality checks
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint
npm run format:check # Prettier format verification
npm run validate     # typecheck + lint + build
npm run preflight    # format:check + typecheck + lint + build (full CI equivalent)
```

## Environment Variables

Copy `.env.example` to `.env.local` for local overrides.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Production | Neon Postgres connection string (`postgresql://...`). Leave empty to use SQLite for local dev/tests. |
| `NEXT_PUBLIC_BASE_PATH` | No | Base path for deployment |
| `NEXT_PUBLIC_APP_TITLE` | No | Override app display title |

In production (Vercel), `DATABASE_URL` must point to a Neon Postgres instance.

## Build & Deploy

### Production Build

```bash
npm run build
# Produces a server-rendered Next.js app (NOT a static export)
```

The app uses server-side API routes backed by Neon Postgres. A Node.js runtime is required.

### Vercel Deployment (Recommended)

1. Connect the GitHub repo to Vercel
2. Set `DATABASE_URL` in Vercel environment variables (Neon Postgres connection string)
3. Vercel auto-deploys on push to `main`

### CI Pipeline

`.github/workflows/ci.yml` runs on:
- Every push to `redesign` branch
- Every pull request to `main` or `redesign`

Steps: install → typecheck → lint → format check → test (84 Vitest tests) → build

## Pre-Release Checklist

### Code Quality
- [ ] `npm run preflight` passes (format + typecheck + lint + build)
- [ ] No TypeScript `any` types in production code
- [ ] No `console.log` statements (except error.tsx)
- [ ] All i18n keys have both EN and ID translations

### Visual QA
- [ ] Light mode: all pages render correctly
- [ ] Dark mode: all pages render correctly, no contrast issues
- [ ] Mobile (375px): layout stacks properly, no horizontal overflow
- [ ] Tablet (768px): 2-column grids display correctly
- [ ] Desktop (1024px+): sidebar visible, multi-column layouts work
- [ ] Wide (1440px+): max-widths prevent overly wide content

### Functional QA
- [ ] Add transaction (income and expense)
- [ ] Edit transaction
- [ ] Delete transaction with confirmation
- [ ] Filter transactions by type, category, search
- [ ] Upload receipt and extract data via OCR
- [ ] Export data in CSV, JSON, Excel, PDF
- [ ] Import data from JSON and CSV
- [ ] Clear all data with confirmation
- [ ] Theme toggle (light/dark/system)
- [ ] Language toggle (EN/ID) — all visible text switches
- [ ] Month navigation (prev/next in topbar)
- [ ] Sidebar collapse/expand (desktop)
- [ ] Bottom nav (mobile)

### Accessibility
- [ ] Keyboard navigation: Tab through all interactive elements
- [ ] Skip link: visible on focus, jumps to main content
- [ ] Screen reader: page landmarks announced correctly
- [ ] Focus rings: visible on all focusable elements
- [ ] Color contrast: meets WCAG AA for text
- [ ] Motion: animations respect prefers-reduced-motion
- [ ] ARIA: dialogs, radiogroups, navigation landmarks labeled

### Data Safety
- [ ] Database persistence works across requests
- [ ] Import doesn't duplicate existing data
- [ ] Clear data truly removes everything
- [ ] No PII is sent to external services
- [ ] SQLite fallback works when DATABASE_URL is unset

## Post-Launch Monitoring

### What to Watch
- [ ] Vercel deployment status and function logs
- [ ] Database connection pool health (Neon dashboard)
- [ ] Browser console errors (via manual spot-check)
- [ ] OCR accuracy with different receipt formats

### Known Limitations
- OCR is client-side only — quality depends on image clarity
- Large datasets (1000+ transactions) may slow down API responses
- PDF export quality depends on browser PDF rendering

## Architecture Notes

### What is Production-Ready
- Full CRUD for transactions, bills, savings, categories, payment methods
- REST API routes at `/api/*` backed by Neon Postgres (production) or SQLite (dev)
- 4-format export (CSV, JSON, Excel, PDF)
- Import from JSON/CSV
- OCR receipt scanning
- Bilingual UI (EN/ID)
- Dark mode
- Responsive design
- Vercel deployment with Neon Postgres
- 84 Vitest tests covering validation and all services

### What is Placeholder-Only
- Analytics integration — no tracking code installed
- Error reporting — errors log to console only

### What Should Be Connected Next
1. **Authentication** — Add user accounts and data isolation
2. **Error reporting** — Integrate Sentry or similar
3. **Analytics** — Add privacy-respecting usage tracking
4. **Cloud backup** — Multi-device data sync

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
| `NEXT_PUBLIC_BASE_PATH` | No | Base path for GitHub Pages (e.g., `/Financial-Tracker-V.02`) |
| `NEXT_PUBLIC_APP_TITLE` | No | Override app display title |
| `NEXT_PUBLIC_API_URL` | No | Backend API URL (placeholder — currently unused) |

The app is fully client-side. No secrets or server-side env vars are needed.

## Build & Deploy

### Static Export

```bash
npm run build
# Output: out/ directory with static HTML/CSS/JS
```

The app uses `output: 'export'` in `next.config.ts` for fully static deployment.
All pages are pre-rendered at build time. No Node.js server is needed at runtime.

### GitHub Pages Deployment

Automated via `.github/workflows/deploy-pages.yml`:

1. Push to `main` branch triggers deployment
2. CI runs: install -> typecheck -> lint -> build
3. `out/` directory is uploaded as GitHub Pages artifact
4. GitHub Pages serves the static files

### CI Pipeline

`.github/workflows/ci.yml` runs on:
- Every push to `redesign` branch
- Every pull request to `main` or `redesign`

Steps: install -> typecheck -> lint -> format check -> build -> verify static export

### Deploying to Other Platforms

The `out/` directory is a standard static site. Compatible with:
- **Vercel**: Auto-detected (but consider switching to server mode for best experience)
- **Netlify**: Set build command to `npm run build`, publish directory to `out`
- **Cloudflare Pages**: Same as Netlify
- **Any static host**: Just serve the `out/` directory

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
- [ ] localStorage persistence works across page reloads
- [ ] Import doesn't duplicate existing data
- [ ] Clear data truly removes everything
- [ ] No PII is sent to external services

## Post-Launch Monitoring

### What to Watch
- [ ] GitHub Pages deployment status
- [ ] Browser console errors (via manual spot-check)
- [ ] localStorage quota issues on heavy use
- [ ] OCR accuracy with different receipt formats

### Known Limitations
- OCR is client-side only — quality depends on image clarity
- No cloud sync — data lives in browser localStorage only
- Large datasets (1000+ transactions) may slow down the app
- PDF export quality depends on browser PDF rendering

## Architecture Notes

### What is Production-Ready
- Full CRUD for transactions
- 4-format export (CSV, JSON, Excel, PDF)
- Import from JSON/CSV
- OCR receipt scanning
- Bilingual UI (EN/ID)
- Dark mode
- Responsive design
- Static deployment

### What is Placeholder-Only
- `src/lib/services.ts` — API boundary stubs (returns local data, no real HTTP calls)
- `src/lib/env.ts` — NEXT_PUBLIC_API_URL is defined but unused
- Analytics integration — no tracking code installed
- Error reporting — errors log to console only

### What Should Be Connected Next
1. **Backend API** — Replace localStorage with server persistence
2. **Authentication** — Add user accounts and data isolation
3. **Error reporting** — Integrate Sentry or similar
4. **Analytics** — Add privacy-respecting usage tracking
5. **Cloud backup** — Sync data across devices

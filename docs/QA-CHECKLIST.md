# QA Checklist

## Responsive Breakpoint Testing

Test each page at these widths. Verify no horizontal overflow, proper stacking, and readable text.

### Breakpoints

| Width | Device | Key Checks |
|-------|--------|------------|
| 375px | Small mobile (iPhone SE) | Single column, bottom nav, compact cards, FAB visible |
| 414px | Large mobile (iPhone 14) | Same as above, slightly more breathing room |
| 768px | Tablet portrait (iPad) | 2-column grids, bottom nav, cards fill width |
| 1024px | Tablet landscape / laptop | Sidebar appears, bottom nav hides, 2-3 column grids |
| 1280px | Desktop | Full sidebar (260px), comfortable content width |
| 1440px | Wide desktop | Content stays within max-widths, no overly wide layouts |
| 1920px | Full HD | Same as wide desktop, generous whitespace |

### Per-Page Checks

#### Dashboard (`/`)
- [ ] Summary cards: 2-col on mobile, 4-col on xl+
- [ ] Chart section: stacks on mobile, 3-col on lg+
- [ ] Budget/recent: stacks on mobile, 2-col on lg+
- [ ] Bills/savings/payment: 1-col mobile, 2-col sm, 3-col lg
- [ ] Quick actions: stack on mobile, 3-col on sm+
- [ ] Long IDR amounts don't overflow cards
- [ ] Indonesian labels fit without truncation

#### Transactions (`/transactions`)
- [ ] Filter bar wraps gracefully on mobile
- [ ] Transaction list fills available width
- [ ] Sheet slide-over doesn't cause body scroll
- [ ] FAB button visible on mobile, hidden on desktop
- [ ] Delete confirmation dialog centered on all sizes
- [ ] Summary strip readable on mobile

#### Add Transaction (`/transactions/new`)
- [ ] Form centered at max-w-lg
- [ ] All form fields full-width on mobile
- [ ] Back link visible and tappable
- [ ] Bilingual labels fit without overflow

#### Upload (`/upload`)
- [ ] 2-column grid on md+, stacks on mobile
- [ ] Drop zone has adequate touch target (min 44px tap area)
- [ ] Image preview doesn't overflow card
- [ ] OCR result form scrollable if content long

#### Export (`/export`)
- [ ] Format cards: 2-col grid on all sizes
- [ ] Preview table scrolls horizontally if needed
- [ ] Action bar sticky or visible at bottom
- [ ] Bilingual descriptions fit format cards

#### Settings (`/settings`)
- [ ] Theme cards: 3-col grid consistent
- [ ] Language options full-width buttons
- [ ] Import dialog centered, responsive
- [ ] Clear data button visually distinct (destructive)

#### Navigation
- [ ] Sidebar: collapses to 72px icons-only
- [ ] Sidebar: full labels at 260px
- [ ] Bottom nav: 5 tabs equally spaced
- [ ] Topbar: month nav doesn't overlap logo on mobile
- [ ] Skip link: visible on keyboard focus

## Bilingual Text Expansion Testing

Indonesian text is typically 20-40% longer than English. Verify these don't overflow:

- [ ] Sidebar nav labels (collapsed tooltip, expanded text)
- [ ] Bottom nav labels
- [ ] Page headers and descriptions
- [ ] Summary card labels
- [ ] Button labels in forms
- [ ] Toast messages
- [ ] Dialog titles and descriptions
- [ ] Filter labels
- [ ] Empty state messages

## Dark Mode Audit

### Surfaces
- [ ] Page background: slate-900 (`#0f172a`)
- [ ] Card surfaces: slate-800 (`#1e293b`)
- [ ] Popover/dropdown: slate-800
- [ ] Input fields: dark border, readable placeholder

### Text
- [ ] Primary text: high contrast (slate-100)
- [ ] Muted text: readable (slate-400, `#94a3b8`)
- [ ] Link text: blue-400 (`#3b82f6`)
- [ ] Error text: red-400 (`#ef4444`)

### Components
- [ ] Borders: subtle but visible (slate-700, `#334155`)
- [ ] Badges: readable foreground on colored backgrounds
- [ ] Charts: colors visible against dark background
- [ ] Progress bars: visible track and fill
- [ ] Hover states: discernible change
- [ ] Focus rings: visible blue ring
- [ ] Skeleton loading: appropriate shimmer contrast
- [ ] Confidence bar: green/amber/red visible
- [ ] Category chips: colored dots visible

### States
- [ ] Empty state illustrations: visible in dark mode
- [ ] Error states: red tones visible
- [ ] Success states: green tones visible
- [ ] Warning states: amber tones visible
- [ ] Disabled buttons: distinguishable from enabled

## Cross-Browser Testing

### Primary Browsers
- [ ] Chrome (latest) — primary development target
- [ ] Firefox (latest) — verify CSS custom properties, grid layout
- [ ] Safari (latest) — verify backdrop-filter, date inputs, sticky positioning

### Known Sensitive Areas
- [ ] Drag-and-drop upload: test in all browsers
- [ ] Date input styling: may vary across browsers
- [ ] Backdrop-filter (glass effect): Safari sometimes needs `-webkit-` prefix
- [ ] CSS Grid: verify subgrid or complex grid doesn't break
- [ ] Smooth scroll: verify `scroll-behavior` works
- [ ] Framer Motion: verify animations perform well
- [ ] jsPDF: verify PDF generation works
- [ ] Tesseract.js: verify OCR works (uses Web Workers)

### Device Testing
- [ ] iOS Safari (iPhone)
- [ ] Android Chrome
- [ ] iPad Safari

## Static Export Verification

After `npm run build`:
- [ ] `out/` directory exists
- [ ] `out/index.html` exists (dashboard)
- [ ] `out/transactions.html` exists
- [ ] `out/upload.html` exists
- [ ] `out/export.html` exists
- [ ] `out/settings.html` exists
- [ ] `out/404.html` exists
- [ ] No server-side features used (no API routes, no middleware, no server actions)
- [ ] All navigation works with static file serving (no trailing slash issues)
- [ ] Images load correctly with `unoptimized: true`

## Smoke Test Checklist

Quick verification after each deploy:
1. [ ] App loads without console errors
2. [ ] Dashboard renders with data (or empty state)
3. [ ] Can add a transaction
4. [ ] Can toggle dark mode
5. [ ] Can switch language to ID
6. [ ] Can navigate all pages via sidebar/bottom nav
7. [ ] Month navigation works

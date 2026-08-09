# Sprint 3 — Fondasi Desain (E1–E5) — Spec

Sumber: rekomendasi E1–E5 dari deep-research 4-audit 2026-08-08 (artifact
"Rekomendasi Upgrade — Financial Tracker V.02") + inventaris kode 2026-08-09.

## Analisis Playbook Tahap 1 (WAJIB)

- Struktur database: **TIDAK** — murni frontend (CSS token, theming chart, sweep komponen, atribut ARIA).
- Bentuk API: **TIDAK** — nol route tersentuh.
- Cara baca data lama: **TIDAK**.

→ Risiko rendah. Jalur: TDD → preflight → branch + PR + Preview → verifikasi pasca-deploy. Tanpa Neon Branch.

## Cakupan

### E1 — Ekspos palet editorial ke Tailwind (pembuka blokir, prasyarat E2–E4)

1. Tambah ±15 pemetaan `--color-*` editorial ke blok `@theme inline` di `globals.css`
   (`pos/pos-soft/neg/neg-soft/warn/warn-soft/ink/ink-2/ink-3/paper/paper-2/rule/rule-soft/card-2/accent-2`)
   → class `text-pos`, `bg-neg-soft`, `bg-ink`, `text-paper` dst. menjadi nyata.
2. Arahkan token legacy ke palet editorial: `--success`→`var(--pos)`, `--warning`→`var(--warn)`,
   `--success-soft`/`--danger-soft`/`--warning-soft` (+foreground) → tint editorial,
   `--chart-income`→`var(--pos)`, `--chart-expense`→`var(--neg)`, `--chart-primary`→`var(--accent)`,
   `--chart-muted`→`var(--ink-3)`, `--chart-grid`→`var(--rule-soft)`,
   `--chart-color-1..6` → accent/pos/warn/neg/accent-2/ink-3 (juga `--chart-1..5`).
3. Perbarui seksi "Design Direction" CLAUDE.md (masih biru #2563EB + Plus Jakarta Sans) menjadi
   pointer ke `design-system/financial-tracker-v.02/MASTER.md` + ringkasan editorial.
4. Guard test baru: blok `@theme` memetakan token editorial.

**Di luar cakupan (eksplisit):** token sidebar/tile/brand-mint/info-soft/glow; palet file export
(`chart-renderer.ts`, `chart-xml-injector.ts`, `export-utils.ts` — desain export v2 yang sudah shipped);
hex data server-side (`insights.service.ts` COALESCE, `constants.ts` CATEGORY_COLORS/PALETTE_COLORS —
itu data warna kategori, bukan styling).

### E2 — Satu chart theme bersama

Buat `src/lib/chart-theme.ts` (margin, grid, tick 11px, tooltip style, gradient opacity) dan
pakai di 7 chart Recharts: CashFlowChart, TrendChart, ForecastChart, NetWorthTrendChart
(+ perbaiki bug tick tanpa fill = #666 di dark), CategoryComparisonChart (+ tooltip/container
slate → token), CategoryBreakdown, SavingsRingCard (tanpa axes — hanya konsistensi warna).
Menghapus 4 varian `contentStyle` duplikat dan 3 konvensi grid/tick yang berbeda.

### E3 — Sapu dark-mode & off-theme (per tier inventaris)

- Tier 1: gradien biru hardcoded NetWorthDashboardWidget/NetWorthSummaryCard → perlakuan
  editorial `bg-ink text-paper`; DayOfWeekPills rgba amber/biru inline → token.
- Tier 2: TransactionForm (17 kemunculan, toggle income/expense `bg-emerald-500`/`bg-red-500`
  → `bg-pos`/`bg-neg`), RecurringTransactionForm, HealthScoreCard.
- Tier 3–5: sweep mekanis per tabel inventaris (BudgetCell, BudgetOverview, BudgetProgress,
  AnnualSummary, ConfidenceBar, ExportPreview, dst.) → `text-success`/`text-destructive`/
  `text-warning`/`bg-pos`/`bg-neg`/`bg-warn` dsb.
- Fallback warna kategori `'#888'`/`'#6B7280'` di komponen → `var(--ink-3)`/`var(--chart-muted)`;
  pola alpha `${color}15` → `color-mix()` agar kompatibel var().
- Perluasan guard test hex terlarang (+`#1e3a8a`, `#3b82f6` dengan exclude globals.css & lib export).
- File yang SUDAH berpasangan `dark:` = prioritas rendah, TIDAK disapu sprint ini (tercatat).

### E4 — Kontrak empat-state: Skeleton → InlineError(retry) → EmptyState → Konten

1. `Skeletons.tsx`: `role="status"` + `shadow-card` pada skeleton berbentuk kartu; normalisasi
   16 skeleton hand-rolled (tambah shadow + role, bukan tulis-ulang layout); spinner
   settings/categories → `PageSkeleton`.
2. Error state: /insights (ekspos `refetch` + InlineError), /net-worth (pakai `reload` yang
   sudah ada), /reports (ekspos error trends + forecast), riwayat upload (/upload — cabang
   error + loading; InlineError sudah diimpor tapi tak dipakai).
3. Adopsi EmptyState di 26 situs "No data" polos (varian kompak `className="py-6"` untuk widget).
4. HeroHeader ke 9 halaman tersisa (bills, savings, recurring, insights, net-worth, export,
   upload, upload/bulk, settings/categories) + guard test per halaman (pola `page-*-hero.test.ts`).
   /home dan /transactions/new dikecualikan (by design).

### E5 — Aksesibilitas

1. `role="progressbar"` + `aria-valuenow/min/max` (+nama aksesibel) pada 11 indikator progress
   (ProgressRing = perbaikan leverage tertinggi; HealthScoreCard; SavingsRingCard; 8 bar linear)
   + guard test.
2. Target sentuh: Button default/lg/icon/icon-lg & Input → 44px di mobile (`h-11 md:h-8` dst.);
   `xs`/`sm` tetap (pengecualian UI padat terdokumentasi).
3. Lantai tipografi 12px: `.ft-eyebrow` 10px→12px; sweep 54× `text-[10px]` → `text-xs`;
   guard test regex melarang `text-[<12px]`.
4. Motion: `MotionConfig reducedMotion="user"` SUDAH ada (StoreProvider.tsx:45) — temuan audit
   sebagian sudah termitigasi. Sisa: hapus `reduceMotionProps` (dead export, 0 pemakai),
   gate animasi width Sidebar via `useReducedMotion()`, masukkan `ftFlow`/`ftMarq` ke blok
   reduced-motion kedua di globals.css.

## Keputusan desain terkunci

- Kartu net-worth: inversi paper-ink (`bg-ink text-paper`) — bukan gradien token.
- Skala tick chart distandarkan 11px; tooltip standar = varian ber-`boxShadow`.
- Default mobile 44px hanya untuk varian `default`/`lg`/`icon`/`icon-lg`/Input; varian `xs`/`sm`
  adalah opt-in UI padat.
- `text-[10px]` → `text-xs` (12px), bukan 11px (MASTER: never below 12px).
- Nama file modul chart mengikuti konvensi repo kebab-case: `chart-theme.ts`.

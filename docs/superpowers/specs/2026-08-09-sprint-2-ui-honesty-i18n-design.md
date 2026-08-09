# Sprint 2 — Kejujuran UI & Kelengkapan i18n (B1–B6, C1–C3)

- **Tanggal:** 2026-08-09
- **Status:** Disetujui pemilik (lisan: "proceed with Sprint 2"; keputusan produk PeriodTabs=hapus, groupByDate=hapus)
- **Sumber:** Rekomendasi kategori B & C dari deep-research 2026-08-08
- **Analisis Playbook (Tahap 1):** Satu perubahan struktur DB — kolom aditif
  `sort_order` pada `categories` (B6) → jalur Tahap 2 wajib untuk item itu
  (CREATE TABLE + `columnMigrations` + guard test + DEFAULT aman). Semua item
  lain murni frontend/i18n: DB ✗ · API ✗ (kecuali dua penambahan aditif: field
  `sortOrder` pada kategori dan endpoint reorder baru) · Legacy ✗.

## Tujuan

Menghapus semua kontrol UI yang "berbohong" (terlihat berfungsi tapi tidak),
menambah state loading/error yang hilang di jalur mobile, dan menutup ±35
kebocoran string yang melewati kamus i18n — tanpa mengubah perilaku fitur lain.

## Non-tujuan

- Fitur filter periode sungguhan (dirancang terpisah, kandidat bersama D5).
- Pengelompokan export per tanggal (dihapus, bukan diimplementasikan).
- HeroHeader coverage & kontrak state 4-langkah menyeluruh (E4, sprint desain).
- Perombakan navigasi/FAB context-aware penuh (cukup hapus FAB ganda).

---

## B1 — Hapus PeriodTabs (keputusan produk: HAPUS)

Komponen `PeriodTabs` dirender di `src/app/page.tsx` (dashboard mobile) dan
`src/app/transactions/page.tsx` tetapi state-nya tidak dibaca siapa pun.

**Desain:** hapus render + state `period` di kedua halaman. Hapus file
komponen `PeriodTabs` beserta ekspor/impor-nya JIKA tidak ada pemakai lain
(verifikasi grep). Kunci i18n khusus PeriodTabs yang tak terpakai lagi
dibiarkan di kamus (menghapus kunci = perubahan berisiko rendah tapi tidak
perlu; kamus toleran kunci tak terpakai).

## B2 — `/transactions/new` menghormati `?type=`

FAB bottom-nav menautkan `?type=income|expense` tapi halaman tidak membacanya;
form selalu default expense.

**Desain:** halaman membaca `useSearchParams()` (dibungkus `<Suspense>` sesuai
kebutuhan Next), validasi nilai (`income`/`expense`, selain itu fallback
`expense`), teruskan sebagai prop `initialType` ke `TransactionForm`.
`TransactionForm` menerima prop opsional `initialType` (default `'expense'`,
perilaku lama tak berubah untuk pemanggil lain).

## B3 — Toggle bahasa sidebar/drawer harus persist

`Sidebar.tsx` dan `MobileNav.tsx` memanggil `useStore.setLocale` langsung —
tidak pernah PATCH ke `/api/settings`, sehingga pilihan bahasa kembali sendiri.

**Desain:** kedua komponen memakai `useSettings().updateLocale` (jalur yang
sama dengan halaman /settings). Tidak ada perubahan API.

## B4 — /recurring: error state jujur + aksi tersentuh + label dialog

1. Kegagalan fetch kini menampilkan `InlineError` + tombol coba-lagi, BUKAN
   empty state ("Anda tidak punya transaksi berulang" — bohong).
2. Tombol aksi baris (edit/pause/hapus) memakai guard `pointer-fine:` seperti
   pola di /bills — selalu terlihat di layar sentuh.
3. `ConfirmDialog` hapus diberi `confirmLabel`/`cancelLabel` dari `t()` —
   sekaligus perbaiki DEFAULT `ConfirmDialog` (lihat C1) agar kelas bug ini
   mati permanen.

## B5 — Dashboard mobile: loading/error state + banner recurring

1. Cabang mobile `src/app/page.tsx` memeriksa `isLoading` (render skeleton
   ringkas: hero + tile placeholder) dan `isError` (InlineError + retry) dari
   `useDashboardData` — tidak lagi menampilkan `Rp 0` palsu.
2. `RecurringDueBanner` dirender juga di cabang mobile (di atas hero),
   sehingga pengguna mobile tahu ada transaksi berulang jatuh tempo.

## B6 — Paket bug kecil

1. **Jam palsu:** `TransactionRowMobile` berhenti merender jam dari string
   tanggal-saja; format menjadi tanggal lokal singkat (mis. `9 Agu`) sesuai
   locale — tanpa komponen jam.
2. **Persist urutan kategori:** kolom baru `categories.sort_order INTEGER
   DEFAULT 0` (aditif; CREATE TABLE + `columnMigrations` + perluasan guard
   test migrasi). `GET /api/categories` mengurutkan `ORDER BY sort_order,
   name`. Endpoint aditif `PATCH /api/categories/reorder` menerima
   `{ ids: string[] }` (urutan baru, per user, tipe kategori tertentu) dan
   menulis `sort_order` = indeks. Halaman settings memanggilnya saat drag
   selesai (`onReorder` akhir, bukan per gerakan), dengan toast bila gagal.
3. **Debounce budget inline:** input budget di settings/categories memakai
   debounce 500 ms + toast error bila PATCH gagal (tidak lagi senyap).
4. **Hapus opsi `groupByDate`** (keputusan produk: HAPUS): buang dari
   `ExportOptions` UI, state `useExport`, dan tipe terkait. Kunci i18n-nya
   boleh tetap di kamus.
5. **FAB ganda:** hapus FAB per-halaman di /transactions, /bills, /savings
   (FAB tengah bottom-nav adalah satu-satunya FAB mobile). Tidak menyentuh
   halaman tanpa bottom-nav.

## C1 — Sapu string yang melewati kamus (±35 string)

**Prinsip:** semua string pengguna lewat `t(locale, key)`; setiap kunci baru
ditambahkan di KEDUA kamus (EN & ID); pola penamaan mengikuti kunci sejenis
yang sudah ada. Cakupan (dari audit, verifikasi ulang saat implementasi):

| Area | Perkiraan | Catatan |
|---|---|---|
| `register/page.tsx` | 12 ternary | Tiru pola /login yang sudah benar |
| `src/features/net-worth/*` (5 file) | ±10 | AssetsList, LiabilityDialog, MonthOverMonthCard, NetWorthTrendChart, SnapshotButton |
| `forgot-password` + `reset-password` | 5 | |
| `export/page.tsx` | Deskripsi format (EN murni) + empty state | |
| `bills/page.tsx` | Toast generate + placeholder | |
| `savings/page.tsx` | "goals/target" + placeholder | |
| `DashboardContent.tsx` | Subtitle, empty state, deskripsi quick action | |
| `TransactionForm/Table`, `AllTransactionsView`, `OcrPreview`, `BalanceGrid` | ±6 | |
| `not-found.tsx` | Hardcoded EN; kunci `pageNotFound`/`backToDashboard` SUDAH ada — jadikan client component kecil (`'use client'` + `useLocale()`), konsisten dengan halaman lain |
| `error.tsx` | 1 ternary | |
| **Default komponen shared** | `ConfirmDialog` ('Delete'/'Cancel'), `EmptyState` ('No results found'/'Clear filters'/'Try again') | Ubah agar menerima label WAJIB dari pemanggil ATAU default ter-i18n via hook locale |

## C2 — Nama bulan & singkatan mata uang sesuai locale

1. `MONTH_NAMES` (EN) yang dipakai tanpa syarat di `DashboardContent.tsx`,
   `export/page.tsx`, `transactions/page.tsx` diganti pemilihan berbasis
   locale (`MONTH_NAMES_ID` untuk `id`) — helper kecil `getMonthNames(locale)`
   di `constants`/`formatters` agar tidak ada ternary tersebar.
2. `formatCurrencyShort(amount, locale)`:
   - menerima parameter locale (default `'en'` agar pemanggil lama tetap sah),
   - ID: `rb` (ribu), `jt` (juta), `M` (miliar); EN tetap `K`/`M`/`B`,
   - angka NEGATIF diringkas benar (operasikan `Math.abs`, pasang tanda di
     hasil akhir).
   Semua call site diperbarui untuk meneruskan locale.

## C3 — `<html lang>` reaktif + skip-link ter-i18n

`lang` mengikuti locale aktif (sinkron dari store di komponen client kecil
via `useEffect` `document.documentElement.lang = locale` — tanpa mengubah SSR
layout), dan teks "Skip to main content" memakai `t()` (kunci baru).

---

## Pengujian

- TDD untuk logika murni: `formatCurrencyShort` (kasus EN/ID/negatif/ambang),
  helper `getMonthNames`, service/repo `reorderCategories` + urutan
  `listCategories`, validasi `?type=` di halaman transaksi baru.
- Guard test migrasi diperluas: `categories.sort_order` punya baris
  `ALTER TABLE ... ADD COLUMN IF NOT EXISTS sort_order ... DEFAULT 0`.
- Guard i18n baru (tekstual): file yang disapu C1 tidak lagi memuat pola
  `locale === 'id' ?` / `locale === 'en' ?` (whitelist file yang sah:
  formatters/validation/DayOfWeekPills/i18n itu sendiri).
- Tes UI logika berat (debounce, reorder handler) diuji pada level util/hook.
- Seluruh suite + `npm run preflight` hijau; uji Preview manual: ganti bahasa
  dari sidebar lalu refresh (harus bertahan), buka /recurring dengan network
  gagal (DevTools offline) → InlineError, FAB tunggal di mobile, form
  ?type=income terbuka sebagai pemasukan.

## Kriteria sukses

- Tidak ada kontrol UI yang tidak berefek (PeriodTabs & groupByDate hilang;
  FAB tunggal).
- Ganti bahasa dari sidebar bertahan setelah refresh & lintas perangkat.
- Grep `locale === 'id' ?`/`locale === 'en' ?` di luar whitelist = 0.
- Pengguna locale ID melihat "Maret 2026", "Rp 12,5jt", dialog "Hapus/Batal".
- Urutan kategori bertahan setelah reload (kolom sort_order).
- Suite penuh + preflight hijau; playbook Tahap 2 dipenuhi untuk sort_order.

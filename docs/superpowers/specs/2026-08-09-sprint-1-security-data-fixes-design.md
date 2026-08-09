# Sprint 1 — Perbaikan Kritis Keamanan & Integritas Data (A1–A7)

- **Tanggal:** 2026-08-09
- **Status:** Menunggu persetujuan
- **Sumber:** Deep research 4-audit paralel (2026-08-08) → rekomendasi kategori A (Kritis)
- **Analisis Playbook (Tahap 1, keseluruhan sprint):** Tidak ada perubahan struktur
  database. Tidak ada perubahan API yang memutus kompatibilitas — satu-satunya
  perubahan bentuk adalah PENAMBAHAN field respons aditif pada endpoint cron (A4).
  Satu item (A3) mengubah cara data lama dibaca oleh migrasi backfill — dibahas
  khusus di bagian A3. Kesimpulan: **risiko rendah, tanpa Neon Branch**, cukup
  jalur preflight + PR + Preview standar.

## Tujuan

Menutup tujuh masalah keamanan/integritas data yang aktif di produksi sekarang,
tanpa menyentuh skema DB dan tanpa memutus sesi login yang sedang berjalan.

## Non-tujuan (dikerjakan di sprint lain)

- Endpoint ekspor akun penuh `GET /api/data` (rekomendasi D7).
- Ledger migrasi, wrapper route, revokasi JWT (F1).
- CI dialek Postgres penuh (F2) — di sprint ini hanya guard test tekstual.
- Batching N+1 pada generator recurring (F2).

---

## A1 — Scoping `/api/reports/trends` per pengguna

**Masalah.** `src/app/api/reports/trends/route.ts` menjalankan agregat
`SUM(income)/SUM(expense)` atas SELURUH tabel `transactions` tanpa
`requireUserId()` dan tanpa `WHERE user_id` — setiap pengguna melihat agregat
keuangan semua akun.

**Desain.**
1. Panggil `requireUserId(request)` (pola yang sama dengan route lain); balas
   401 bila tidak ada user (bungkus try/catch lokal — wrapper global menyusul di F1).
2. Tambahkan `WHERE user_id = ?` pada query.
3. **Guard test baru** `src/__tests__/api-route-user-scoping.test.ts`:
   membaca semua file `src/app/api/**/route.ts`, kecuali daftar putih
   (`auth/*`, `health`, `cron/*`), dan menegaskan setiap file memuat
   `requireUserId(`. Pola meniru `db-user-id-migrations.test.ts` (guard tekstual).
4. **Tes isolasi** (pola `user-provisioning.test.ts`): user A punya transaksi,
   user B memanggil service trends → hasil B tidak memuat angka A.

**Bentuk respons tidak berubah** (field `months[]` tetap) — hanya cakupan
datanya yang menjadi benar. Playbook Tahap 1: DB ✗ · API ✗ · Legacy ✗.

## A2 — `strftime` (khusus SQLite) membuat `/api/insights/spending` gagal di Neon

**Masalah.** `insights.service.ts` `computeDayOfWeekPattern()` memakai
`strftime('%w', date)` — tidak ada di Postgres → 500 di produksi; CI (SQLite)
tidak bisa melihatnya.

**Desain.**
1. Ganti query menjadi pengambilan baris polos
   (`SELECT date, amount FROM transactions WHERE user_id = ? AND type='expense' AND date LIKE ? || '%'`)
   lalu hitung indeks hari di JavaScript (`new Date(date + 'T00:00:00Z').getUTCDay()`),
   agregasi per hari di JS. Volume data satu bulan per user kecil — aman.
2. **Guard test dialek** `src/__tests__/no-sqlite-only-sql.test.ts`: scan
   `src/server/**` dan tegaskan tidak ada `strftime(` (fungsi SQLite-only yang
   sudah terbukti meledak di produksi). Cakupan dialek lebih luas menyusul di F2.
3. Tes unit `computeDayOfWeekPattern` dengan tanggal-tanggal yang diketahui
   jatuh di hari tertentu.

Playbook Tahap 1: DB ✗ · API ✗ · Legacy ✗.

## A3 — Menjinakkan migrasi destruktif di jalur cold-start

**Masalah.** Dua fungsi di `src/server/db/seed.ts`:
- `cleanup2025Data()` (baris 166–178): `DELETE FROM transactions WHERE date LIKE
  '2025-%'` untuk SEMUA user, dijaga sentinel `settings.key='migration_cleanup_2025'`
  yang tidak ber-`user_id`, bisa ikut terhapus oleh fitur Clear Data, dan bisa
  ditulis user karena skema settings terbuka. Tugas one-shot-nya sudah lama selesai.
- `migrateCategoryIds()` (baris 180–197): backfill `category_id` mencocokkan
  nama kategori TANPA korelasi `user_id` → transaksi bisa menunjuk kategori user lain.

**Desain.**
1. **Hapus** `cleanup2025Data` beserta pemanggilnya. Baris sentinel yang sudah
   ada di DB produksi dibiarkan (harmless orphan row; tidak perlu migrasi hapus).
2. **Perbaiki** `migrateCategoryIds`: tambahkan `AND categories.user_id =
   transactions.user_id` pada subquery dan klausa `EXISTS`.
3. **Guard test** `src/__tests__/seed-safety.test.ts`:
   a. Sumber `seed.ts` tidak memuat `cleanup2025`.
   b. SQL `migrateCategoryIds` memuat korelasi `user_id`.
   c. Tes perilaku: transaksi user A ber-`category_id` kosong TIDAK di-backfill
      ke id kategori milik user B yang namanya sama.

**Analisis playbook khusus:** ini mengubah cara data lama dibaca (backfill).
Perubahan bersifat MEMPERSEMPIT efek migrasi (dari lintas-user menjadi
per-user) — arah yang aman. Baris yang telanjur salah tunjuk dari masa lalu
tidak diperbaiki otomatis di sprint ini (butuh audit data terpisah; dicatat
sebagai tindak lanjut).

## A4 — Otentikasi endpoint cron yang bisa dipalsukan

**Masalah.** `cron/generate-recurring/route.ts` menerima request bila header
`x-vercel-cron-signature` sekadar ADA — header itu bisa diset siapa pun.

**Desain.**
1. Hapus jalur `isVercelCron`; satu-satunya jalur sah:
   `authorization === 'Bearer ' + process.env.CRON_SECRET` (fail-closed bila
   env tidak diset). Vercel Cron otomatis mengirim header ini bila env
   `CRON_SECRET` terpasang di project — perilaku bawaan platform.
2. Loop per-user: kegagalan satu user tidak menghentikan user lain
   (kumpulkan error, teruskan; laporkan ringkasan `{generated, skipped, failed}` —
   field `failed` adalah TAMBAHAN field respons, aditif).
3. Tes route: tanpa header → 401; header vercel palsu → 401; bearer benar → 200.

**Prasyarat deploy (WAJIB):** pastikan `CRON_SECRET` terpasang di Vercel env
production SEBELUM merge — jika tidak, cron resmi ikut tertolak (fail-closed
memang disengaja, tapi harus diverifikasi agar fitur tidak mati).

Playbook Tahap 1: DB ✗ · API: field respons bertambah (aditif) · Legacy ✗.

## A5 — Ekspor "Semua Data" terpotong 25 transaksi

**Masalah.** `useExport.ts:57` memanggil `api.transactions.list()` tanpa
parameter → default server `pageSize: 25`. Scope "All Data" mengekspor maksimal
25 baris tanpa peringatan. Catatan: `pageSize` maksimum yang diizinkan validasi
adalah 100 — mengirim angka raksasa akan ditolak.

**Desain.**
1. Ganti fetch tunggal dengan **loop paginasi** di `useExport`: ambil halaman
   `pageSize: 100` berturut-turut sampai server menyatakan habis, gabungkan.
   Batas pengaman 200 halaman (20.000 transaksi). Tidak ada perubahan API.
2. Bila salah satu halaman gagal → state error (jangan diam-diam mengekspor
   sebagian); tampilkan lewat `exportError` yang sudah ada.
3. Tes hook/util: dataset 250 transaksi → hasil gabungan 250; kegagalan halaman
   ke-2 → error, bukan ekspor parsial.

Playbook Tahap 1: DB ✗ · API ✗ · Legacy ✗. (Ekspor akun penuh via
`GET /api/data` tetap menjadi rekomendasi D7.)

## A6 — Dependensi rawan + kebersihan repo

**Masalah.** `npm audit`: 14 kerentanan; `xlsx@0.18.5` (HIGH, tanpa fix,
mem-parsing file upload pengguna), `next@16.1.6` (advisory middleware bypass —
middleware adalah satu-satunya gerbang otorisasi), `nanoid`, `vitest`/`vite`
(dev). Tiga file kredensial tercecer di root repo dan tidak di-gitignore.

**Desain.**
1. **Migrasi `xlsx` → `exceljs`** (exceljs sudah dependensi):
   - `src/lib/excel-import.ts` (parser upload user — prioritas keamanan),
   - `src/lib/excel-template.ts`,
   - sesuaikan `src/__tests__/bulk-import.test.ts` bila perlu (perilaku publik
     modul dipertahankan: signature fungsi & bentuk hasil parse tidak berubah).
   - Hapus `xlsx` dari `package.json`.
2. **Bump keamanan:** `next` ke patch 16.1.x terbaru, `nanoid`, `npm audit fix`
   untuk vitest/vite. Satu commit terpisah agar mudah di-rollback; preflight
   penuh setelahnya.
3. **.gitignore:** tambah pola `*client_secret*`, `*recovery-codes*`,
   `*Backup codes*` (plus nama file persisnya). Pemindahan file kredensial
   keluar repo dilakukan MANUAL oleh pemilik repo (bukan oleh tooling) —
   dicatat sebagai instruksi, bukan aksi otomatis.

Playbook Tahap 1: DB ✗ · API ✗ · Legacy: format file import Excel harus tetap
diterima → tes bulk-import adalah jaring pengamannya.

## A7 — Masa berlaku token = masa berlaku cookie ("keep me signed in")

**Masalah.** Cookie login bisa 30 hari (`login/route.ts:38`) tapi JWT selalu
`7d` (`auth.service.ts:7`) → pengguna "keep me signed in" tetap ditendang di
hari ke-8. Callback Google juga memasang cookie 30 hari di atas token 7 hari.

**Desain.**
1. `createToken(user, expiry)` menerima parameter masa berlaku;
   `loginUser(email, password, keepSignedIn)` meneruskan `'30d'`/`'7d'`.
   `issueSessionForUser(userId)` → `'30d'` (mengikuti durasi cookie 30 hari
   yang SUDAH dipasang callback Google — kebijakan durasi tidak berubah,
   hanya disinkronkan).
2. Route login meneruskan `keepSignedIn` ke service; `maxAge` cookie tidak berubah.
3. Perluas `auth-keep-signed-in.test.ts`: decode JWT dan tegaskan
   `exp - iat` ≈ 30 hari saat `keepSignedIn: true`, ≈ 7 hari saat false;
   tegaskan pula kesamaan dengan `Max-Age` cookie.

Token lama yang masih hidup tetap valid (tidak ada perubahan verifikasi,
`JWT_SECRET` tidak disentuh — aturan playbook Tahap 6 dipatuhi).

---

## Urutan pengerjaan & pengujian

1. Branch: `feat/sprint1-security-fixes` dari `main`.
2. TDD per item, urutan: A1 → A2 → A3 → A4 → A7 → A5 → A6
   (dari dampak-keamanan tertinggi; A6 terakhir karena menyentuh dependensi).
3. Setiap item = commit terpisah dengan pesan `fix(scope): ...`.
4. `npm run preflight` setelah tiap item; suite penuh (874+ tes) wajib hijau.
5. PR → CI + Vercel Preview → uji manual: login, /reports, /insights, /export
   "All Data", login dengan keep-signed-in.
6. Sebelum merge: verifikasi `CRON_SECRET` terpasang di Vercel env (A4).
7. Pasca-deploy (Tahap 7): `/api/health`, `vercel logs`, klik manual 5 menit.

## Kriteria sukses

- User B tidak dapat melihat agregat user A di /reports (tes isolasi hijau).
- /insights berfungsi di Postgres (tidak ada `strftime` di src/server).
- `seed.ts` bebas kode destruktif; backfill kategori terkorelasi user.
- Cron menolak request tanpa `CRON_SECRET` yang benar.
- Ekspor "All Data" memuat seluruh transaksi.
- `npm audit` bersih dari HIGH/CRITICAL pada dependensi produksi.
- Login "keep me signed in" bertahan 30 hari penuh.

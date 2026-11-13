# Plan Baseline dan Aturan Kerja — Financial Tracker V.02

## Tujuan

Financial Tracker V.02 adalah aplikasi web pencatat keuangan pribadi dalam Rupiah: dasbor *bento grid*, dua bahasa (EN/ID), Next.js di Vercel, dengan Neon Postgres di produksi dan SQLite untuk dev/tes. Pemiliknya Dzaki. Aplikasi ini **sudah hidup dan dipakai beberapa akun pengguna sungguhan** (`CLAUDE.md:15`).

Plan ini adalah **baseline**. Isinya: potret keadaan per 13/11/2026, celah, keputusan yang sudah tercatat, dan kriteria penerimaan (AC) bernomor untuk keadaan "proyek sehat" serta pekerjaan berikutnya yang sudah diketahui:
- Sprint 3 *design foundation*, termasuk perubahan *chart-theme* yang belum di-commit;
- PR #16 *Transaction Split*.

Plan ini **tidak** mengeksekusi apa pun.

## Kondisi sekarang (bukti, diverifikasi 2026-11-13)

**Repo dan cabang**
- Repo git dengan remote `origin` = `DMY-cmyk/Financial-Tracker-V.02`. Cabang produksi `main` (`README.md:431`: "Production (deployed to Vercel)"). `origin/main` = `58900bd` (09/08/2026, gabungan PR #19 Sprint 2).
- Cabang aktif `feat/sprint3-design-foundation` di `963ff8e` ("feat(design): … (E1)"). Posisinya 2 commit di depan `origin/main` dan sama persis dengan `origin/feat/sprint3-design-foundation` (selisih 0/0).

**Perubahan lama yang belum di-commit** (dibiarkan apa adanya; potret awal `scratchpad\baseline\10.txt`, 11 baris)
- 6 berkas chart diubah (`M`):
  - `src/features/dashboard/CashFlowChart.tsx`
  - `src/features/dashboard/CategoryBreakdown.tsx`
  - `src/features/insights/CategoryComparisonChart.tsx`
  - `src/features/net-worth/NetWorthTrendChart.tsx`
  - `src/features/reports/ForecastChart.tsx`
  - `src/features/reports/TrendChart.tsx`
- 2 berkas baru (`??`): `src/lib/chart-theme.ts` dan `src/__tests__/chart-theme.test.ts`.
- Lainnya: `.claude/settings.local.json` (`M`), `.claude/worktrees/agent-a97a87ee` (`D`), `.claude/skills/` (`??`).
- Pola ini cocok dengan **Task 2 (E2)** plan Sprint 3: `chart-theme.ts` bersama dan adopsi chart (`docs/superpowers/plans/2026-08-09-sprint-3-design-foundation.md:160`). Plan itu punya 0 kotak `[x]` dan 65 kotak `[ ]`, jadi status per tugas tidak dicentang.

**Pekerjaan terbuka di GitHub**
- PR terbuka hanya **#16** "feat: Transaction Split — allocate one transaction across multiple categories", `feature/transaction-split` → `main`. Dibuat 20/04/2026, terakhir diperbarui 20/04/2026, status **`CONFLICTING`** (`gh pr view 16`).

**Aturan proyek yang sudah ada**
- Wajib analisis *Deployment Playbook* sebelum setiap perubahan (`CLAUDE.md:3`, `:8`). Playbook: `docs/DEPLOYMENT-PLAYBOOK.md`, dengan Tahap 1 analisis dampak di `:29`.
- Pemadaman produksi 08/08/2026 akibat beda skema SQLite/Postgres (`CLAUDE.md:17`).
- Sumber kebenaran desain: `design-system/financial-tracker-v.02/MASTER.md` (`CLAUDE.md:44`).
- Basis data: Neon Postgres di produksi, better-sqlite3 di dev/tes (`README.md:295`).

**Tes dan CI**
- Skrip (`package.json`):
  - `typecheck` (`:13`)
  - `test` = `vitest run` (`:14`)
  - `validate` (`:16`)
  - `preflight` (`:17`)
- README mencatat 989 tes (`README.md:299`, `:336`).
- CI `.github/workflows/ci.yml` (`README.md:421`). Deploy otomatis Vercel saat push ke `main` (`README.md:425`).
- **Tes belum dijalankan pada 13/11/2026.** Alasannya: `node_modules/` tidak ada, sedangkan `npm ci` butuh jaringan dan menulis folder baru. Node lokal v26.12.1. Jumlah tes 989 tetap angka README, belum diukur ulang.

## Celah

1. **Task 2 (E2) setengah jadi dan belum di-commit.** Pekerjaan di pohon kerja bisa hilang, dan belum ada bukti tesnya hijau.
2. **PR #16 terbengkalai hampir 7 bulan dan berkonflik.** Fitur ini menyentuh struktur transaksi, jadi wajib lewat analisis dampak skema (playbook Tahap 1). Keputusan lanjut atau tutup belum ada.
3. **Sisa Sprint 3** (Task 3–13, E3–E5) belum dimulai menurut riwayat commit. Task 13 meminta preflight, PR, CI, dan uji Preview sebelum merge (`…sprint-3-design-foundation.md:685`).
4. **Isi `.claude/`** (`settings.local.json`, worktree yang terhapus, `skills/`) tercampur di status git. Perlu diputuskan apakah di-ignore, bukan ikut ter-commit.
5. **Dokumen usang.**
   - Memori proyek `MEMORY.md` masih menyebut SQLite sebagai basis data utama, padahal produksi memakai Neon Postgres (`README.md:295`).
   - `CLAUDE.md:152` masih menulis "84 tests", sedangkan README menulis 989.
   - `CLAUDE.md:156` menulis CI berjalan pada cabang `redesign`, sedangkan README menulis `main` (`README.md:421`).

## Keputusan

Keputusan berikut sudah tercatat:
- **Playbook wajib** (`CLAUDE.md:3–17`). Migrasi hanya boleh aditif: setiap kolom baru harus ada di `CREATE TABLE` **dan** `ALTER TABLE` (`CLAUDE.md:11–13`). Ditolak: mengandalkan SQLite dev yang "selalu segar", yang menjadi penyebab pemadaman 08/08/2026.
- **UI tidak boleh terlihat seperti spreadsheet** (bagian *UX Constraints* di `CLAUDE.md`). Ditolak: penyuntingan sel/grid.
- **Warna lewat token**, tidak boleh hex mentah. Sumber kebenarannya `design-system/financial-tracker-v.02/MASTER.md` (`CLAUDE.md:44`).
- **Sprint 3 dikerjakan di cabang `feat/sprint3-design-foundation`**, lalu satu PR ke `main` sesudah preflight hijau (`…sprint-3-design-foundation.md:24`, `:685`).
- **Keputusan plan ini:** perubahan lama di pohon kerja **tidak** disentuh oleh baseline. Nasibnya diputuskan Dzaki di langkah kerja 1. Ditolak: di-commit atau dibuang oleh agen tanpa izin.

## Kriteria penerimaan

- **AC1 — Lingkungan tes siap.** `npm ci` berhasil dengan Node versi yang didukung proyek, dan `node_modules/` tetap di-ignore (`.gitignore:12`).
- **AC2 — Tes hijau.** `npm run test` → 0 gagal, termasuk `src/__tests__/chart-theme.test.ts`. Jumlah tes dicatat dan tidak turun dari 989 kecuali ada alasan tertulis.
- **AC3 — Preflight hijau.** `npm run preflight` → format, typecheck, lint, dan build lulus.
- **AC4 — Task 2 (E2) selesai sesuai plan Sprint 3.** Keenam chart memakai `chart-theme.ts`, tidak ada hex mentah di berkas chart, lalu di-commit di `feat/sprint3-design-foundation`.
- **AC5 — Pohon kerja bersih dari sisa alat.** `git status --porcelain` tidak lagi menampilkan `.claude/settings.local.json`, `.claude/worktrees/…`, atau `.claude/skills/`, karena sudah di-ignore atau dipulihkan sesuai keputusan Dzaki.
- **AC6 — PR #16 punya keputusan tertulis.** Pilihannya: (a) ditutup dengan alasan, atau (b) dilanjutkan dengan plan sendiri yang memuat analisis dampak playbook Tahap 1 (perubahan skema? bentuk API? baca data lama?), lalu konflik diselesaikan dan tes guard migrasi ditambah.
- **AC7 — Rilis aman.** Setiap merge ke `main` didahului CI hijau dan uji Vercel Preview, lalu diikuti cek pasca-deploy `/api/health` (`CLAUDE.md:13–14`). Push dan merge hanya dengan izin Dzaki.

## Rencana cek/tes per AC

| AC | Cek / tes bernama |
|---|---|
| AC1 | `node -v` sesuai `engines`/`.nvmrc` (bila ada); `npm ci` → exit 0; `git status --porcelain` tidak memuat `node_modules` |
| AC2 | `npm run test` → ringkasan Vitest "0 failed"; jumlah tes dicatat di log |
| AC3 | `npm run preflight` → exit 0 |
| AC4 | `npm run test -- chart-theme`; `grep -nE '#[0-9a-fA-F]{6}' src/features/**/*Chart*.tsx` → 0 baris; `git log -1 --stat` memuat 6 chart + `src/lib/chart-theme.ts` |
| AC5 | `git status --porcelain --untracked-files=all \| grep '^.. \.claude/'` → kosong |
| AC6 | `gh pr view 16 --json state,closed` menunjukkan ditutup, **atau** ada `docs/superpowers/plans/*transaction-split*.md` dengan bagian analisis dampak |
| AC7 | `gh pr checks <PR>` hijau; uji Preview dicatat; `curl -s <url-produksi>/api/health` → status sehat; `vercel logs` tanpa galat baru |

## Langkah kerja berikutnya

1. Dzaki memutuskan nasib 11 perubahan lama: lanjutkan Task 2, atau simpan ke `git stash` (AC5 untuk isi `.claude/`).
2. Siapkan lingkungan (AC1), lalu jalankan tes (AC2).
3. Selesaikan Task 2 (E2) dengan TDD (AC4), lalu Task 3–12, lalu Task 13 preflight dan PR (AC3, AC7).
4. Putuskan PR #16 (AC6). Kalau dilanjutkan, buat plan sendiri dengan analisis dampak playbook.
5. Perbarui memori proyek dan `CLAUDE.md:152`/`:156` (Celah 5) dengan angka yang diukur pada AC2. Ini perubahan sepele dan disebutkan saat dikerjakan.

## Berkas yang akan disentuh

**Ditambah:**
- `docs/plan/2026-11-13-baseline-dan-aturan-kerja.md` (berkas ini).

**Diubah oleh pekerjaan berikutnya, bukan oleh plan ini:**
- `src/lib/chart-theme.ts`
- `src/__tests__/chart-theme.test.ts`
- keenam berkas chart di atas
- `.gitignore` (AC5)
- berkas-berkas Task 3–12 sesuai plan Sprint 3

## Risiko & cara mundur

- **Pemadaman produksi akibat beda skema.** Ini pernah terjadi pada 08/08/2026. Mitigasinya playbook Tahap 1 dan migrasi aditif. Cara mundur: *instant rollback* Vercel ke deployment sebelumnya, karena migrasi aditif tidak perlu dibalik.
- **Perubahan chart hilang.** Mitigasinya langkah kerja 1: commit atau stash, bukan `checkout`.
- **Konflik PR #16 membesar seiring Sprint 3.** Mitigasinya keputusan AC6 sebelum Task 3–4, yang menyentuh form transaksi.
- **Akun pengguna sungguhan.** Tidak ada uji dengan data produksi, dan basis data produksi tidak dibuka.

## Bukan-tujuan

- Tidak menyentuh kode, konfigurasi, atau 11 perubahan lama dalam tugas baseline ini.
- Tidak menjalankan `npm ci`, push, merge, atau deploy.
- Tidak membuka `.env*`, `data/*.db`, atau basis data produksi.
- Tidak memutuskan nasib PR #16. Itu keputusan Dzaki (AC6).

## Log pelaksanaan

- 2026-11-13 baseline ditulis; belum ada yang dieksekusi.
- 2026-11-13 tes tidak dijalankan (tidak ada `node_modules/`; `npm ci` butuh jaringan dan menulis ke repo). Status: belum terbukti.

## Aturan kerja

Ringkasan `C:\Users\HP\.claude\CLAUDE.md` §2, berlaku bersama `CLAUDE.md` proyek (playbook wajib):

1. **Plan dulu, tertulis sebagai berkas** di repo ini, sebelum mengubah kode atau dokumen yang berarti. Untuk perubahan aplikasi, plan memuat hasil analisis dampak playbook Tahap 1.
2. **Persetujuan Dzaki sebelum eksekusi.** Plan ditulis, ditunjukkan, lalu berhenti. Pengecualian hanya untuk perubahan sepele, dan itu disebutkan.
3. **Eksekusi wajib memenuhi AC plan.** Kalau arah berubah, ubah plan dulu. AC yang gagal berarti belum selesai, dan AC tidak dilonggarkan diam-diam.
4. **Tes dulu (TDD).** Tes ditulis dan terlihat gagal sebelum kodenya dibuat.
5. **Bukti per AC sebelum klaim selesai.** Bentuknya tabel AC → bukti → hasil, dengan "belum terbukti" bila memang belum, dan dicatat di log pelaksanaan.
6. **Push, merge ke `main` (= deploy produksi), dan pesan ke pihak lain** hanya dengan izin Dzaki di chat.
7. **Jujur apa adanya.** Penyimpangan dicatat terang-terangan.

# DEPLOYMENT PLAYBOOK — Panduan Wajib Setiap Update

> **STATUS: PANDUAN UTAMA YANG BERSIFAT WAJIB (STRICT).**
> Setiap update / upgrade / perbaikan / polish — sekecil apa pun — HARUS dianalisis
> terhadap playbook ini SEBELUM perencanaan dan eksekusi dimulai.
> Aturan ini berlaku untuk manusia maupun AI assistant yang mengerjakan repo ini.

Terakhir diperbarui: 2026-08-08 — lahir dari dua bug production nyata di hari yang sama
(`users.password_hash NOT NULL` mematahkan signup Google; tabel `settings` terlewat dari
migrasi `user_id` dan membuat semua endpoint data 500), yang keduanya lolos dari 845 test
karena skema SQLite dev ≠ skema Neon production.

---

## Prinsip Emas

**Versi baru harus selalu kompatibel ke belakang (backward compatible)** terhadap tiga
hal yang TIDAK ikut ter-reset saat deploy:

1. **Data pengguna di Neon Postgres** — kode baru harus bisa membaca data yang ditulis kode lama.
2. **Skema database production** — dibuat oleh versi-versi terdahulu; `CREATE TABLE IF NOT EXISTS`
   TIDAK memperbaiki tabel yang sudah ada. SQLite lokal selalu segar; Neon tidak pernah.
3. **Sesi login aktif** — cookie JWT berumur 7–30 hari; token lama akan menyentuh kode baru.

---

## Urutan Wajib Setiap Update

### Tahap 1 — Analisis dampak (SEBELUM menulis kode)

Jawab tiga pertanyaan:

- [ ] Apakah perubahan menyentuh **struktur database**? (tabel/kolom/tipe/constraint)
- [ ] Apakah perubahan mengubah **bentuk API**? (hapus/ubah field respons atau parameter)
- [ ] Apakah perubahan mengubah **cara data lama dibaca**?

Jika ketiganya "tidak" (mis. polish UI murni) → risiko rendah, lanjut ke Tahap 3.
Jika ada satu saja "ya" → Tahap 2 WAJIB.

### Tahap 2 — Aturan database: "Tambah, Jangan Ubah"

Semua migrasi hidup di `src/server/db/client.ts` (`columnMigrations`).

1. **Aditif saja.** Kolom baru = `ADD COLUMN IF NOT EXISTS ... DEFAULT <nilai aman>`.
   DEFAULT wajib agar baris lama langsung valid.
2. **Setiap kolom baru butuh DUA tempat**: definisi di `CREATE TABLE` (database baru)
   DAN baris `ALTER TABLE` di `columnMigrations` (database production lama).
   Melupakan yang kedua = bug `settings.user_id` terulang.
3. **Idempoten.** Migrasi berjalan di setiap cold start — harus aman diulang
   (`IF NOT EXISTS` + filter expected-error yang sudah ada).
4. **Penghapusan/penggantian = pola dua rilis (expand–contract):**
   - Rilis 1: tambah struktur baru, dukung dua-duanya.
   - Rilis 2 (beberapa hari kemudian, setelah stabil): baru hapus yang lama.
   DILARANG menghapus di rilis yang sama dengan penambahan penggantinya.
5. **Tabel per-user baru** wajib: kolom `user_id` + FK + index + masuk daftar
   `USER_DATA_TABLES` di `src/server/services/data.service.ts` + baris migrasi —
   test penjaga `db-user-id-migrations.test.ts` akan menegakkan ini.
6. **Setiap aturan struktural baru → tulis test penjaga** (pola:
   `db-user-id-migrations.test.ts`, `db-password-hash-nullable.test.ts`).

### Tahap 3 — TDD

1. Tulis test yang GAGAL dulu (perilaku yang diinginkan).
2. Tulis kode sampai hijau.
3. Jalankan SELURUH suite — test lama adalah jaring pengaman perilaku lama.
4. Fitur per-user baru wajib punya test isolasi
   ("data user A tidak terlihat user B" — pola `user-provisioning.test.ts`).
   Route baru wajib `requireUserId(request)`.

### Tahap 4 — Gerbang lokal

```bash
npm run preflight   # format check + typecheck + lint + test + build
```

DILARANG push jika ada satu pun yang merah.

### Tahap 5 — Branch → PR → Preview

1. Perubahan besar: branch + Pull Request, JANGAN langsung ke `main`.
2. PR memicu CI (GitHub Actions) + **Vercel Preview Deployment** (URL sementara,
   production tidak tersentuh).
3. Uji preview seperti pengguna nyata: login, klik fitur yang berubah.
4. ⚠️ **Preview memakai DATABASE_URL production secara default** — migrasi berisiko
   WAJIB diuji terhadap **Neon Branch** (salinan instan data production):
   buat branch di dashboard Neon → set `DATABASE_URL` khusus environment Preview
   di Vercel ke connection string branch tersebut.

### Tahap 6 — Merge & deploy

- Merge → Vercel auto-deploy (±2 menit), atomik (alias pindah setelah build utuh).
- Sesi pengguna tidak terputus selama `JWT_SECRET` tidak berubah.
- **DILARANG mengganti `JWT_SECRET`** kecuali sengaja ingin memaksa logout massal.

### Tahap 7 — Verifikasi pasca-deploy (WAJIB, jangan langsung pergi)

```bash
curl https://financial-tracker-v-02.vercel.app/api/health   # DB tersambung?
vercel logs financial-tracker-v-02.vercel.app                # error runtime baru?
```

Lalu buka aplikasi, login, sentuh fitur yang diubah + dashboard + transaksi.
Kedua bug production 2026-08-08 tertangkap lewat `vercel logs` — jadikan ritual.

### Tahap 8 — Rollback

1. Rusak? `vercel rollback` (atau dashboard → Promote deployment sebelumnya).
   Detik-an, semua pengguna kembali ke versi stabil.
2. Rollback mengembalikan KODE, bukan DATABASE — karena itu Tahap 2 (aditif) vital:
   kode lama tetap jalan di atas skema baru.
3. Data rusak → Neon **Point-in-Time Restore** / branch dari masa lalu.
4. Diagnosis akar masalah dengan tenang di lokal/preview, perbaiki dengan test,
   baru deploy ulang. Dilarang menambal panik langsung di production.

---

## Kartu Saku

1. 📋 Analisis dampak: DB/API/data-lama? → migrasi aditif + test penjaga
2. 🧪 Test dulu → kode → seluruh suite hijau
3. ✅ `npm run preflight` hijau semua
4. 🌿 Branch + PR → CI + Preview (skema berisiko → Neon branch)
5. 🚀 Merge → auto-deploy → JANGAN pergi
6. 🔍 health + `vercel logs` + klik manual 5 menit
7. ⏪ Rusak? rollback dulu, diagnosis belakangan
8. 🔐 Jangan pernah: ganti JWT_SECRET / hapus di rilis yang sama / lupa ALTER TABLE tabel lama

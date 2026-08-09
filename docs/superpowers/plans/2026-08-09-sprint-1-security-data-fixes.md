# Sprint 1 — Security & Data-Integrity Fixes (A1–A7) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menutup 7 masalah keamanan/integritas data yang aktif di produksi (spec: `docs/superpowers/specs/2026-08-09-sprint-1-security-data-fixes-design.md`) tanpa mengubah skema DB dan tanpa memutus sesi login aktif.

**Architecture:** Setiap perbaikan bersifat lokal pada file yang bermasalah + guard test yang mencegah regresi kelasnya. Tidak ada tabel/kolom baru. Satu-satunya perubahan bentuk API adalah field respons aditif `failed` pada endpoint cron.

**Tech Stack:** Next.js 16 App Router, Vitest (SQLite in-memory, `fileParallelism: false`), jose (JWT), exceljs (menggantikan xlsx), Zod.

## Global Constraints

- DILARANG mengubah struktur database (tabel/kolom/tipe/constraint) — playbook Tahap 1 sprint ini semuanya "tidak".
- DILARANG menyentuh `JWT_SECRET` atau logika verifikasi token (playbook Tahap 6).
- Bentuk respons API tidak berubah, KECUALI penambahan field `failed` (number) pada respons `POST /api/cron/generate-recurring`.
- TDD ketat: tulis tes gagal → implementasi → seluruh suite hijau. Jalankan `npx vitest run <file>` per langkah; suite penuh sebelum commit terakhir tiap task.
- Branch kerja: `feat/sprint1-security-fixes` dari `main`. Satu commit per task, format `fix(scope): ...`.
- Konvensi kode mengikuti file sekitarnya; TypeScript strict, tanpa `any`.
- Tes memakai pola reset standar: `await resetDb(); resetSeeded(); markSeeded();` di `beforeEach` (lihat `src/__tests__/user-provisioning.test.ts:18-22`).

---

### Task 0: Branch kerja

**Files:** tidak ada (git saja).

- [ ] **Step 1: Buat branch dari main**

```bash
git checkout main && git pull && git checkout -b feat/sprint1-security-fixes
```

---

### Task 1 (A1): Scoping `/api/reports/trends` per pengguna + guard test route

**Files:**
- Modify: `src/app/api/reports/trends/route.ts`
- Test (create): `src/__tests__/reports-trends.route.test.ts`
- Test (create): `src/__tests__/api-route-user-scoping.test.ts`

**Interfaces:**
- Consumes: `requireUserId(request: NextRequest): string` dari `@/server/auth/current-user` (throw `Error('UNAUTHENTICATED: ...')` bila header `x-user-id` tidak ada).
- Produces: respons `{ data: { months: [{ monthKey, income, expense, balance, savingsRate }] } }` — bentuk TIDAK berubah, hanya tercakup per user; 401 `{ error: { message: 'Unauthorized' } }` tanpa user.

- [ ] **Step 1: Tulis tes route yang gagal**

Buat `src/__tests__/reports-trends.route.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/reports/trends/route';
import { getDb, resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';

function makeReq(userId?: string, months?: number) {
  const url = `http://localhost/api/reports/trends${months ? `?months=${months}` : ''}`;
  return new NextRequest(url, {
    headers: userId ? { 'x-user-id': userId } : {},
  });
}

async function insertUserWithTx(id: string, amount: number) {
  const db = await getDb();
  await db.query(`INSERT INTO users (id, email, name) VALUES (?, ?, ?)`, [id, `${id}@x.co`, id]);
  await db.query(
    `INSERT INTO transactions (id, user_id, date, description, category, category_id, type, amount, payment_method, notes)
     VALUES (?, ?, '2026-07-15', 'seed', 'Cat', '', 'income', ?, 'Cash', '')`,
    [`tx-${id}`, id, amount]
  );
}

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

describe('GET /api/reports/trends', () => {
  it('returns 401 without x-user-id', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it('only aggregates the requesting user’s transactions', async () => {
    await insertUserWithTx('user-a', 1_000_000);
    await insertUserWithTx('user-b', 7);

    const res = await GET(makeReq('user-b'));
    expect(res.status).toBe(200);
    const body = await res.json();
    const july = body.data.months.find(
      (m: { monthKey: string }) => m.monthKey === '2026-07'
    );
    expect(july).toBeDefined();
    expect(july.income).toBe(7); // BUKAN 1.000.007
  });
});
```

- [ ] **Step 2: Jalankan tes — pastikan gagal**

Run: `npx vitest run src/__tests__/reports-trends.route.test.ts`
Expected: FAIL — tes 401 mendapat 200, tes isolasi mendapat income `1000007`.

- [ ] **Step 3: Implementasi route scoping**

Ganti seluruh isi `src/app/api/reports/trends/route.ts` dengan:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ensureSeeded } from '@/server/db/seed';
import { getDb } from '@/server/db/client';
import { requireUserId } from '@/server/auth/current-user';

interface MonthlyAggregate {
  month_key: string;
  total_income: number;
  total_expense: number;
}

export async function GET(request: NextRequest) {
  let userId: string;
  try {
    userId = requireUserId(request);
  } catch {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  await ensureSeeded();
  const db = await getDb();

  const monthsParam = request.nextUrl.searchParams.get('months');
  const limit = Math.min(Math.max(parseInt(monthsParam || '12', 10), 1), 24);

  const result = await db.query<MonthlyAggregate>(
    `SELECT
       substr(date, 1, 7) as month_key,
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
     FROM transactions
     WHERE user_id = ?
     GROUP BY month_key
     ORDER BY month_key DESC
     LIMIT ?`,
    [userId, limit]
  );

  const months = result.rows.reverse().map((row) => ({
    monthKey: row.month_key,
    income: row.total_income,
    expense: row.total_expense,
    balance: row.total_income - row.total_expense,
    savingsRate:
      row.total_income > 0
        ? Math.round(((row.total_income - row.total_expense) / row.total_income) * 100)
        : 0,
  }));

  return NextResponse.json({ data: { months } });
}
```

- [ ] **Step 4: Jalankan tes — pastikan lulus**

Run: `npx vitest run src/__tests__/reports-trends.route.test.ts`
Expected: PASS (2 tes).

- [ ] **Step 5: Tulis guard test cakupan requireUserId untuk SEMUA route**

Buat `src/__tests__/api-route-user-scoping.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve, sep } from 'path';

// Route yang secara sah TIDAK per-user: autentikasi, health probe, cron sistem.
const WHITELIST_SEGMENTS = [`${sep}auth${sep}`, `${sep}cron${sep}`, `${sep}health${sep}`];

function collectRouteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectRouteFiles(full));
    } else if (entry === 'route.ts') {
      out.push(full);
    }
  }
  return out;
}

describe('every data API route resolves the current user', () => {
  const apiDir = resolve('src/app/api');
  const routes = collectRouteFiles(apiDir).filter(
    (f) => !WHITELIST_SEGMENTS.some((seg) => f.includes(seg))
  );

  it('found a plausible number of data routes', () => {
    expect(routes.length).toBeGreaterThan(20);
  });

  for (const file of routes) {
    it(`${file.split(`${sep}api${sep}`)[1]} calls requireUserId`, () => {
      const source = readFileSync(file, 'utf-8');
      expect(source).toContain('requireUserId');
    });
  }
});
```

- [ ] **Step 6: Jalankan guard test — pastikan lulus**

Run: `npx vitest run src/__tests__/api-route-user-scoping.test.ts`
Expected: PASS untuk semua route (trends sudah diperbaiki di Step 3; whitelist menutup auth/cron/health). Jika ada route lain yang gagal, itu temuan baru — perbaiki dengan pola yang sama sebelum lanjut.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/reports/trends/route.ts src/__tests__/reports-trends.route.test.ts src/__tests__/api-route-user-scoping.test.ts
git commit -m "fix(reports): scope trends endpoint per user and guard all data routes"
```

---

### Task 2 (A2): Hapus `strftime` (SQLite-only) dari insights + guard test dialek

**Files:**
- Modify: `src/server/services/insights.service.ts:258-295` (fungsi `computeDayOfWeekPattern`)
- Test (create): `src/__tests__/insights-day-of-week.test.ts`
- Test (create): `src/__tests__/no-sqlite-only-sql.test.ts`

**Interfaces:**
- Produces: `export async function computeDayOfWeekPattern(userId: string, month: number, year: number): Promise<DayOfWeekItem[]>` — sekarang DIEKSPOR agar bisa dites unit; nilai kembali identik dengan sebelumnya (array 7 elemen `{ dayIndex, totalAmount, count, avgAmount }`, index 0 = Minggu).
- `buildMonthPrefix(month, year)` sudah ada di file yang sama — bulan 0-index.

- [ ] **Step 1: Tulis tes yang gagal**

Buat `src/__tests__/insights-day-of-week.test.ts`. Fakta kalender: 2026-03-01 = Minggu (index 0), 2026-03-02 = Senin (index 1).

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import { computeDayOfWeekPattern } from '@/server/services/insights.service';

async function insertExpense(id: string, date: string, amount: number) {
  const db = await getDb();
  await db.query(
    `INSERT INTO transactions (id, user_id, date, description, category, category_id, type, amount, payment_method, notes)
     VALUES (?, 'u1', ?, 'x', 'Food', '', 'expense', ?, 'Cash', '')`,
    [id, date, amount]
  );
}

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
  const db = await getDb();
  await db.query(`INSERT INTO users (id, email, name) VALUES ('u1', 'u1@x.co', 'U1')`);
});

describe('computeDayOfWeekPattern (no SQLite-only SQL)', () => {
  it('aggregates expenses per weekday using plain JS', async () => {
    await insertExpense('t1', '2026-03-01', 10_000); // Minggu
    await insertExpense('t2', '2026-03-01', 20_000); // Minggu
    await insertExpense('t3', '2026-03-02', 30_000); // Senin

    const days = await computeDayOfWeekPattern('u1', 2, 2026); // month 0-index: 2 = Maret

    expect(days).toHaveLength(7);
    expect(days[0]).toEqual({ dayIndex: 0, totalAmount: 30_000, count: 2, avgAmount: 15_000 });
    expect(days[1]).toEqual({ dayIndex: 1, totalAmount: 30_000, count: 1, avgAmount: 30_000 });
    expect(days[2]).toEqual({ dayIndex: 2, totalAmount: 0, count: 0, avgAmount: 0 });
  });
});
```

- [ ] **Step 2: Jalankan tes — pastikan gagal**

Run: `npx vitest run src/__tests__/insights-day-of-week.test.ts`
Expected: FAIL — `computeDayOfWeekPattern` belum diekspor (error import).

- [ ] **Step 3: Implementasi**

Di `src/server/services/insights.service.ts`, ganti fungsi `computeDayOfWeekPattern` (baris 258–295) dengan versi diekspor tanpa `strftime`; hapus juga interface `DayOfWeekRow` (baris 252–256) yang tak terpakai lagi:

```typescript
export async function computeDayOfWeekPattern(
  userId: string,
  month: number,
  year: number
): Promise<DayOfWeekItem[]> {
  const db = await getDb();
  const prefix = buildMonthPrefix(month, year);
  const result = await db.query<{ date: string; amount: number }>(
    `SELECT date, amount
     FROM transactions
     WHERE user_id = ? AND type = 'expense' AND date LIKE ? || '%'`,
    [userId, prefix]
  );

  // Hitung hari-dalam-minggu di JS — strftime('%w') hanya ada di SQLite dan
  // meledak di Postgres (insiden produksi /insights).
  const dayMap = new Map<number, { totalAmount: number; count: number }>();
  for (const row of result.rows) {
    const dayIndex = new Date(`${row.date.slice(0, 10)}T00:00:00Z`).getUTCDay();
    if (Number.isNaN(dayIndex)) continue;
    const entry = dayMap.get(dayIndex) ?? { totalAmount: 0, count: 0 };
    entry.totalAmount += row.amount;
    entry.count += 1;
    dayMap.set(dayIndex, entry);
  }

  return Array.from({ length: 7 }, (_, i) => {
    const data = dayMap.get(i);
    if (!data) {
      return { dayIndex: i, totalAmount: 0, count: 0, avgAmount: 0 };
    }
    return {
      dayIndex: i,
      totalAmount: data.totalAmount,
      count: data.count,
      avgAmount: Math.round(data.totalAmount / data.count),
    };
  });
}
```

- [ ] **Step 4: Jalankan tes — pastikan lulus**

Run: `npx vitest run src/__tests__/insights-day-of-week.test.ts src/__tests__/insights.service.test.ts`
Expected: PASS — termasuk tes insights lama (perilaku publik tidak berubah).

- [ ] **Step 5: Tulis guard test dialek**

Buat `src/__tests__/no-sqlite-only-sql.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';

// strftime() hanya ada di SQLite. CI berjalan di SQLite sehingga SQL seperti
// ini lolos tes tapi 500 di Neon Postgres (insiden /insights 2026-08).
// File koneksi SQLite sendiri dikecualikan.
const EXCLUDED_FILES = ['sqlite-client.ts'];

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectTsFiles(full));
    } else if (entry.endsWith('.ts') && !EXCLUDED_FILES.includes(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('server SQL stays Postgres-compatible', () => {
  for (const file of collectTsFiles(resolve('src/server'))) {
    it(`${file} contains no strftime(`, () => {
      expect(readFileSync(file, 'utf-8')).not.toContain('strftime(');
    });
  }
});
```

- [ ] **Step 6: Jalankan guard test — pastikan lulus**

Run: `npx vitest run src/__tests__/no-sqlite-only-sql.test.ts`
Expected: PASS. Bila ada file server lain yang masih memakai `strftime(`, perbaiki dengan pola JS yang sama sebelum lanjut.

- [ ] **Step 7: Commit**

```bash
git add src/server/services/insights.service.ts src/__tests__/insights-day-of-week.test.ts src/__tests__/no-sqlite-only-sql.test.ts
git commit -m "fix(insights): replace SQLite-only strftime with JS weekday aggregation"
```

---

### Task 3 (A3): Jinakkan migrasi destruktif di `seed.ts`

**Files:**
- Modify: `src/server/db/seed.ts` (hapus `cleanup2025Data` baris 166–178 + panggilannya baris 32; perbaiki `migrateCategoryIds` baris 180–197)
- Test (create): `src/__tests__/seed-safety.test.ts`

**Interfaces:**
- Consumes: `ensureSeeded()`, `resetSeeded()`, `markSeeded()` dari `@/server/db/seed`; `getDb`, `resetDb` dari `@/server/db/client`.
- Produces: `seed.ts` tanpa `cleanup2025Data`; `migrateCategoryIds` berkorelasi `user_id`.

- [ ] **Step 1: Tulis tes yang gagal**

Buat `src/__tests__/seed-safety.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getDb, resetDb } from '@/server/db/client';
import { resetSeeded, ensureSeeded } from '@/server/db/seed';

const seedSource = readFileSync(resolve('src/server/db/seed.ts'), 'utf-8');

describe('seed.ts contains no destructive global migrations', () => {
  it('the one-shot 2025 cleanup is gone', () => {
    expect(seedSource).not.toContain('cleanup2025');
    expect(seedSource).not.toMatch(/DELETE FROM transactions/i);
    expect(seedSource).not.toMatch(/DELETE FROM bills/i);
  });

  it('category backfill correlates on user_id', () => {
    expect(seedSource).toMatch(
      /categories\.name = transactions\.category\s+AND categories\.user_id = transactions\.user_id/
    );
  });
});

describe('migrateCategoryIds behavior', () => {
  beforeEach(async () => {
    await resetDb();
    resetSeeded();
  });

  it('backfills category_id from the SAME user’s category, never another user’s', async () => {
    const db = await getDb();
    await db.query(`INSERT INTO users (id, email, name) VALUES ('user-a', 'a@x.co', 'A')`);
    await db.query(`INSERT INTO users (id, email, name) VALUES ('user-b', 'b@x.co', 'B')`);
    // Kategori milik B bernama sama, sengaja dibuat lebih dulu agar LIMIT 1
    // tanpa korelasi akan memilihnya.
    await db.query(
      `INSERT INTO categories (id, user_id, name, type, color, icon, budget)
       VALUES ('cat-b-food', 'user-b', 'Food', 'expense', '#111111', 'utensils', 0)`
    );
    await db.query(
      `INSERT INTO categories (id, user_id, name, type, color, icon, budget)
       VALUES ('cat-a-food', 'user-a', 'Food', 'expense', '#222222', 'utensils', 0)`
    );
    // Transaksi user A dengan category_id kosong → kandidat backfill.
    await db.query(
      `INSERT INTO transactions (id, user_id, date, description, category, category_id, type, amount, payment_method, notes)
       VALUES ('tx-a', 'user-a', '2026-07-01', 'lunch', 'Food', '', 'expense', 50000, 'Cash', '')`
    );

    await ensureSeeded(); // menjalankan migrateCategoryIds karena ada transaksi

    const row = await db.query<{ category_id: string }>(
      `SELECT category_id FROM transactions WHERE id = 'tx-a'`
    );
    expect(row.rows[0].category_id).toBe('cat-a-food'); // BUKAN cat-b-food
  });
});
```

- [ ] **Step 2: Jalankan tes — pastikan gagal**

Run: `npx vitest run src/__tests__/seed-safety.test.ts`
Expected: FAIL — tes sumber menemukan `cleanup2025`/`DELETE FROM`, tes perilaku mendapat `cat-b-food`.

- [ ] **Step 3: Implementasi**

Di `src/server/db/seed.ts`:

1. Hapus baris `await cleanup2025Data(db);` (baris 32).
2. Hapus seluruh fungsi `cleanup2025Data` (baris 166–178 beserta komentar JSDoc-nya).
3. Ganti isi `migrateCategoryIds` menjadi:

```typescript
/** Backfill category_id for any transactions that have an empty category_id */
async function migrateCategoryIds(db: {
  query: <T>(sql: string, params?: unknown[]) => Promise<{ rows: T[]; rowCount: number }>;
}) {
  const orphaned = await db.query<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM transactions WHERE category_id = '' OR category_id IS NULL"
  );
  if ((orphaned.rows[0]?.cnt ?? 0) === 0) return;

  // Resolve from the SAME user's categories only — an uncorrelated lookup
  // once pointed transactions at other users' category rows.
  await db.query(
    `UPDATE transactions SET category_id = (
      SELECT id FROM categories WHERE categories.name = transactions.category
        AND categories.user_id = transactions.user_id LIMIT 1
    ) WHERE (category_id = '' OR category_id IS NULL)
      AND EXISTS (SELECT 1 FROM categories WHERE categories.name = transactions.category
        AND categories.user_id = transactions.user_id)`,
    []
  );
}
```

- [ ] **Step 4: Jalankan tes — pastikan lulus, lalu suite penuh**

Run: `npx vitest run src/__tests__/seed-safety.test.ts` → PASS.
Run: `npx vitest run` → seluruh suite hijau (seed dipakai banyak tes — perubahan ini harus netral bagi mereka).

- [ ] **Step 5: Commit**

```bash
git add src/server/db/seed.ts src/__tests__/seed-safety.test.ts
git commit -m "fix(db): remove armed 2025 cleanup and correlate category backfill by user"
```

---

### Task 4 (A4): Kunci endpoint cron dengan `CRON_SECRET` (fail-closed)

**Files:**
- Modify: `src/app/api/cron/generate-recurring/route.ts`
- Modify: `src/__tests__/cron-generate.route.test.ts`

**Interfaces:**
- Produces: respons sukses menjadi `{ data: { generated, skipped, users, failed } }` (`failed`: jumlah user yang gagal digenerate — field ADITIF). Kegagalan satu user tidak lagi menghentikan user lain (tidak ada lagi 500 dari error per-user).

- [ ] **Step 1: Perbarui tes route (dua tes lama berubah perilaku)**

Ganti seluruh isi `src/__tests__/cron-generate.route.test.ts` dengan:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the service to isolate route auth logic
vi.mock('@/server/services/recurring-transaction.service', () => ({
  generateRecurringTransactions: vi.fn().mockResolvedValue({
    data: { generated: 3, skipped: 0, totalIncome: 5000000, totalExpense: 0 },
  }),
}));

// Import AFTER mock is set up
const { POST } = await import('@/app/api/cron/generate-recurring/route');

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:3000/api/cron/generate-recurring', {
    method: 'POST',
    headers,
  });
}

describe('POST /api/cron/generate-recurring', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'test-secret-12345');
  });

  it('returns 401 without any auth header', async () => {
    const response = await POST(makeRequest());
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 with wrong CRON_SECRET', async () => {
    const response = await POST(makeRequest({ authorization: 'Bearer wrong-secret' }));
    expect(response.status).toBe(401);
  });

  it('returns 401 with only x-vercel-cron-signature (header is client-settable)', async () => {
    const response = await POST(makeRequest({ 'x-vercel-cron-signature': 'spoofed' }));
    expect(response.status).toBe(401);
  });

  it('returns 401 when CRON_SECRET env is missing (fail-closed)', async () => {
    vi.stubEnv('CRON_SECRET', '');
    const response = await POST(makeRequest({ authorization: 'Bearer ' }));
    expect(response.status).toBe(401);
  });

  it('returns 200 with correct Bearer token', async () => {
    const response = await POST(makeRequest({ authorization: 'Bearer test-secret-12345' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.generated).toBe(3);
    expect(body.data.skipped).toBe(0);
    expect(body.data.failed).toBe(0);
  });

  it('continues past a failing user and reports it in failed count', async () => {
    const { generateRecurringTransactions } =
      await import('@/server/services/recurring-transaction.service');
    vi.mocked(generateRecurringTransactions).mockResolvedValueOnce({
      error: { message: 'Database error', code: 'DB_ERROR' },
    });

    const response = await POST(makeRequest({ authorization: 'Bearer test-secret-12345' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.failed).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Jalankan tes — pastikan gagal**

Run: `npx vitest run src/__tests__/cron-generate.route.test.ts`
Expected: FAIL — tes spoofed-header mendapat 200, tes failed-count mendapat 500.

- [ ] **Step 3: Implementasi route**

Ganti seluruh isi `src/app/api/cron/generate-recurring/route.ts` dengan:

```typescript
import { NextResponse } from 'next/server';
import { generateRecurringTransactions } from '@/server/services/recurring-transaction.service';
import { getDb } from '@/server/db/client';
import { ensureSeeded } from '@/server/db/seed';

export async function POST(request: Request) {
  // Fail-closed: hanya Bearer CRON_SECRET yang sah. Header
  // x-vercel-cron-signature TIDAK diperiksa karena bisa diset klien mana pun;
  // Vercel Cron sendiri mengirim Authorization: Bearer CRON_SECRET bila env
  // tersebut terpasang di project.
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureSeeded();
  const db = await getDb();
  const users = await db.query<{ id: string }>('SELECT id FROM users');

  let totalGenerated = 0;
  let totalSkipped = 0;
  let failed = 0;
  for (const row of users.rows) {
    const result = await generateRecurringTransactions(row.id);
    if (result.error) {
      console.error(`[cron/generate-recurring] user ${row.id}:`, result.error.message);
      failed += 1;
      continue;
    }
    if (result.data) {
      totalGenerated += result.data.generated;
      totalSkipped += result.data.skipped;
    }
  }

  return NextResponse.json({
    data: {
      generated: totalGenerated,
      skipped: totalSkipped,
      users: users.rows.length,
      failed,
    },
  });
}
```

- [ ] **Step 4: Jalankan tes — pastikan lulus**

Run: `npx vitest run src/__tests__/cron-generate.route.test.ts`
Expected: PASS (6 tes).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cron/generate-recurring/route.ts src/__tests__/cron-generate.route.test.ts
git commit -m "fix(cron): require CRON_SECRET bearer unconditionally, isolate per-user failures"
```

> ⚠️ Catatan deploy (masuk deskripsi PR): WAJIB verifikasi `CRON_SECRET` sudah terpasang di Vercel env production sebelum merge — tanpa itu cron resmi ikut tertolak.

---

### Task 5 (A7): Masa berlaku JWT = masa berlaku cookie

**Files:**
- Modify: `src/server/services/auth.service.ts` (baris 7, `createToken` baris 130–142, `loginUser` baris 81–114, `issueSessionForUser` baris 148+)
- Modify: `src/app/api/auth/login/route.ts:31`
- Modify: `src/__tests__/auth-keep-signed-in.test.ts`

**Interfaces:**
- Produces:
  - `createToken(user: AuthUser, expiry: string = '7d'): Promise<string>` (private).
  - `loginUser(email: string, password: string, keepSignedIn = false)` — signature bertambah parameter opsional (kompatibel dengan semua pemanggil lama).
  - `issueSessionForUser(userId: string)` — token kini `'30d'` (menyamai cookie 30 hari yang sudah dipasang callback Google).

- [ ] **Step 1: Perluas tes keep-signed-in (gagal dulu)**

Ganti seluruh isi `src/__tests__/auth-keep-signed-in.test.ts` dengan:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { decodeJwt } from 'jose';
import { POST } from '@/app/api/auth/login/route';
import { resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import { registerUser, issueSessionForUser } from '@/server/services/auth.service';

const DAY = 60 * 60 * 24;

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
  await registerUser('a@b.co', 'A', 'pw1234');
});

function makeReq(body: Record<string, unknown>) {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

function tokenFromSetCookie(setCookie: string): string {
  const match = setCookie.match(/auth-token=([^;]+)/);
  expect(match).not.toBeNull();
  return match![1];
}

describe('POST /api/auth/login — keepSignedIn flag', () => {
  it('default: 7-day cookie AND 7-day JWT', async () => {
    const res = await POST(makeReq({ email: 'a@b.co', password: 'pw1234' }));
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('Max-Age=604800'); // 7 days

    const payload = decodeJwt(tokenFromSetCookie(setCookie));
    expect(payload.exp! - payload.iat!).toBe(7 * DAY);
  });

  it('keepSignedIn=true: 30-day cookie AND 30-day JWT', async () => {
    const res = await POST(makeReq({ email: 'a@b.co', password: 'pw1234', keepSignedIn: true }));
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('Max-Age=2592000'); // 30 days

    const payload = decodeJwt(tokenFromSetCookie(setCookie));
    expect(payload.exp! - payload.iat!).toBe(30 * DAY);
  });
});

describe('issueSessionForUser (OAuth callback)', () => {
  it('issues a 30-day token to match the 30-day cookie the callback sets', async () => {
    const reg = await registerUser('o@b.co', 'O', 'pw1234');
    const userId = (reg as { user: { id: string } }).user.id;
    const token = await issueSessionForUser(userId);
    const payload = decodeJwt(token);
    expect(payload.exp! - payload.iat!).toBe(30 * DAY);
  });
});
```

- [ ] **Step 2: Jalankan tes — pastikan gagal**

Run: `npx vitest run src/__tests__/auth-keep-signed-in.test.ts`
Expected: FAIL — `exp - iat` selalu `604800`.

- [ ] **Step 3: Implementasi**

Di `src/server/services/auth.service.ts`:

1. Baris 7, ganti konstanta:

```typescript
const JWT_EXPIRY_DEFAULT = '7d';
const JWT_EXPIRY_EXTENDED = '30d';
```

2. `createToken` menerima expiry:

```typescript
async function createToken(user: AuthUser, expiry: string = JWT_EXPIRY_DEFAULT): Promise<string> {
  return new SignJWT({
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuer(JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime(expiry)
    .sign(getJwtSecret());
}
```

3. `loginUser` — tambah parameter dan teruskan (baris 81–84 dan 111):

```typescript
export async function loginUser(
  email: string,
  password: string,
  keepSignedIn = false
): Promise<{ user: AuthUser; token: string } | { error: string }> {
```

dan baris pembuatan token menjadi:

```typescript
  const token = await createToken(user, keepSignedIn ? JWT_EXPIRY_EXTENDED : JWT_EXPIRY_DEFAULT);
```

4. `issueSessionForUser` — pada pemanggilan `createToken(...)` di dalamnya, ganti menjadi `createToken(user, JWT_EXPIRY_EXTENDED)` (callback Google memasang cookie 30 hari — lihat `google/callback/route.ts:56`).

Di `src/app/api/auth/login/route.ts:31`, teruskan flag:

```typescript
    const result = await loginUser(email, password, keepSignedIn === true);
```

- [ ] **Step 4: Jalankan tes — pastikan lulus, lalu tes auth lain**

Run: `npx vitest run src/__tests__/auth-keep-signed-in.test.ts` → PASS.
Run: `npx vitest run src/__tests__ --silent -t auth` (atau minimal `auth.service.test.ts`, `google-callback.api.test.ts`) → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/services/auth.service.ts src/app/api/auth/login/route.ts src/__tests__/auth-keep-signed-in.test.ts
git commit -m "fix(auth): make JWT expiry match cookie Max-Age for keep-me-signed-in and OAuth"
```

---

### Task 6 (A5): Ekspor "Semua Data" — loop paginasi, bukan 25 baris

**Files:**
- Create: `src/features/export/fetch-all-transactions.ts`
- Modify: `src/features/export/useExport.ts:55-60`
- Test (create): `src/__tests__/fetch-all-transactions.test.ts`

**Interfaces:**
- Produces: `export async function fetchAllTransactions(list: TransactionLister): Promise<{ transactions: Transaction[]; error?: string }>` dengan

```typescript
export type TransactionLister = (params: { page: number; pageSize: number }) => Promise<{
  data?: { transactions: Transaction[]; totalPages: number };
  error?: { message: string };
}>;
```

  (kompatibel dengan `api.transactions.list` yang mengembalikan `TransactionListResponse { transactions, total, income, expense, page, pageSize, totalPages }`).
- Consumes: `api.transactions.list({ page, pageSize })` — `pageSize` maksimum server 100.

- [ ] **Step 1: Tulis tes yang gagal**

Buat `src/__tests__/fetch-all-transactions.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { fetchAllTransactions } from '@/features/export/fetch-all-transactions';
import type { Transaction } from '@/lib/types';

function makeTx(i: number): Transaction {
  return {
    id: `tx-${i}`,
    date: '2026-07-01',
    description: `t${i}`,
    category: 'Food',
    categoryId: '',
    type: 'expense',
    amount: 1000,
    paymentMethod: 'Cash',
    notes: '',
  } as Transaction;
}

describe('fetchAllTransactions', () => {
  it('fetches every page (250 tx across 3 pages of 100)', async () => {
    const all = Array.from({ length: 250 }, (_, i) => makeTx(i));
    const calls: number[] = [];
    const result = await fetchAllTransactions(async ({ page, pageSize }) => {
      calls.push(page);
      const start = (page - 1) * pageSize;
      return {
        data: {
          transactions: all.slice(start, start + pageSize),
          totalPages: Math.ceil(all.length / pageSize),
        },
      };
    });

    expect(result.error).toBeUndefined();
    expect(result.transactions).toHaveLength(250);
    expect(calls).toEqual([1, 2, 3]);
  });

  it('returns an error (not a partial export) when a page fails', async () => {
    const result = await fetchAllTransactions(async ({ page }) => {
      if (page === 2) return { error: { message: 'boom' } };
      return {
        data: { transactions: Array.from({ length: 100 }, (_, i) => makeTx(i)), totalPages: 3 },
      };
    });

    expect(result.error).toBe('boom');
    expect(result.transactions).toHaveLength(0);
  });

  it('handles an empty account (single empty page)', async () => {
    const result = await fetchAllTransactions(async () => ({
      data: { transactions: [], totalPages: 0 },
    }));
    expect(result.error).toBeUndefined();
    expect(result.transactions).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Jalankan tes — pastikan gagal**

Run: `npx vitest run src/__tests__/fetch-all-transactions.test.ts`
Expected: FAIL — modul belum ada.

- [ ] **Step 3: Implementasi util**

Buat `src/features/export/fetch-all-transactions.ts`:

```typescript
import type { Transaction } from '@/lib/types';

export type TransactionLister = (params: { page: number; pageSize: number }) => Promise<{
  data?: { transactions: Transaction[]; totalPages: number };
  error?: { message: string };
}>;

// Server caps pageSize at 100; loop pages instead of asking for one huge page.
const PAGE_SIZE = 100;
// Safety cap: 200 pages = 20.000 transaksi.
const MAX_PAGES = 200;

export async function fetchAllTransactions(
  list: TransactionLister
): Promise<{ transactions: Transaction[]; error?: string }> {
  const all: Transaction[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= MAX_PAGES) {
    const result = await list({ page, pageSize: PAGE_SIZE });
    if (!result.data) {
      // Gagal di tengah = ekspor TIDAK boleh diam-diam parsial.
      return { transactions: [], error: result.error?.message ?? 'Failed to load transactions' };
    }
    all.push(...result.data.transactions);
    totalPages = result.data.totalPages;
    page += 1;
  }

  return { transactions: all };
}
```

- [ ] **Step 4: Jalankan tes — pastikan lulus**

Run: `npx vitest run src/__tests__/fetch-all-transactions.test.ts`
Expected: PASS (3 tes).

- [ ] **Step 5: Sambungkan ke useExport**

Di `src/features/export/useExport.ts`, tambah import:

```typescript
import { fetchAllTransactions } from './fetch-all-transactions';
```

dan ganti `useEffect` baris 55–60 menjadi:

```typescript
  useEffect(() => {
    if (!initialized) return;
    let cancelled = false;
    fetchAllTransactions((params) => api.transactions.list(params)).then((result) => {
      if (cancelled) return;
      if (result.error) {
        setExportError(result.error);
        return;
      }
      setAllTransactions(result.transactions);
    });
    return () => {
      cancelled = true;
    };
  }, [initialized]);
```

- [ ] **Step 6: Typecheck + suite penuh**

Run: `npm run typecheck && npx vitest run`
Expected: hijau semua.

- [ ] **Step 7: Commit**

```bash
git add src/features/export/fetch-all-transactions.ts src/features/export/useExport.ts src/__tests__/fetch-all-transactions.test.ts
git commit -m "fix(export): fetch all transaction pages so All Data export is complete"
```

---

### Task 7 (A6a): Migrasi `xlsx` → `exceljs` (import + template)

**Files:**
- Modify: `src/lib/excel-import.ts` (parser inti jadi matrix-based; exceljs hanya di entry point)
- Modify: `src/lib/excel-template.ts` (tulis ulang dengan exceljs; fungsi jadi async)
- Modify: `src/features/upload/useBulkImport.ts:234-235` (await pemanggilan template)
- Modify: `src/__tests__/bulk-import.test.ts` (fixture jadi matrix polos, tanpa xlsx)
- Modify: `package.json` (hapus dependensi `xlsx`)

**Interfaces:**
- Produces:
  - `export function parseSheetRows(data: SheetRow[]): BulkImportResult` — parser inti; `SheetRow = (string | number | boolean | Date | null | undefined)[]`. Menggantikan `parseExcelWorkbook` (dihapus).
  - `export async function parseExcelFile(file: File): Promise<BulkImportResult>` — signature TIDAK berubah (dipakai `useBulkImport.ts:126-127`).
  - `export async function generateBulkTemplate(categories, paymentMethods): Promise<void>` — kini async (exceljs `writeBuffer` async).
- Perilaku parse (tanggal DD/MM/YYYY, angka `Rp 5.000.000`, serial Excel, dst.) TIDAK berubah — dijaga oleh `bulk-import.test.ts`.

- [ ] **Step 1: Ubah fixture tes ke matrix polos (gagal dulu)**

Di `src/__tests__/bulk-import.test.ts`:

1. Hapus `import * as XLSX from 'xlsx';` (baris 2).
2. Ganti `import { parseExcelWorkbook } from '@/lib/excel-import';` → `import { parseSheetRows } from '@/lib/excel-import';`
3. Ganti helper `createTestWorkbook` (baris 21–53) dengan versi matrix:

```typescript
type TestCell = string | number | boolean | Date | null | undefined;

function createTestWorkbook(incomeRows: TestCell[][], expenseRows: TestCell[][]): TestCell[][] {
  const data: TestCell[][] = [];
  // Row 0: section titles
  data.push([null, null, 'P E M A S U K A N', null, null, null, null, 'P E N G E L U A R A N']);
  // Row 1: headers
  data.push([
    null,
    null,
    'Tanggal',
    'Jumlah',
    'Kategori',
    'Method',
    null,
    'Tanggal',
    'Jumlah',
    'Kategori',
    'account',
    'Notes',
  ]);
  // Data rows — income is 4 cols [Tanggal, Jumlah, Kategori, Method]
  //              expense is 5 cols [Tanggal, Jumlah, Kategori, Account, Notes]
  const maxRows = Math.max(incomeRows.length, expenseRows.length);
  for (let i = 0; i < maxRows; i++) {
    const income = incomeRows[i] || [null, null, null, null];
    const expense = expenseRows[i] || [null, null, null, null, null];
    data.push([null, null, ...income, null, ...expense]);
  }
  return data;
}
```

4. Ganti SEMUA 21 pemanggilan `parseExcelWorkbook(` → `parseSheetRows(` (find-replace; variabel `wb` kini bertipe matrix — biarkan namanya).
5. Bila ada tes yang memakai `XLSX.utils` langsung selain helper ini, ubah ke matrix polos dengan pola yang sama.

- [ ] **Step 2: Jalankan tes — pastikan gagal**

Run: `npx vitest run src/__tests__/bulk-import.test.ts`
Expected: FAIL — `parseSheetRows` belum ada.

- [ ] **Step 3: Refactor `excel-import.ts` ke exceljs**

Di `src/lib/excel-import.ts`:

1. Ganti baris 1: `import * as XLSX from 'xlsx';` → `import ExcelJS from 'exceljs';`
2. Ganti branch serial-number di `parseDate` (baris 17–30) — hilangkan `XLSX.SSF`:

```typescript
  // Excel serial date number (days since 1899-12-30; 25569 = 1970-01-01 UTC)
  if (typeof value === 'number') {
    if (!isFinite(value) || value <= 0) return null;
    const ms = Math.round((value - 25569) * 86400 * 1000);
    const d = new Date(ms);
    if (isNaN(d.getTime())) return null;
    const y = String(d.getUTCFullYear()).padStart(4, '0');
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
```

3. Ganti signature parser inti (baris 278–296): `export function parseExcelWorkbook(workbook: XLSX.WorkBook)` → 

```typescript
export function parseSheetRows(data: SheetRow[]): BulkImportResult {
  if (data.length === 0) {
    return emptyResult();
  }
```

   dan HAPUS blok pembuka lama (SheetNames/Sheets/sheet_to_json, baris 279–296) — sisanya (deteksi header dst.) tidak berubah.
4. Ganti `parseExcelFile` (baris 429–438) dengan versi exceljs + normalisasi sel:

```typescript
// exceljs cell values can be rich objects (formula results, rich text,
// hyperlinks). Flatten them to the primitive the parser understands.
function normalizeExcelValue(value: unknown): CellValue {
  if (value == null) return null;
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value instanceof Date
  ) {
    return value;
  }
  if (typeof value === 'object') {
    const obj = value as { result?: unknown; richText?: { text: string }[]; text?: unknown };
    if (obj.richText) return obj.richText.map((r) => r.text).join('');
    if (obj.result !== undefined) return normalizeExcelValue(obj.result);
    if (obj.text !== undefined) return normalizeExcelValue(obj.text);
  }
  return String(value);
}

export async function parseExcelFile(file: File): Promise<BulkImportResult> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const ws = workbook.worksheets[0];
    if (!ws) {
      return emptyResult('No sheet found in workbook');
    }

    const data: SheetRow[] = [];
    ws.eachRow({ includeEmpty: true }, (row) => {
      const values = row.values as unknown[]; // 1-based; index 0 unused
      data.push(values.slice(1).map(normalizeExcelValue));
    });

    return parseSheetRows(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read Excel file';
    return emptyResult(message);
  }
}
```

- [ ] **Step 4: Jalankan tes bulk-import — pastikan lulus**

Run: `npx vitest run src/__tests__/bulk-import.test.ts`
Expected: PASS — seluruh perilaku parser dipertahankan.

- [ ] **Step 5: Tulis ulang `excel-template.ts` dengan exceljs**

Ganti seluruh isi `src/lib/excel-template.ts` dengan:

```typescript
import ExcelJS from 'exceljs';
import type { Category, PaymentMethod } from './types';

const TEMPLATE_ROWS = 50;
const COLUMN_WIDTHS = [5, 3, 15, 18, 18, 18, 3, 15, 18, 18, 18, 25];

export async function generateBulkTemplate(
  categories: Category[],
  paymentMethods: PaymentMethod[]
): Promise<void> {
  const wb = new ExcelJS.Workbook();

  // =========================================================================
  // Main "Bulk Import" sheet
  // =========================================================================
  const ws = wb.addWorksheet('Bulk Import');
  ws.columns = COLUMN_WIDTHS.map((width) => ({ width }));

  // Row 1 – section titles
  ws.addRow(['No', null, 'P E M A S U K A N', null, null, null, null, 'P E N G E L U A R A N']);
  // Row 2 – column headers
  ws.addRow([
    'No',
    null,
    'Tanggal',
    'Jumlah',
    'Kategori',
    'Method',
    null,
    'Tanggal',
    'Jumlah',
    'Kategori',
    'account',
    'Notes',
  ]);
  // Rows 3-52 – pre-numbered data rows
  for (let i = 1; i <= TEMPLATE_ROWS; i++) {
    ws.addRow([i]);
  }

  ws.mergeCells('C1:F1'); // income title
  ws.mergeCells('H1:L1'); // expense title

  ['A1', 'C1', 'H1'].forEach((ref) => {
    ws.getCell(ref).font = { bold: true, size: 13 };
  });
  ['A2', 'C2', 'D2', 'E2', 'F2', 'H2', 'I2', 'J2', 'K2', 'L2'].forEach((ref) => {
    ws.getCell(ref).font = { bold: true };
  });

  // =========================================================================
  // "Help" sheet
  // =========================================================================
  const helpWs = wb.addWorksheet('Help');
  helpWs.columns = [{ width: 60 }];

  const incomeCategories = categories.filter((c) => c.type === 'income');
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const helpLines: (string | null)[] = ['Bulk Import — Help & Reference', null, 'INCOME CATEGORIES'];
  if (incomeCategories.length > 0) {
    incomeCategories.forEach((c) => helpLines.push(`  • ${c.name}`));
  } else {
    helpLines.push('  (no income categories defined)');
  }
  helpLines.push(null, 'EXPENSE CATEGORIES');
  if (expenseCategories.length > 0) {
    expenseCategories.forEach((c) => helpLines.push(`  • ${c.name}`));
  } else {
    helpLines.push('  (no expense categories defined)');
  }
  helpLines.push(null, 'PAYMENT METHODS');
  if (paymentMethods.length > 0) {
    paymentMethods.forEach((pm) => helpLines.push(`  • ${pm.name} (${pm.type})`));
  } else {
    helpLines.push('  (no payment methods defined)');
  }
  helpLines.push(
    null,
    'DATE FORMAT',
    '  Accepted formats:',
    '  • DD/MM/YYYY  (e.g. 15/03/2026)',
    '  • D/M/YYYY    (e.g. 5/3/2026)',
    '  • YYYY-MM-DD  (e.g. 2026-03-15)',
    '  • 1 Mar 2026',
    null,
    'AMOUNT FORMAT',
    '  Enter amounts in Indonesian Rupiah (IDR). Examples:',
    '  • 5000000',
    '  • 5.000.000   (dots as thousand separators)',
    '  • Rp 5.000.000',
    '  • 5,000,000   (commas as thousand separators)',
    null,
    'GENERAL INSTRUCTIONS',
    '  1. Fill in the "Bulk Import" sheet with your transactions.',
    '  2. The left section (columns C-F) is for INCOME entries.',
    '  3. The right section (columns H-L) is for EXPENSE entries.',
    '  4. Each row can have an income entry, an expense entry, or both.',
    '  5. Maximum 500 data rows per upload.',
    '  6. Do not modify the header rows (rows 1-2).'
  );
  helpLines.forEach((line) => helpWs.addRow([line]));
  helpWs.getCell('A1').font = { bold: true, size: 14 };

  // =========================================================================
  // Trigger download
  // =========================================================================
  const wbOut = await wb.xlsx.writeBuffer();
  const blob = new Blob([wbOut], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'Financial Tracker Bulk Upload Template.xlsx';
  document.body.appendChild(anchor);
  anchor.click();

  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
```

Lalu di `src/features/upload/useBulkImport.ts:234-235`, tambahkan `await`:

```typescript
    const { generateBulkTemplate } = await import('@/lib/excel-template');
    await generateBulkTemplate(categories, paymentMethods);
```

- [ ] **Step 6: Hapus dependensi xlsx**

```bash
npm uninstall xlsx
```

Lalu verifikasi tidak ada sisa: `grep -r "from 'xlsx'" src/` harus kosong.

- [ ] **Step 7: Typecheck + suite penuh**

Run: `npm run typecheck && npx vitest run`
Expected: hijau. (Perhatikan `next.config.ts` tidak mereferensikan xlsx; exceljs sudah dipakai `xlsx-template-builder.ts` sebelumnya.)

- [ ] **Step 8: Commit**

```bash
git add src/lib/excel-import.ts src/lib/excel-template.ts src/features/upload/useBulkImport.ts src/__tests__/bulk-import.test.ts package.json package-lock.json
git commit -m "fix(deps): migrate Excel import/template from vulnerable xlsx to exceljs"
```

---

### Task 8 (A6b): Bump dependensi rawan + rapikan .gitignore

**Files:**
- Modify: `package.json`, `package-lock.json` (via npm)
- Modify: `.gitignore`

- [ ] **Step 1: Audit & bump**

```bash
npm audit
npm update next nanoid
npm audit fix
npm audit
```

Expected akhir: 0 kerentanan HIGH/CRITICAL pada dependensi produksi (`--omit=dev` bila perlu diverifikasi: `npm audit --omit=dev`). JANGAN pakai `npm audit fix --force` (bisa major-bump); bila ada sisa yang butuh force, catat di PR untuk keputusan terpisah.

- [ ] **Step 2: Tambah pola rahasia ke .gitignore**

Tambahkan di akhir `.gitignore`:

```
# Credentials must never enter the repo
*client_secret*
*recovery-codes*
*Backup codes*
```

Verifikasi ketiga file di root kini terabaikan: `git status --short` tidak lagi menampilkan `A. client_secret_...`, `A. Vercel-recovery-codes.txt`, `google-Backup codes.pdf`.

> Catatan untuk pemilik repo (masuk deskripsi PR): pindahkan ketiga file itu KELUAR dari folder repo (mis. ke password manager / folder pribadi). Tooling sengaja tidak memindahkan file kredensial.

- [ ] **Step 3: Preflight penuh**

Run: `npm run preflight`
Expected: format check + typecheck + lint + test + build semuanya hijau. Bump `next` menyentuh build — bila build gagal, diagnosis dulu (JANGAN downgrade diam-diam; catat di PR).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore(deps): patch next/nanoid/vitest advisories and gitignore credential files"
```

---

### Task 9: Gerbang akhir — preflight, push, PR

**Files:** tidak ada perubahan kode baru.

- [ ] **Step 1: Suite & preflight terakhir**

```bash
npm run preflight
```

Expected: hijau total (874+ tes lama + ±15 tes baru).

- [ ] **Step 2: Push & buat PR**

```bash
git push -u origin feat/sprint1-security-fixes
gh pr create --title "Sprint 1: security & data-integrity fixes (A1-A7)" --body "$(cat <<'EOF'
## Ringkasan
Tujuh perbaikan kritis dari spec docs/superpowers/specs/2026-08-09-sprint-1-security-data-fixes-design.md:

- A1 fix(reports): /api/reports/trends kini ter-scope per user + guard test requireUserId untuk semua data route
- A2 fix(insights): strftime (SQLite-only) diganti agregasi JS + guard test dialek
- A3 fix(db): cleanup2025Data dihapus; migrateCategoryIds berkorelasi user_id + guard test seed-safety
- A4 fix(cron): wajib Bearer CRON_SECRET (fail-closed); kegagalan per-user tidak menghentikan user lain (field respons baru: failed)
- A7 fix(auth): exp JWT = Max-Age cookie (7d/30d); OAuth 30d
- A5 fix(export): "All Data" memuat SEMUA transaksi (loop paginasi 100/hal, cap 200 hal)
- A6 fix(deps): xlsx → exceljs (parser upload), bump next/nanoid, audit fix; .gitignore pola kredensial

## Playbook
- Tahap 1: DB ✗ · API: hanya field aditif `failed` (cron) · Legacy: backfill kategori dipersempit per-user
- Tidak menyentuh JWT_SECRET; sesi aktif tetap valid

## ⚠️ Checklist sebelum merge
- [ ] `CRON_SECRET` terpasang di Vercel env production (cron kini fail-closed!)
- [ ] Pemilik repo memindahkan 3 file kredensial keluar dari folder repo
- [ ] Uji Preview: login, /reports (Trends), /insights, /export "All Data", login keep-signed-in

## Pasca-deploy (Tahap 7)
curl /api/health → healthy; `vercel logs` bersih; klik manual /reports + /insights + /export

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Verifikasi CI & Preview**

Tunggu GitHub Actions hijau + Vercel Preview terbit; uji manual sesuai checklist PR.

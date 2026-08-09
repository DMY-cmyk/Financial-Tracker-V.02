# Sprint 2 — UI Honesty & i18n (B1–B6, C1–C3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menghapus kontrol UI yang tidak berefek, menambah state loading/error mobile yang hilang, mem-persist toggle bahasa & urutan kategori, dan menutup ±35 kebocoran i18n (spec: `docs/superpowers/specs/2026-08-09-sprint-2-ui-honesty-i18n-design.md`).

**Architecture:** Semua perubahan frontend/i18n kecuali SATU kolom DB aditif (`categories.sort_order`) yang mengikuti jalur playbook Tahap 2 penuh (CREATE TABLE + columnMigrations + guard test). Keputusan produk terkunci: PeriodTabs = HAPUS, groupByDate = HAPUS.

**Tech Stack:** Next.js 16 App Router, Zustand, TanStack Query, Vitest, i18n kustom `t(locale, key)` (kamus ganda EN/ID di `src/lib/i18n.ts`).

## Global Constraints

- Satu-satunya perubahan DB: kolom aditif `categories.sort_order INTEGER NOT NULL DEFAULT 0` — WAJIB dua tempat (CREATE TABLE `src/server/db/client.ts` + baris `columnMigrations`) + guard test baru.
- Perubahan API hanya ADITIF: field `sortOrder` pada kategori + endpoint baru `PATCH /api/categories/reorder`. Route baru WAJIB `requireUserId(request)` (guard test Sprint 1 menegakkan ini otomatis).
- Setiap kunci i18n baru WAJIB ditambahkan di KEDUA kamus (`en` dan `id`) di `src/lib/i18n.ts`; `TranslationKeys` bertipe — kunci hilang = error kompilasi.
- Konvensi commit `fix(scope):`/`feat(scope):`; setiap commit diakhiri baris `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- TDD untuk logika murni (formatters, service, hook); perubahan JSX murni diverifikasi lewat typecheck + suite penuh + grep.
- Branch: `feat/sprint2-ui-honesty-i18n` dari `main`. `npx vitest run` penuh sebelum tiap commit; baseline ±975 tes hijau.
- DILARANG menyentuh `JWT_SECRET`, skema lain, atau perilaku fitur di luar cakupan.

---

### Task 0: Branch kerja

- [ ] **Step 1:** `git checkout main && git pull && git checkout -b feat/sprint2-ui-honesty-i18n`

---

### Task 1 (B1 + B6.4 + B6.5): Hapus kontrol mati — PeriodTabs, groupByDate & FAB ganda

**Files:**
- Modify: `src/app/page.tsx` (hapus baris 3 `useState` jika tak terpakai lagi, baris 16 import, 74 state, 148–150 render)
- Modify: `src/app/transactions/page.tsx` (baris 17 import, 120 state, 218 render; + blok `{/* Mobile FAB */}` baris 503–512)
- Modify: `src/app/bills/page.tsx` (blok `{/* Mobile FAB */}` ~baris 464–471)
- Modify: `src/app/savings/page.tsx` (blok `{/* Mobile FAB */}` ~baris 267–274)
- Delete: `src/components/shared/PeriodTabs.tsx`
- Modify: `src/features/export/ExportOptions.tsx` (hapus checkbox groupByDate; jika komponen jadi kosong tanpa opsi lain, hapus render-nya di halaman export — verifikasi isi file dulu)
- Modify: `src/features/export/useExport.ts:50-52` (hapus `groupByDate` dari state `options`)
- Modify: `src/lib/types.ts:211` (hapus field `groupByDate` dari tipe options)

**Interfaces:** Tidak ada API/DB. Kunci i18n `groupByDate` DIBIARKAN di kamus.

- [ ] **Step 1:** Verifikasi pemakai lain: `grep -rn "PeriodTabs" src/ | grep -v __tests__` — harus hanya 2 halaman + file komponen. `grep -rn "groupByDate" src/` — pastikan seluruh jejak di luar `i18n.ts` tercakup daftar file di atas (termasuk `ExportOptionsState` dan pemakaiannya di `export-utils`/preview bila ada — hapus juga di sana).
- [ ] **Step 2:** Hapus semua jejak sesuai daftar Files. Di `page.tsx`, `import { useState } from 'react'` tetap dipakai? Cek — jika `period` adalah satu-satunya state, hapus import `useState`.
- [ ] **Step 3 (B6.5):** Hapus blok `{/* Mobile FAB */}` di ketiga halaman (transactions — termasuk kondisi `selectedIds.size === 0` pembungkusnya; bills; savings). FAB tengah `BottomNavFab` menjadi satu-satunya FAB mobile. Import `Plus` dihapus bila tak dipakai lagi di file terkait (transactions masih memakainya di tempat lain — cek per file).
- [ ] **Step 4:** `npm run typecheck && npx vitest run` — hijau; `grep -rn "PeriodTabs\|groupByDate" src/ | grep -v i18n.ts | grep -v __tests__` → kosong; `grep -n "Mobile FAB" src/app/transactions/page.tsx src/app/bills/page.tsx src/app/savings/page.tsx` → kosong.
- [ ] **Step 5:** Commit: `fix(ui): remove dead PeriodTabs, no-op groupByDate option, and duplicate mobile FABs`

---

### Task 2 (B2): `/transactions/new` menghormati `?type=`

**Files:**
- Create: `src/features/transactions/initial-type.ts`
- Modify: `src/app/transactions/new/page.tsx`
- Modify: `src/features/transactions/TransactionForm.tsx` (props + baris 50 `useState` type)
- Test (create): `src/__tests__/initial-type.test.ts`

**Interfaces:**
- Produces: `export function resolveInitialType(param: string | null): 'income' | 'expense'` — `'income'`→income, selain itu expense.
- `TransactionFormProps` bertambah `initialType?: 'income' | 'expense'` (default `'expense'`; prop `transaction` menang bila ada).

- [ ] **Step 1: Tes gagal** — `src/__tests__/initial-type.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { resolveInitialType } from '@/features/transactions/initial-type';

describe('resolveInitialType', () => {
  it('accepts income', () => expect(resolveInitialType('income')).toBe('income'));
  it('accepts expense', () => expect(resolveInitialType('expense')).toBe('expense'));
  it('falls back to expense for null/garbage', () => {
    expect(resolveInitialType(null)).toBe('expense');
    expect(resolveInitialType('INCOME')).toBe('expense');
    expect(resolveInitialType('x')).toBe('expense');
  });
});
```

Run → FAIL (modul belum ada).
- [ ] **Step 2: Implementasi util**:

```typescript
export function resolveInitialType(param: string | null): 'income' | 'expense' {
  return param === 'income' ? 'income' : 'expense';
}
```

- [ ] **Step 3: Halaman** — `new/page.tsx`: `useSearchParams` wajib dibungkus Suspense di App Router. Pecah isi halaman ke komponen dalam-file `NewTransactionContent` yang memanggil `useSearchParams()`, default export membungkusnya:

```tsx
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { resolveInitialType } from '@/features/transactions/initial-type';
// ...imports lama tetap

function NewTransactionContent() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const initialType = resolveInitialType(searchParams.get('type'));
  // ...JSX lama persis, dengan:
  //   <TransactionForm initialType={initialType} onClose={() => router.push('/transactions')} />
}

export default function NewTransactionPage() {
  return (
    <Suspense fallback={null}>
      <NewTransactionContent />
    </Suspense>
  );
}
```

- [ ] **Step 4: Form** — `TransactionForm.tsx`: tambahkan `initialType = 'expense'` ke props destructuring + interface; baris state type menjadi:

```typescript
const [type, setType] = useState<'income' | 'expense'>(transaction?.type || initialType);
```

- [ ] **Step 5:** `npx vitest run src/__tests__/initial-type.test.ts` → PASS; `npm run typecheck && npx vitest run` → hijau.
- [ ] **Step 6:** Commit: `fix(transactions): honor ?type= param so mobile Add Income opens an income form`

---

### Task 3 (B3): Toggle bahasa sidebar/drawer persist ke server

**Files:**
- Modify: `src/components/layout/Sidebar.tsx` (baris 28; call site 156, 176, 189)
- Modify: `src/components/layout/MobileNav.tsx` (baris 28; call site 100, 113)

**Interfaces:** Consumes `useSettings()` dari `@/hooks/useSettings` — `updateLocale(newLocale)` set store LALU `api.settings.update({ locale })`.

- [ ] **Step 1:** Di kedua file: ganti `const setLocale = useStore((s) => s.setLocale);` dengan `const { updateLocale } = useSettings();` (tambah import; hapus import `useStore` bila tak dipakai lagi untuk hal lain — Sidebar juga membaca `locale` dari store, cek dulu; `useSettings()` juga mengembalikan `locale` sehingga bisa dipakai sekalian). Ganti SEMUA pemanggilan `setLocale(...)` → `updateLocale(...)` (termasuk toggle mode collapsed di Sidebar:156).
- [ ] **Step 2:** `npm run typecheck && npx vitest run` → hijau. Verifikasi tak ada `setLocale` tersisa: `grep -n "setLocale" src/components/layout/Sidebar.tsx src/components/layout/MobileNav.tsx` → kosong.
- [ ] **Step 3:** Commit: `fix(settings): persist locale changes made from sidebar and mobile drawer`

---

### Task 4 (B4): /recurring jujur — error state, aksi tersentuh, label dialog

**Files:**
- Modify: `src/features/transactions/useRecurringTransactions.ts` (ekspos `isError`, `refetch` dari useQuery)
- Modify: `src/app/recurring/page.tsx`

**Interfaces:** Hook mengembalikan tambahan `{ isError: boolean; refetch: () => void }` (TanStack useQuery sudah menyediakan keduanya — tinggal diteruskan di objek return hook).

- [ ] **Step 1:** Hook: destrukturkan `isError, refetch` dari `useQuery(...)` dan tambahkan ke return.
- [ ] **Step 2:** Halaman — setelah blok `if (isLoading)`, tambah:

```tsx
if (isError) {
  return (
    <div className="space-y-6">
      <PageHeader title={t(locale, 'recurringTransactions')} />
      <div className="mx-auto max-w-2xl">
        <InlineError
          message={t(locale, 'somethingWentWrong')}
          onRetry={() => refetch()}
          retryLabel={t(locale, 'tryAgain')}
        />
      </div>
    </div>
  );
}
```

(import `InlineError` dari `@/components/shared/EmptyState`; kunci `tryAgain` dibuat di Task 9 — jika task ini berjalan lebih dulu, tambahkan kunci `tryAgain` di kedua kamus sekarang: EN `'Try again'`, ID `'Coba lagi'`; Task 9 akan memakai kunci yang sama.)
- [ ] **Step 3:** Aksi baris: cari `opacity-0 transition-opacity group-hover:opacity-100` (~baris 200) dan samakan dengan pola /bills — buka `src/app/bills/page.tsx`, cari kelas guard `pointer-fine` di baris aksinya, dan tiru persis (aksi selalu terlihat di perangkat sentuh, muncul-saat-hover hanya di pointer halus). Jika /bills memakai `pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100`, gunakan string itu.
- [ ] **Step 4:** ConfirmDialog (~baris 255): tambah `confirmLabel={t(locale, 'delete')}` dan `cancelLabel={t(locale, 'cancel')}` (kedua kunci sudah ada — dipakai /bills:459-461).
- [ ] **Step 5:** `npm run typecheck && npx vitest run` → hijau.
- [ ] **Step 6:** Commit: `fix(recurring): honest error state, touch-visible row actions, localized confirm labels`

---

### Task 5 (B5): Dashboard mobile — loading/error + banner recurring

**Files:**
- Modify: `src/app/page.tsx` (cabang mobile, baris 105–175)

**Interfaces:** `useDashboardData()` sudah mengembalikan `isLoading`, `isError`, `refetch` (dipakai `DashboardContent` desktop) — destrukturkan di halaman.

- [ ] **Step 1:** Baris 72: `const { balance, expense, recentTransactions, categories, isLoading, isError, refetch } = useDashboardData();` (verifikasi nama field persis di `useDashboardData.ts` — bila `refetch` bernama lain, ikuti yang dipakai `DashboardContent`).
- [ ] **Step 2:** Di dalam `<div className="md:hidden">`, SEBELUM `<HeroHeader>`: render banner recurring versi mobile:

```tsx
<AnimatePresence>
  {hasDueItems && (
    <div className="px-4 pt-3">
      <RecurringDueBanner
        dueItems={dueItems}
        totalTransactions={totalTransactions}
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        onGenerate={generate}
        onDismiss={dismiss}
        isGenerating={isGenerating}
        locale={locale}
      />
    </div>
  )}
</AnimatePresence>
```

- [ ] **Step 3:** State loading/error mobile — bungkus konten mobile:

```tsx
{isLoading ? (
  <div className="space-y-3 px-4 pt-6 pb-24">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="border-border bg-card shadow-card h-24 animate-pulse rounded-2xl border" />
    ))}
  </div>
) : isError ? (
  <div className="px-4 pt-6">
    <InlineError message={t(locale, 'somethingWentWrong')} onRetry={() => refetch()} retryLabel={t(locale, 'tryAgain')} />
  </div>
) : (
  <>{/* HeroHeader + konten mobile lama persis */}</>
)}
```

(import `InlineError`; banner dari Step 2 tetap DI LUAR kondisi ini agar tampil segera. Kunci `tryAgain` sudah dibuat Task 4 — verifikasi ada di kamus.)
- [ ] **Step 4:** `npm run typecheck && npx vitest run` → hijau.
- [ ] **Step 5:** Commit: `fix(dashboard): mobile loading/error states and recurring due banner`

---

### Task 6 (B6.1): TransactionRowMobile tanpa jam palsu

**Files:**
- Modify: `src/components/transactions/TransactionRowMobile.tsx:17,30`

- [ ] **Step 1:** Ganti baris 17 `const when = format(new Date(transaction.date), 'HH:mm – MMM dd');` dengan `const when = formatDateShort(transaction.date);` (import dari `@/lib/formatters`; hapus import `format` date-fns bila tak dipakai lagi). `formatDateShort` merender `d MMM` dari string ISO tanpa komponen jam.
- [ ] **Step 2:** `npm run typecheck && npx vitest run` → hijau.
- [ ] **Step 3:** Commit: `fix(transactions): drop bogus timezone-derived clock from mobile rows`

---

### Task 7 (B6.3): Hook debounce + budget inline tidak lagi menembak per ketikan

**Files:**
- Create: `src/hooks/useDebouncedCallback.ts`
- Modify: `src/app/settings/categories/page.tsx` (input budget ~baris 344-352 dan handler `handleUpdateBudget`)
- Test (create): `src/__tests__/use-debounced-callback.test.ts`

**Interfaces:**
- Produces: `export function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, delayMs: number): (...args: A) => void` — panggilan beruntun di dalam `delayMs` digabung; hanya invokasi terakhir dieksekusi; timer dibersihkan saat unmount. Dipakai lagi oleh Task 8.

- [ ] **Step 1: Tes gagal** — `src/__tests__/use-debounced-callback.test.ts` (pakai `renderHook` bila `@testing-library/react` tersedia — cek `package.json`; JIKA TIDAK ada, tulis util murni `createDebounced(fn, delay)` di `src/lib/debounce.ts` + hook tipis di atasnya, dan tes util murninya):

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createDebounced } from '@/lib/debounce';

describe('createDebounced', () => {
  it('collapses rapid calls into the last one', () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const debounced = createDebounced(spy, 500);
    debounced('a'); debounced('b'); debounced('c');
    expect(spy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('c');
    vi.useRealTimers();
  });

  it('cancel() prevents pending call', () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const debounced = createDebounced(spy, 500);
    debounced('x');
    debounced.cancel();
    vi.advanceTimersByTime(1000);
    expect(spy).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Implementasi** `src/lib/debounce.ts`:

```typescript
export interface Debounced<A extends unknown[]> {
  (...args: A): void;
  cancel: () => void;
}

export function createDebounced<A extends unknown[]>(
  fn: (...args: A) => void,
  delayMs: number
): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: A) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, delayMs);
  };
  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return debounced;
}
```

dan `src/hooks/useDebouncedCallback.ts`:

```typescript
'use client';

import { useEffect, useMemo, useRef } from 'react';
import { createDebounced } from '@/lib/debounce';

export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delayMs: number
): (...args: A) => void {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const debounced = useMemo(
    () => createDebounced((...args: A) => fnRef.current(...args), delayMs),
    [delayMs]
  );
  useEffect(() => () => debounced.cancel(), [debounced]);
  return debounced;
}
```

- [ ] **Step 3: Wire budget input** di `settings/categories/page.tsx`: buat `const debouncedUpdateBudget = useDebouncedCallback((id: string, budget: number) => { void handleUpdateBudget(id, budget); }, 500);` dan di `onChange` input budget ganti pemanggilan langsung `handleUpdateBudget(c.id, budget)` → `debouncedUpdateBudget(c.id, budget)` (state lokal tetap di-set segera agar ketikan responsif). Perbaiki juga `handleUpdateBudget` agar menampilkan `toast.error(t(locale, 'somethingWentWrong'))` bila API gagal (saat ini gagal senyap — cek fungsinya ~baris 202 dan tambahkan cabang error; `toast` dari `sonner` sudah diimpor halaman ini? verifikasi, tambah bila belum).
- [ ] **Step 4:** `npx vitest run src/__tests__/use-debounced-callback.test.ts` → PASS; suite penuh + typecheck → hijau.
- [ ] **Step 5:** Commit: `fix(categories): debounce inline budget edits and surface save failures`

---

### Task 8 (B6.2): Persist urutan kategori — kolom `sort_order` (Playbook Tahap 2)

**Files:**
- Modify: `src/server/db/client.ts` (CREATE TABLE categories baris 79-89 + `columnMigrations` dekat baris 250-252)
- Modify: `src/server/repositories/category.repository.ts` (3 ORDER BY: baris 32, 59, 79; + fungsi `reorder`)
- Modify: `src/server/services/category.service.ts` (+ `reorderCategories`)
- Modify: `src/lib/api/validation.ts` (+ `reorderCategoriesSchema`)
- Create: `src/app/api/categories/reorder/route.ts`
- Modify: `src/lib/api/client.ts` (+ `api.categories.reorder`)
- Modify: `src/lib/types.ts` (Category + `sortOrder?: number` — tiru bagaimana `archived` dimodelkan)
- Modify: `src/app/settings/categories/page.tsx` (handleReorderExpense/Income → persist debounced)
- Test (create): `src/__tests__/db-category-sort-order-migration.test.ts`, `src/__tests__/category-reorder.service.test.ts`

**Interfaces:**
- Produces: `PATCH /api/categories/reorder` body `{ ids: string[] }` → 200 `{ data: { success: true } }`; menulis `sort_order = index` untuk id milik user tsb (id milik user lain diabaikan diam-diam oleh klausa `WHERE user_id`).
- `listCategories` kini terurut `sort_order ASC, name ASC` (kategori lama semua 0 → fallback alfabetis, perilaku lama terjaga).
- Client: `api.categories.reorder(ids: string[])`.

- [ ] **Step 1: Guard test migrasi (gagal dulu)** — `src/__tests__/db-category-sort-order-migration.test.ts` (pola `db-user-id-migrations.test.ts`):

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const clientSource = readFileSync(resolve('src/server/db/client.ts'), 'utf-8');

describe('categories.sort_order exists in BOTH schema places (playbook rule)', () => {
  it('CREATE TABLE definition', () => {
    expect(clientSource).toMatch(/CREATE TABLE IF NOT EXISTS categories[\s\S]*?sort_order INTEGER NOT NULL DEFAULT 0/);
  });
  it('legacy ALTER migration', () => {
    expect(clientSource).toMatch(
      /ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0/
    );
  });
});
```

- [ ] **Step 2: Tes service (gagal dulu)** — `src/__tests__/category-reorder.service.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import { listCategories, reorderCategories } from '@/server/services/category.service';

async function insertCat(id: string, userId: string, name: string) {
  const db = await getDb();
  await db.query(
    `INSERT INTO categories (id, user_id, name, type, color, icon, budget)
     VALUES (?, ?, ?, 'expense', '#123456', 'tag', 0)`,
    [id, userId, name]
  );
}

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
  const db = await getDb();
  await db.query(`INSERT INTO users (id, email, name) VALUES ('u1', 'u1@x.co', 'U1')`);
  await db.query(`INSERT INTO users (id, email, name) VALUES ('u2', 'u2@x.co', 'U2')`);
  await insertCat('c-a', 'u1', 'Alpha');
  await insertCat('c-b', 'u1', 'Beta');
  await insertCat('c-c', 'u1', 'Gamma');
  await insertCat('c-x', 'u2', 'Alpha');
});

describe('reorderCategories', () => {
  it('persists the given order and list respects it', async () => {
    const r = await reorderCategories('u1', ['c-c', 'c-a', 'c-b']);
    expect(r.error).toBeUndefined();
    const list = await listCategories('u1', {});
    expect(list.data!.map((c) => c.id)).toEqual(['c-c', 'c-a', 'c-b']);
  });

  it('default order (all sort_order 0) falls back to name', async () => {
    const list = await listCategories('u1', {});
    expect(list.data!.map((c) => c.name)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('cannot move another user’s category', async () => {
    await reorderCategories('u1', ['c-x', 'c-a', 'c-b', 'c-c']);
    const other = await listCategories('u2', {});
    expect(other.data!.map((c) => c.id)).toEqual(['c-x']); // tak tersentuh
  });
});
```

- [ ] **Step 3: Skema** — `client.ts`: tambah `sort_order INTEGER NOT NULL DEFAULT 0,` di CREATE TABLE categories (setelah `archived`), dan di `columnMigrations` (kelompok migrasi kategori dekat baris 250):

```typescript
    `ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0`,
```

- [ ] **Step 4: Repo** — tiga ORDER BY (baris 32, 59, 79) → `ORDER BY sort_order, name`. Tambah metode:

```typescript
    async reorder(userId: string, ids: string[]): Promise<void> {
      const db = await getDb();
      for (let i = 0; i < ids.length; i++) {
        await db.query('UPDATE categories SET sort_order = ? WHERE id = ? AND user_id = ?', [
          i,
          ids[i],
          userId,
        ]);
      }
    },
```

(Loop kecil — jumlah kategori per user belasan; batching masuk cakupan F2.) Pastikan pemetaan row→Category menyertakan `sortOrder: row.sort_order` mengikuti pola field lain di repo ini.
- [ ] **Step 5: Service + validasi + route + client** —
`validation.ts`:

```typescript
export const reorderCategoriesSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
});
```

`category.service.ts`:

```typescript
export async function reorderCategories(
  userId: string,
  ids: string[]
): Promise<ServiceResult<{ success: boolean }>> {
  await ensureSeeded();
  const parsed = reorderCategoriesSchema.safeParse({ ids });
  if (!parsed.success) {
    return { error: formatZodError(parsed.error) };
  }
  await categoryRepo.reorder(userId, parsed.data.ids);
  return { data: { success: true } };
}
```

(ikuti bentuk `ServiceResult`/`formatZodError`/nama instans repo yang sudah dipakai fungsi lain di file yang sama — samakan persis.)
`src/app/api/categories/reorder/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody } from '@/lib/api/read-json';
import { reorderCategories } from '@/server/services/category.service';
import { requireUserId } from '@/server/auth/current-user';

export async function PATCH(request: NextRequest) {
  const parsed = await readJsonBody(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data as { ids?: string[] };
  const result = await reorderCategories(requireUserId(request), body.ids ?? []);
  if (result.error) {
    const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ data: result.data });
}
```

`client.ts` (di objek `categories`):

```typescript
    reorder(ids: string[]) {
      return fetchApi<{ success: boolean }>('/categories/reorder', {
        method: 'PATCH',
        body: JSON.stringify({ ids }),
      });
    },
```

- [ ] **Step 6: Halaman settings** — `handleReorderExpense/Income` tetap set state lokal, lalu persist debounced (hook Task 7):

```typescript
const persistOrder = useDebouncedCallback((ids: string[]) => {
  api.categories.reorder(ids).then((r) => {
    if (r.error) toast.error(t(locale, 'somethingWentWrong'));
  });
}, 800);

const handleReorderExpense = (reordered: Category[]) => {
  setExpenseOrder(reordered.map((c) => c.id));
  persistOrder(reordered.map((c) => c.id));
};
// idem income
```

- [ ] **Step 7:** Semua tes baru PASS + suite penuh + typecheck hijau. Guard test Sprint 1 (`api-route-user-scoping`) otomatis meng-cover route baru — pastikan hijau.
- [ ] **Step 8:** Commit: `feat(categories): persist drag order via additive sort_order column`

> ⚠️ Playbook: kolom aditif + DEFAULT 0 → aman untuk data lama; TIDAK perlu Neon Branch, tapi catat di PR bahwa migrasi baru berjalan di cold start pertama.

---

### Task 9 (C2 + fondasi kunci C1): formatters ber-locale + kunci bersama

**Files:**
- Modify: `src/lib/formatters.ts:13-18` (`formatCurrencyShort`)
- Modify: `src/lib/constants.ts` (+ `getMonthNames`)
- Modify: `src/lib/i18n.ts` (+ kunci `tryAgain`, `clearFilters` bila belum ada — cek dulu; `noResults` sudah ada)
- Modify: call site `formatCurrencyShort` (grep semua; teruskan `locale`) dan `MONTH_NAMES` tanpa-syarat di `src/features/dashboard/DashboardContent.tsx`, `src/app/export/page.tsx:104`, `src/app/transactions/page.tsx:242` → `getMonthNames(locale)[month]`
- Test (create): `src/__tests__/formatters-locale.test.ts`

**Interfaces:**
- `formatCurrencyShort(amount: number, locale: 'en' | 'id' = 'en')` — EN: `K/M/B`; ID: `rb/jt/M` (miliar); negatif diringkas dengan tanda minus di depan `Rp`.
- `getMonthNames(locale: 'en' | 'id'): string[]` di `constants.ts` → `locale === 'id' ? MONTH_NAMES_ID : MONTH_NAMES`.

- [ ] **Step 1: Tes gagal** — `src/__tests__/formatters-locale.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { formatCurrencyShort } from '@/lib/formatters';
import { getMonthNames } from '@/lib/constants';

describe('formatCurrencyShort', () => {
  it('EN suffixes', () => {
    expect(formatCurrencyShort(12_500_000, 'en')).toBe('Rp 12.5M');
    expect(formatCurrencyShort(950_000, 'en')).toBe('Rp 950K');
    expect(formatCurrencyShort(2_000_000_000, 'en')).toBe('Rp 2.0B');
  });
  it('ID suffixes', () => {
    expect(formatCurrencyShort(12_500_000, 'id')).toBe('Rp 12,5jt');
    expect(formatCurrencyShort(950_000, 'id')).toBe('Rp 950rb');
    expect(formatCurrencyShort(2_000_000_000, 'id')).toBe('Rp 2,0M');
  });
  it('negative amounts are abbreviated too', () => {
    expect(formatCurrencyShort(-1_500_000, 'en')).toBe('-Rp 1.5M');
    expect(formatCurrencyShort(-1_500_000, 'id')).toBe('-Rp 1,5jt');
  });
  it('small values untouched', () => {
    expect(formatCurrencyShort(500, 'en')).toBe('Rp 500');
    expect(formatCurrencyShort(-500, 'id')).toBe('-Rp 500');
  });
});

describe('getMonthNames', () => {
  it('locale-aware', () => {
    expect(getMonthNames('en')[2]).toBe('March');
    expect(getMonthNames('id')[2]).toBe('Maret');
  });
});
```

- [ ] **Step 2: Implementasi** `formatters.ts`:

```typescript
export function formatCurrencyShort(amount: number, locale: 'en' | 'id' = 'en'): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const dec = (n: number) => {
    const s = n.toFixed(1);
    return locale === 'id' ? s.replace('.', ',') : s;
  };
  if (abs >= 1_000_000_000)
    return `${sign}Rp ${dec(abs / 1_000_000_000)}${locale === 'id' ? 'M' : 'B'}`;
  if (abs >= 1_000_000)
    return `${sign}Rp ${dec(abs / 1_000_000)}${locale === 'id' ? 'jt' : 'M'}`;
  if (abs >= 1_000)
    return `${sign}Rp ${(abs / 1_000).toFixed(0)}${locale === 'id' ? 'rb' : 'K'}`;
  return `${sign}Rp ${abs}`;
}
```

`constants.ts` (setelah deklarasi MONTH_NAMES_ID):

```typescript
export function getMonthNames(locale: 'en' | 'id'): string[] {
  return locale === 'id' ? MONTH_NAMES_ID : MONTH_NAMES;
}
```

- [ ] **Step 3:** Perbarui call site: `grep -rn "formatCurrencyShort(" src/ | grep -v __tests__ | grep -v formatters.ts` — setiap pemakaian meneruskan `locale` yang tersedia di komponennya (semua komponen pemakai punya `locale` dari `useLocale()`/props — bila ada yang tidak, tambahkan `useLocale()`). Lalu tiga situs `MONTH_NAMES[...]` tanpa-syarat (DashboardContent, export:104, transactions:242) → `getMonthNames(locale)[...]`. Tambah kunci `tryAgain` (EN 'Try again' / ID 'Coba lagi') dan `clearFilters` (EN 'Clear filters' / ID 'Hapus filter') BILA belum ada di kamus.
- [ ] **Step 4:** Tes baru PASS + suite penuh + typecheck hijau.
- [ ] **Step 5:** Commit: `fix(i18n): locale-aware short currency and month names (jt/rb, Maret)`

---

### Task 10 (C1 shared + C3): Default komponen shared ter-i18n, not-found, error, html lang, skip-link

**Files:**
- Modify: `src/components/shared/ConfirmDialog.tsx`
- Modify: `src/components/shared/EmptyState.tsx` (NoResults + InlineError defaults)
- Modify: `src/app/not-found.tsx` (jadikan client + t())
- Modify: `src/app/error.tsx` (ternary → kunci baru `unexpectedErrorBody`)
- Modify: `src/app/layout.tsx` (skip-link → komponen client kecil) + Create: `src/components/layout/SkipLink.tsx` + Create: `src/components/providers/HtmlLangSync.tsx`
- Modify: `src/lib/i18n.ts` (kunci baru, KEDUA kamus): `skipToContent` (EN 'Skip to main content'/ID 'Lompat ke konten utama'), `unexpectedErrorBody` (EN 'An unexpected error occurred. Please try again or refresh the page.'/ID 'Terjadi kesalahan. Silakan coba lagi atau muat ulang halaman.')

**Interfaces:** `ConfirmDialog`/`NoResults`/`InlineError` tetap menerima label opsional; DEFAULT-nya kini dari `t(locale, ...)` via `useLocale()` di dalam komponen (semuanya sudah `'use client'`).

- [ ] **Step 1:** `ConfirmDialog`: hapus default literal; di badan komponen `const locale = useLocale();` lalu `const confirm = confirmLabel ?? t(locale, 'delete'); const cancel = cancelLabel ?? t(locale, 'cancel');` dan render keduanya. `NoResults`: default `message ?? t(locale, 'noResults')`, `clearLabel ?? t(locale, 'clearFilters')`. `InlineError`: `retryLabel ?? t(locale, 'tryAgain')`. (Import `t, useLocale` dari `@/lib/i18n`; kunci `noResults` sudah ada, `clearFilters`/`tryAgain` dibuat Task 9.)
- [ ] **Step 2:** `not-found.tsx` → `'use client'`, `useLocale()`, teks: `404` tetap, `t(locale, 'pageNotFound')`, deskripsi pakai kunci baru `pageNotFoundBody` (EN "The page you're looking for doesn't exist or has been moved."/ID 'Halaman yang Anda cari tidak ada atau sudah dipindahkan.') — tambah ke kamus, tombol `t(locale, 'backToDashboard')` (kunci sudah ada).
- [ ] **Step 3:** `error.tsx:29-31` ternary → `{t(locale, 'unexpectedErrorBody')}`.
- [ ] **Step 4:** `SkipLink.tsx` (client): render `<a href="#main-content" className={...sama persis dengan layout...}>{t(locale, 'skipToContent')}</a>`; `HtmlLangSync.tsx` (client):

```tsx
'use client';

import { useEffect } from 'react';
import { useLocale } from '@/lib/i18n';

export function HtmlLangSync() {
  const locale = useLocale();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
```

`layout.tsx`: ganti `<a ...>Skip to main content</a>` dengan `<SkipLink />` DI DALAM `<StoreProvider>` (butuh store; pindahkan tepat setelah pembuka StoreProvider), dan mount `<HtmlLangSync />` di sebelahnya. `lang="en"` di tag html tetap sebagai nilai SSR awal (di-sync di client).
- [ ] **Step 5:** `npm run typecheck && npx vitest run` → hijau; cek manual: `grep -n "Skip to main content\|'Delete'\|'Cancel'\|No results found" src/components/shared/*.tsx src/app/layout.tsx` → tidak ada literal tersisa sebagai default.
- [ ] **Step 6:** Commit: `fix(i18n): localized defaults for shared dialogs/empty states, 404, error page, skip link, html lang`

---

### Task 11 (C1 sweep 1): Halaman auth + net-worth

**Files:**
- Modify: `src/app/register/page.tsx` (12 ternary), `src/app/forgot-password/page.tsx` (3), `src/app/reset-password/page.tsx` (2)
- Modify: `src/features/net-worth/AssetsList.tsx`, `LiabilityDialog.tsx`, `MonthOverMonthCard.tsx`, `NetWorthTrendChart.tsx`, `SnapshotButton.tsx` (±10 string)
- Modify: `src/lib/i18n.ts` (kunci baru, KEDUA kamus)

**Metode (berlaku juga Task 12):** untuk SETIAP ternary `locale === 'en' ? 'X' : 'Y'` (atau kebalikannya): buat kunci baru bergaya kamus yang ada (register → prefiks `auth*` meniru kunci /login, mis. `authRegisterTitle`; net-worth → prefiks `nw*`, mis. `nwAddLiability`), nilai EN = sisi EN ternary, nilai ID = sisi ID ternary (JANGAN menerjemahkan ulang — pakai teks yang sudah ditulis di ternary), lalu ganti ekspresi dengan `t(locale, 'kunciBaru')`. Komponen tanpa `locale` → tambah `useLocale()`.

- [ ] **Step 1:** Sapu kelima+tiga file sesuai metode. Register meniru pola /login (baca `src/features/auth/LoginForm.tsx` / `login/page.tsx` untuk gaya penamaan `auth*`).
- [ ] **Step 2:** Verifikasi: `grep -n "locale === 'en' ?\|locale === 'id' ?" src/app/register/page.tsx src/app/forgot-password/page.tsx src/app/reset-password/page.tsx src/features/net-worth/*.tsx` → kosong.
- [ ] **Step 3:** `npm run typecheck && npx vitest run` → hijau (typed keys menangkap salah ketik).
- [ ] **Step 4:** Commit: `fix(i18n): route register/reset flows and net-worth feature through the dictionary`

---

### Task 12 (C1 sweep 2): Sisa kebocoran + guard test i18n

**Files:**
- Modify: `src/app/export/page.tsx` (deskripsi format :27-29 — EN murni, TAMBAH terjemahan ID sendiri: 'Spreadsheet compatible'→'Kompatibel dengan spreadsheet', 'Formatted workbook'→'Workbook terformat', 'Print-ready report'→'Laporan siap cetak'; empty state :136-141)
- Modify: `src/app/bills/page.tsx` (toast generate :203-206, placeholder :399)
- Modify: `src/app/savings/page.tsx` (:60 'goals/target', placeholder :193)
- Modify: `src/features/dashboard/DashboardContent.tsx` (:111, :117-119, :188-192, :300, :307, :314)
- Modify: `src/features/transactions/TransactionForm.tsx` (:254, :339 'Select…'), `TransactionTable.tsx` (:175, :185 aria-label paginasi), `AllTransactionsView.tsx` (:107)
- Modify: `src/features/upload/OcrPreview.tsx` (:74), `src/features/balances/BalanceGrid.tsx` (:29), `src/app/upload/page.tsx` (:194-197)
- Modify: `src/lib/i18n.ts` (kunci baru, KEDUA kamus)
- Test (create): `src/__tests__/no-inline-locale-ternary.test.ts`

- [ ] **Step 1:** Sapu semua file dengan metode Task 11 (nomor baris dari audit 2026-08-08 — bisa bergeser; cari polanya, jangan andalkan nomor baris).
- [ ] **Step 2: Guard test** — `src/__tests__/no-inline-locale-ternary.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve, sep } from 'path';

// String pengguna wajib lewat t(locale, key). Ternary inline `locale === '..' ?`
// adalah kebocoran i18n — kecuali daftar file yang memang memetakan locale ke
// mekanisme non-kamus (Intl tag, date-fns locale, dsb.).
const WHITELIST = [
  `${sep}lib${sep}i18n.ts`,
  `${sep}lib${sep}formatters.ts`,
  `${sep}lib${sep}constants.ts`,
  `${sep}lib${sep}api${sep}validation.ts`,
  `${sep}features${sep}insights${sep}DayOfWeekPills.tsx`,
];

function collect(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collect(full));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

describe('no inline locale ternaries outside the whitelist', () => {
  const roots = ['src/app', 'src/components', 'src/features'].map((r) => resolve(r));
  const files = roots.flatMap(collect).filter((f) => !WHITELIST.some((w) => f.endsWith(w)));
  const offenders = files.filter((f) => /locale === '(en|id)'\s*\?/.test(readFileSync(f, 'utf-8')));
  it('every user-facing string goes through t()', () => {
    expect(offenders).toEqual([]);
  });
});
```

Jalankan — bila masih ada offender yang lolos sapuan, itulah daftar kerjamu; ulangi sampai hijau. Bila sebuah offender ternyata pemakaian SAH non-string (mis. memilih locale Intl), tambahkan file itu ke WHITELIST dengan komentar alasan.
- [ ] **Step 3:** `npm run typecheck && npx vitest run` → hijau.
- [ ] **Step 4:** Commit: `fix(i18n): sweep remaining hardcoded strings and add inline-ternary guard test`

---

### Task 13: Gerbang akhir — preflight, push, PR

- [ ] **Step 1:** `npm run preflight` → hijau total.
- [ ] **Step 2:** `git push -u origin feat/sprint2-ui-honesty-i18n` lalu `gh pr create` dengan judul `Sprint 2: UI honesty & i18n completeness (B1-B6, C1-C3)`; badan PR merangkum item + analisis playbook (kolom aditif sort_order; migrasi jalan di cold start pertama) + checklist uji Preview: ganti bahasa dari sidebar lalu refresh (bertahan), buka /recurring dengan DevTools offline (InlineError), FAB tunggal mobile, `?type=income` membuka form pemasukan, drag urutan kategori lalu reload (bertahan), locale ID menampilkan 'Maret 2026' & 'Rp 12,5jt' & dialog 'Hapus/Batal'. Akhiri badan PR dengan footer 🤖 standar.
- [ ] **Step 3:** Tunggu CI + Vercel Preview hijau.

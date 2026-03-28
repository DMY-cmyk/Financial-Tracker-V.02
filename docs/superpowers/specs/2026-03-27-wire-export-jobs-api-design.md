---
feature: Wire Export Jobs to API
type: spec
date: 2026-03-27
status: draft
tier: 4
---

# Feature 16 — Wire Export Jobs to API

## 1. Overview

The export page currently generates files client-side but does not record anything to the database. The `export_jobs` table and its backend stack (`repository → service → API route → typed client`) already exist and are fully functional — they are simply not called.

This feature wires up that idle infrastructure: after every successful export, the app records the job to the API, then surfaces a paginated "Export History" section on the export page. Each history entry includes a **Re-export** button that pre-populates the export form with the same settings and immediately triggers the download again.

The practical benefits are:

- **Audit trail** — every export is timestamped and stored; useful for compliance and debugging.
- **Re-download convenience** — users can reproduce any past export in one click without reconfiguring scope and format.
- **Usage visibility** — for future analytics, the history shows how often and in what formats users export.

The feature requires no schema changes. The only backend change is a minor enrichment of the `POST /api/export-jobs` payload (adding `filename` to the request). All other work is in the client layer.

---

## 2. Goals

1. After every successful file download, call `POST /api/export-jobs` with the complete job metadata including the actual filename generated.
2. On the export page, fetch and display the export history below the existing export form.
3. Support "Re-export" — clicking it on a history entry pre-fills the form with the recorded `format`, `scope`, and `filters`, then triggers the export immediately.
4. Show a meaningful empty state when no exports have been made yet.
5. Keep the history list bounded: show at most the 20 most recent jobs; do not add pagination to this tier.
6. Maintain consistent visual language with the rest of the app (rounded-2xl cards, staggerList animation, shadcn/ui primitives).
7. All new user-facing strings must be bilingual (EN/ID) via `t(locale, key)`.

---

## 3. Non-Goals

- **No file storage in the DB**: Export files are ephemeral browser downloads. The DB stores metadata only.
- **No server-side generation**: File generation remains client-side (SheetJS, jsPDF). The API records outcomes; it does not produce files.
- **No export scheduling or queuing**: Jobs are always created synchronously after the download completes.
- **No PATCH /api/export-jobs/[id]**: Because the service already marks jobs as `completed` in a single `POST` round-trip (it calls `repo.updateStatus` internally), a separate PATCH endpoint is not needed.
- **No retry mechanism for failed API calls**: If the `POST /api/export-jobs` call fails silently, the export itself has already completed. The user is not blocked. A silent failure here is acceptable for this tier.
- **No delete / clear-history action**: History management (deleting old records) is out of scope.
- **No notification or badge for new history entries**: The history list refreshes in-place; no toast is shown for the record creation specifically (the export success toast already fires).

---

## 4. Approaches

### Option A — Record after successful export (recommended)

1. Call `POST /api/export-jobs` only after the file download has been triggered successfully.
2. The job is created with `status: 'completed'` (the service handles this transition atomically).
3. Prepend the returned record to the in-memory `exportJobs` state immediately, so the history list updates without a full refetch.

**Pros**: Simple causal ordering (record exists only when export succeeded). No reconciliation needed. No orphaned `pending` records from aborted exports.

**Cons**: If the API call fails after a successful export, the job is silently unrecorded. Acceptable at this tier.

---

### Option B — Record before export (optimistic)

1. Call `POST /api/export-jobs` with `status: 'pending'` before generating the file.
2. On success, call `PATCH /api/export-jobs/[id]` to set `status: 'completed'`.
3. On failure, call `PATCH /api/export-jobs/[id]` to set `status: 'failed'`.

**Pros**: More complete audit trail including failed attempts.

**Cons**: Requires a `PATCH /api/export-jobs/[id]` route that does not yet exist. Doubles API round-trips. `pending` records from interrupted sessions pollute the history. Adds complexity with no meaningful user benefit at this scope.

---

### Option C — localStorage only (no DB)

Store export history in Zustand (localStorage). No API involved.

**Pros**: Zero backend work.

**Cons**: History is device-local, lost on browser data clear, and defeats the purpose of the existing `export_jobs` table. Directly contradicts the architecture principle that all persistent data lives in the API. Ruled out.

---

### Recommendation

**Option A** is the correct approach. It matches the existing `createExportJob` service behavior (which already performs the `pending → completed` transition atomically server-side), requires no new backend routes, and produces a clean history of only successful exports. The partial implementation already present in `useExport.ts` (the `api.exportJobs.create(...)` call in `handleExport`) confirms this was always the intended design.

---

## 5. Design

### 5.1 Current State — What Exists

The backend stack is complete and operational:

| Layer | File | Status |
|---|---|---|
| DB schema | `export_jobs` table (SQLite/Neon) | Exists |
| Repository | `src/server/repositories/export-job.repository.ts` | Exists — `findAll`, `findById`, `create`, `updateStatus` |
| Service | `src/server/services/export-job.service.ts` | Exists — `listExportJobs`, `createExportJob` (marks completed atomically) |
| API route | `src/app/api/export-jobs/route.ts` | Exists — `GET` and `POST` handlers |
| API client | `src/lib/api/client.ts` → `api.exportJobs.list()` / `api.exportJobs.create()` | Exists |
| Contracts | `src/lib/api/contracts.ts` → `ExportJobResponse`, `ExportJobListResponse` | Exists |
| Hook wiring | `src/features/export/useExport.ts` — partial: calls `api.exportJobs.create` and loads history | Partially implemented — see gap analysis below |

The export page (`src/app/export/page.tsx`) consumes `useExport()` but **does not render the `exportJobs` / `jobsLoading` values** that the hook already exposes. The history section is missing from the page.

### 5.2 Gap Analysis

Reviewing `useExport.ts` against the spec requirements reveals the following gaps:

| Gap | Detail |
|---|---|
| `filename` not sent to API | `api.exportJobs.create(...)` call omits `filename`. The service auto-generates a placeholder (`export-{id}.{format}`). The actual filename (with date tag) is available via `buildFilename()` at call time. |
| History not rendered | `exportJobs` and `jobsLoading` are returned by the hook but never used in the page or any component. |
| Re-export not implemented | No mechanism exists to restore form state from a history record and re-trigger export. |
| History capped at API default | `GET /api/export-jobs` returns all records (`ORDER BY created_at DESC`) with no limit. The client must cap at 20. |
| `scope` value mismatch | The Zod schema uses `'current' | 'all' | 'range'`; the hook uses `'current' | 'all' | 'range'` as `ExportScope`. These are consistent — no fix needed. |
| No empty state component | The history section does not exist yet; an empty state must be included. |

### 5.3 Backend Changes

#### `POST /api/export-jobs` — payload extension

The existing `createExportJobSchema` in `src/lib/api/validation.ts`:

```ts
export const createExportJobSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'pdf']),
  scope: z.enum(['current', 'all', 'range']),
  filters: z.string().optional(),
  options: z.string().optional(),
  recordCount: z.number().int().min(0).optional().default(0),
});
```

Add `filename` as an optional field:

```ts
filename: z.string().max(255).optional(),
```

Update `createExportJob` in `export-job.service.ts` to pass `filename` into `repo.updateStatus` instead of the auto-generated placeholder. The service currently generates `export-{id}.{format}` as a fallback; the client-supplied filename should take precedence when present.

No changes are needed to the repository or API route handler.

#### `GET /api/export-jobs` — no change

The route already returns all jobs sorted `DESC`. The 20-item cap is enforced client-side.

### 5.4 Hook Changes (`useExport.ts`)

#### Fix `api.exportJobs.create` call

The call currently at line 189–199 sends `format`, `scope`, `filters`, and `recordCount`. Update it to also send `filename`:

```ts
const jobResult = await api.exportJobs.create({
  format,
  scope,
  filters: scope === 'range' ? JSON.stringify({ startDate, endDate }) : undefined,
  filename: buildFilename(format === 'xlsx' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv'),
  recordCount: scopedTransactions.length,
});
```

Note: `buildFilename` already exists in the hook; this is the same filename used for the actual download.

#### Add `reExport(job: ExportJobResponse)` callback

This function restores form state from a history record and calls `handleExport`. It must:

1. Set `format` from `job.format` (cast to `ExportFormat`).
2. Set `scope` from `job.scope` (cast to `ExportScope`).
3. If `job.filters` is non-null and `job.scope === 'range'`, parse the JSON string and restore `startDate` and `endDate`.
4. Call `handleExport()` after state has been applied.

Because React state updates are asynchronous, the re-export must use a `useEffect`-or-callback pattern to ensure state is committed before `handleExport` fires. A clean pattern is to introduce a `pendingReExport` ref that is cleared inside a `useEffect` that watches the restored state fields and calls `handleExport`.

Expose `reExport` in `UseExportReturn`.

#### History capping

In the state setter and the initial load `useEffect`, slice the jobs array to 20 before storing:

```ts
setExportJobs((result.data?.jobs ?? []).slice(0, 20));
```

Apply the same slice when prepending the new job after a successful export.

#### Updated `UseExportReturn` interface additions

```ts
reExport: (job: ExportJobResponse) => void;
```

(`exportJobs` and `jobsLoading` are already declared in the existing interface.)

### 5.5 New Components

#### `ExportHistoryList`

**File**: `src/features/export/ExportHistoryList.tsx`

**Props**:

```ts
interface ExportHistoryListProps {
  jobs: ExportJobResponse[];
  loading: boolean;
  onReExport: (job: ExportJobResponse) => void;
}
```

**Behavior**:

- Shows a section heading (`t(locale, 'exportHistory')`).
- When `loading` is `true`: render a skeleton list (3 rows using `Skeleton` from shadcn/ui).
- When `loading` is `false` and `jobs.length === 0`: render `EmptyState` with `FileX` icon and `t(locale, 'noExportHistory')`.
- When jobs are present: render a `motion.ul` with `staggerList` / `staggerListItem` variants containing one `ExportHistoryItem` per job.

#### `ExportHistoryItem`

**File**: `src/features/export/ExportHistoryItem.tsx`

**Props**:

```ts
interface ExportHistoryItemProps {
  job: ExportJobResponse;
  onReExport: (job: ExportJobResponse) => void;
}
```

**Layout** (mobile-first, single row on sm+):

```
[ FORMAT BADGE ] [ scope + date range ]   [ record count ]   [ exported on ]   [ Re-export button ]
```

- **Format badge**: `CSV` / `XLSX` / `PDF` as a colored pill. CSV → blue (`bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300`), XLSX → emerald, PDF → amber. Text is uppercase.
- **Scope + date range**: Derived from `job.scope` and `job.filters`.
  - `'current'` scope: display `t(locale, 'thisMonth')` (or infer month/year from `job.createdAt` if desired — keep simple, show scope label only).
  - `'all'` scope: display the equivalent of "All Data" / "Semua Data".
  - `'range'` scope: parse `job.filters` JSON (`{ startDate, dateTo }`) and display `startDate – dateTo`. If parsing fails, display "Custom Range".
- **Record count**: `{job.recordCount} {t(locale, 'recordsExported')}` — use `JetBrains Mono` class for the number portion.
- **Exported on**: `job.completedAt ?? job.createdAt` formatted with `date-fns` `format(parseISO(...), 'dd MMM yyyy, HH:mm')`. Label: `t(locale, 'exportedOn')`.
- **Re-export button**: `<Button variant="ghost" size="sm">` with a `RotateCcw` icon from `lucide-react` and label `t(locale, 'reExport')`. `whileTap={tapScale}` from `motion.ts`.

**Skeleton state**: Rendered by `ExportHistoryList` using shadcn `Skeleton` at appropriate widths — not inside `ExportHistoryItem` itself.

### 5.6 Export Page Changes (`src/app/export/page.tsx`)

Add a new section below the existing `ExportActionBar` motion item:

```tsx
{/* Export History */}
<motion.div variants={staggerItem}>
  <ExportHistoryList
    jobs={exportJobs}
    loading={jobsLoading}
    onReExport={reExport}
  />
</motion.div>
```

Destructure `exportJobs`, `jobsLoading`, and `reExport` from the `useExport()` call.

The existing `max-w-2xl` content width is retained. The history list fits naturally within this width.

### 5.7 API Client Extension

Add `filename` to the `api.exportJobs.create` call signature in `src/lib/api/client.ts`:

```ts
create(data: {
  format: string;
  scope: string;
  filters?: string;
  options?: string;
  filename?: string;   // <-- add this
  recordCount?: number;
}) {
  return fetchApi<ExportJobResponse>('/export-jobs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
},
```

### 5.8 Data Flow Diagram

```
User clicks Export
      │
      ▼
useExport.handleExport()
  ├─ Generate file + trigger browser download  ──► Success
  │                                                    │
  │                                                    ▼
  │                                         api.exportJobs.create({
  │                                           format, scope, filters,
  │                                           filename, recordCount
  │                                         })
  │                                                    │
  │                                                    ▼
  │                                         Prepend to exportJobs state
  │                                         (capped at 20)
  │
  └─ Export throws ──────────────────────────► setExportError, no API call

Page load
      │
      ▼
useExport useEffect (initialized = true)
  └─ api.exportJobs.list()
       └─ setExportJobs(jobs.slice(0, 20))
            └─ ExportHistoryList renders

User clicks Re-export on a history item
      │
      ▼
reExport(job)
  ├─ setFormat(job.format)
  ├─ setScope(job.scope)
  ├─ if range: setStartDate / setEndDate from job.filters
  └─ trigger handleExport() after state commit
```

---

## 6. i18n Keys

The following keys must be added to both `TranslationKeys` (type definition) and the translation dictionaries in `src/lib/i18n.ts`.

| Key | English | Bahasa Indonesia |
|---|---|---|
| `exportHistory` | `Export History` | `Riwayat Ekspor` |
| `reExport` | `Re-export` | `Ekspor Ulang` |
| `exportedOn` | `Exported on` | `Diekspor pada` |
| `recordsExported` | `records` | `data` |
| `noExportHistory` | `No exports yet` | `Belum ada ekspor` |
| `noExportHistoryDesc` | `Your export history will appear here` | `Riwayat ekspor Anda akan muncul di sini` |
| `allData` | `All Data` | `Semua Data` |
| `customRange` | `Custom Range` | `Rentang Khusus` |

Notes:
- `recordsExported` is intentionally short for inline use: `"142 records"` / `"142 data"`.
- `noExportHistoryDesc` is used as the description prop on `EmptyState`.
- `allData` and `customRange` are scope display labels inside `ExportHistoryItem`.
- Indonesian strings are 20–30% longer on average; verify layout at 320px viewport width.

---

## 7. Testing

### Unit / Integration Tests (Vitest)

**File**: `src/server/services/export-job.service.test.ts` (new file, or extend the existing test suite if one exists)

| Test | Description |
|---|---|
| `createExportJob — stores format, scope, filters, filename, recordCount` | POST body with all fields; assert returned record matches inputs and `status === 'completed'`. |
| `createExportJob — filename defaults to auto-generated when omitted` | POST body without `filename`; assert `filename` matches `export-{id}.{format}` pattern. |
| `listExportJobs — returns records sorted by created_at DESC` | Insert 3 records with different timestamps; assert order. |
| `createExportJob — validates format enum` | Pass `format: 'docx'`; assert `VALIDATION_ERROR`. |
| `createExportJob — validates scope enum` | Pass `scope: 'weekly'`; assert `VALIDATION_ERROR`. |

### Component / Hook Tests

| Test | Description |
|---|---|
| `useExport — calls api.exportJobs.create after successful export` | Mock `exportCSV` and `api.exportJobs.create`; trigger `handleExport`; assert `create` was called with correct shape. |
| `useExport — does not call api.exportJobs.create when export throws` | Mock `exportCSV` to throw; assert `create` not called. |
| `useExport — reExport restores scope and triggers handleExport` | Call `reExport({ format: 'pdf', scope: 'range', filters: '{"startDate":"2026-01-01","endDate":"2026-01-31"}', ... })`; assert state matches and `handleExport` fires. |
| `ExportHistoryList — renders skeleton when loading` | Pass `loading={true}`; assert skeleton elements present. |
| `ExportHistoryList — renders empty state when jobs is empty` | Pass `loading={false}` and `jobs={[]}`; assert empty state text visible. |
| `ExportHistoryList — renders one item per job` | Pass 3 jobs; assert 3 `ExportHistoryItem` elements rendered. |
| `ExportHistoryItem — Re-export button calls onReExport with job` | Click Re-export; assert `onReExport` was called with the correct job object. |
| `ExportHistoryItem — parses range filters correctly` | Job with `scope: 'range'` and `filters: '{"startDate":"2026-01-01","endDate":"2026-03-31"}'`; assert date range string rendered. |

### Manual QA Checklist

- [ ] Export a CSV → history entry appears immediately below the form with correct format badge, scope, record count, and timestamp.
- [ ] Export an XLSX → history entry appears with XLSX badge.
- [ ] Export a PDF → history entry appears with PDF badge.
- [ ] Export with custom date range → history entry shows the date range string.
- [ ] Export with "All Data" scope → history entry shows the scope label (not a date range).
- [ ] Click Re-export on a past CSV entry → form resets to CSV + original scope, file downloads again immediately.
- [ ] Click Re-export on a past range entry → `startDate` and `endDate` are restored in the scope selector.
- [ ] Hard-refresh the page → history is fetched from the API; previously exported jobs remain visible.
- [ ] Make 21+ exports → only 20 entries appear in the history list.
- [ ] No exports yet → empty state renders with icon and description.
- [ ] Mobile (375px) → history list is readable; Re-export button does not overflow.
- [ ] Dark mode → format badges, text, and separators render correctly.
- [ ] Indonesian locale → all strings display in Bahasa Indonesia; no visible overflow at 375px.
- [ ] Slow network simulation → `jobsLoading` skeleton shows for the history section while jobs fetch; skeleton does not block the export form.

---

## 8. Edge Cases and Risks

### Export fails mid-generation

The `api.exportJobs.create(...)` call is inside the `try` block but runs only after all format-specific calls (`exportCSV`, `exportExcel`, `exportPDF`) have completed without throwing. If any generation step throws, execution jumps to the `catch` block and the API call is never made. This is correct behavior — no failed jobs should appear in the history.

### API call fails after successful export

If `api.exportJobs.create(...)` fails (network error, server 500), the export file has already been downloaded. The failure is caught by the outer `try/catch` and sets `exportError`. This produces an unfortunate UX where the file downloaded but an error message appears. Mitigation: separate the job recording into its own inner try/catch so that a recording failure does not surface as a user-visible export error. The toast should say the export succeeded; job recording failure should be silent (or a console.warn).

```ts
// Wrap the API call in its own inner try/catch
try {
  const jobResult = await api.exportJobs.create({ ... });
  if (jobResult.data) {
    setExportJobs((prev) => [jobResult.data!, ...prev].slice(0, 20));
  }
} catch {
  // Silent — file already downloaded
  console.warn('[ExportJobs] Failed to record export job');
}
```

### Re-export with custom date range

`job.filters` is stored as a JSON string. The parsing must be defensive:

```ts
let startDate = '';
let endDate = '';
try {
  if (job.filters) {
    const parsed = JSON.parse(job.filters) as { startDate?: string; endDate?: string };
    startDate = parsed.startDate ?? '';
    endDate = parsed.endDate ?? '';
  }
} catch {
  // Malformed JSON — silently fall through to default empty state
}
```

If parsing fails, the date range inputs are left blank. The user can manually adjust before the re-export triggers.

### Re-export with `'current'` scope

`'current'` scope uses the Zustand-selected month/year, not any stored date. When a user re-exports a `'current'` job from a previous month, the re-export will use the **currently selected** month, not the month from when the original export was created. This is acceptable and expected behavior — the history stores the scope type, not the specific month. A note in the `ExportHistoryItem` tooltip or UI is not required for this tier, but could be added later.

### Re-export triggering before state commits

React state setters are asynchronous. Calling `setFormat(...)`, `setScope(...)`, then immediately calling `handleExport()` in the same function body will use **stale state** for the export. The correct fix is a `pendingReExport` ref pattern:

```ts
const pendingReExportRef = useRef(false);

const reExport = useCallback((job: ExportJobResponse) => {
  setFormat(job.format as ExportFormat);
  setScope(job.scope as ExportScope);
  if (job.scope === 'range' && job.filters) {
    try {
      const f = JSON.parse(job.filters);
      setStartDate(f.startDate ?? '');
      setEndDate(f.endDate ?? '');
    } catch { /* ignore */ }
  }
  pendingReExportRef.current = true;
}, []);

useEffect(() => {
  if (pendingReExportRef.current) {
    pendingReExportRef.current = false;
    void handleExport();
  }
}, [format, scope, startDate, endDate, handleExport]);
```

This ensures `handleExport` fires only after all state has been applied.

### Very long history (hundreds of jobs)

`GET /api/export-jobs` returns all records. For a power user with 200+ exports, this is a large payload that will be sliced to 20 client-side anyway. As a future improvement, add `?limit=20` query param support to the API route. For this tier, the slice-on-client approach is acceptable.

### Filename mismatch between generated file and stored record

`buildFilename` uses the current `scope`, `month`, `year`, `startDate`, and `endDate` at the time of the call. The filename sent to the API and the filename used for the download are computed from the same call, so they will always match. No risk.

### Scope value mapping

The `ExportScope` type uses `'current' | 'all' | 'range'`. The DB schema comment lists `'current-month' | 'all' | 'custom'` — these are the original placeholder values from the table definition, not the values used in practice. The Zod schema enforces `'current' | 'all' | 'range'`. The spec uses the Zod-validated values throughout. The DB schema comment is misleading and can be updated in a future housekeeping pass.

---

## 9. File Change Summary

| File | Change Type | Description |
|---|---|---|
| `src/lib/api/validation.ts` | Modify | Add `filename: z.string().max(255).optional()` to `createExportJobSchema` |
| `src/server/services/export-job.service.ts` | Modify | Pass `parsed.data.filename` to `repo.updateStatus` when present |
| `src/lib/api/client.ts` | Modify | Add `filename?: string` to `api.exportJobs.create` data param |
| `src/lib/i18n.ts` | Modify | Add 7 new translation keys to `TranslationKeys` type and both EN/ID dictionaries |
| `src/features/export/useExport.ts` | Modify | Fix API call (add `filename`), add `reExport` callback, add cap at 20, inner try/catch for recording |
| `src/features/export/ExportHistoryList.tsx` | New | History section component with skeleton, empty state, and stagger list |
| `src/features/export/ExportHistoryItem.tsx` | New | Individual history row with format badge, scope, count, date, and Re-export button |
| `src/app/export/page.tsx` | Modify | Destructure `exportJobs`, `jobsLoading`, `reExport`; add `ExportHistoryList` section |

---

## 10. Self-Review Checklist

- [x] Backend changes are minimal and additive — no breaking changes to existing contracts.
- [x] The `POST /api/export-jobs` call is correctly placed after file generation succeeds, not before.
- [x] The recording failure is silently isolated so a failed API call does not surface as a broken export.
- [x] The re-export state restoration accounts for async React state updates via a ref-based pending trigger.
- [x] All user-facing strings have both EN and ID translations with no hardcoded text.
- [x] Indonesian strings are 20–40% longer — overflow risk is called out in the QA checklist.
- [x] Animation uses `staggerList` / `staggerListItem` from `src/lib/motion.ts`; no inline animation configs.
- [x] `tapScale` is applied to the Re-export button for press feedback.
- [x] Loading state is handled (skeleton), empty state is handled (EmptyState + icon), error state is noted.
- [x] No spreadsheet UX introduced — the history is a card list, not a table with editable cells.
- [x] No `window.confirm()` used — there are no destructive actions in this feature.
- [x] No raw localStorage — history comes from the REST API; Zustand is not used for job data.
- [x] Dark mode styling is accounted for in format badge color definitions.
- [x] The 20-item cap avoids unbounded list rendering for heavy users.
- [x] `ExportScope` and `ExportFormat` type casts in `reExport` are safe given the Zod-validated DB values.
- [x] `buildFilename` is called with the correct extension for each format (csv → 'csv', xlsx → 'xlsx', pdf → 'pdf').
- [x] `date-fns` is already a dependency — no new packages required.
- [x] `RotateCcw` is available in `lucide-react` — no new icon library required.
- [x] All new components follow one-component-per-file convention.
- [x] Props interfaces are named `{ComponentName}Props` and declared at the top of each file.

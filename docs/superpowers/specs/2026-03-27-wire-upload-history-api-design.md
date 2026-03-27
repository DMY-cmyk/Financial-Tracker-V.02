---
feature: Wire Upload History to API
type: spec
date: 2026-03-27
status: draft
tier: 1
---

# Wire Upload History to API — Design Spec

## Overview

The upload page uses Tesseract.js for client-side OCR of receipts. After extraction, the results show temporarily in the UI but are never saved. On page reload, all upload history is gone. The `uploads` table and `/api/uploads` routes exist but are not called from the frontend. This feature wires the OCR flow to persist upload records, enabling upload history display and preventing data loss.

## Goals

- Every receipt scan creates an upload record in the database
- Upload status is tracked through the full lifecycle (processing → extracted/failed)
- Extracted transaction data is stored per upload
- An upload history list is shown on the upload page
- Past extractions can be re-reviewed without re-scanning

## Non-Goals

- No server-side OCR (keep Tesseract.js client-side)
- No storing the actual image file in the database (too large for SQLite)
- No cloud image storage
- No bulk re-processing of past uploads

## Current State Analysis

**DB schema:**
```sql
uploads (id, filename, file_size, mime_type, status, extracted_data, created_at, updated_at)
-- status: 'pending' | 'processing' | 'extracted' | 'failed'
-- extracted_data: JSON string with parsed fields
```

**Existing API (unused by frontend):**
- `GET /api/uploads` — list all uploads
- `POST /api/uploads` — create record `{ filename, fileSize, mimeType }`
- `PATCH /api/uploads/[id]` — update `{ status, extractedData }`

**Current OCR flow (client-side only):**
1. User drops image → `useUpload()` triggers Tesseract.js
2. Raw text → parsed for amount, date, description, merchant
3. Fields shown in `OcrPreview` for confirmation
4. User confirms → `POST /api/transactions` creates transaction
5. Nothing about the upload is saved

## Approaches

### Option A — Persist on scan start, update on completion (Recommended)
Call `POST /api/uploads` when file is dropped (status: `processing`). Call `PATCH` when OCR completes (status: `extracted`) or fails (status: `failed`).

**Pros:** Accurate status tracking, even partial records (failed scans) are tracked.
**Cons:** Slightly more API calls.

### Option B — Persist only on extraction success
Only `POST /api/uploads` after OCR produces valid data, with `status: 'extracted'` and `extracted_data` all in one call.

**Pros:** Fewer records, only successful extractions saved.
**Cons:** Loses visibility into failed scans; less accurate history.

### Option C — Persist only on user confirmation
Record only when user confirms and creates a transaction.

**Cons:** Doesn't capture the "I scanned but didn't create a transaction" case. Not useful for history.

**Recommendation: Option A.** Records every scan attempt with accurate status tracking.

## Design

### Updated OCR Flow

```
User drops file
  → useUpload: call POST /api/uploads { filename, fileSize, mimeType }
  → Store uploadId in hook state
  → Start Tesseract.js OCR
  → On OCR complete:
      if success → PATCH /api/uploads/{ uploadId } { status: 'extracted', extractedData: JSON.stringify(parsed) }
      if error   → PATCH /api/uploads/{ uploadId } { status: 'failed' }
  → Show OcrPreview as today

User confirms transaction
  → POST /api/transactions (existing flow, unchanged)
  → Optionally: PATCH /api/uploads/{ uploadId } { status: 'confirmed', linkedTransactionId } — optional enhancement
```

### Extracted Data Shape (stored as JSON in `extracted_data`)

```typescript
interface ExtractedReceiptData {
  description: string | null
  amount: number | null
  date: string | null      // ISO date string
  merchant: string | null
  rawText: string | null   // First 500 chars of raw OCR (for debugging)
  confidence: number | null // 0-100
}
```

Store only parsed fields + first 500 chars of raw text (privacy consideration: don't store full receipt text indefinitely).

### Hook Updates (`src/features/upload/useUpload.ts`)

Add to hook state:
```typescript
uploadId: string | null      // current upload record ID
```

Add API calls at appropriate lifecycle points:
```typescript
// On file accept:
const { data } = await api.uploads.create({ filename, fileSize, mimeType })
setUploadId(data.id)

// After Tesseract completes:
await api.uploads.update(uploadId, { status: 'extracted', extractedData })

// On Tesseract error:
await api.uploads.update(uploadId, { status: 'failed' })
```

### New Component: `UploadHistoryList`

Location: `src/features/upload/UploadHistoryList.tsx`

```tsx
// Renders below the dropzone on the upload page
// Fetches GET /api/uploads on mount
// Shows: filename, date, status badge, extracted amount (if any), [Re-view] button
// Empty state: "No receipts scanned yet"
// Paginate at 20 items
```

### New Hook: `useUploadHistory`

Location: `src/features/upload/useUploadHistory.ts`

Fetches `GET /api/uploads`, returns `{ uploads, isLoading, error }`.

### API Client additions

```typescript
uploads: {
  create: (data: { filename, fileSize, mimeType }) => POST /api/uploads
  update: (id: string, data: { status?, extractedData? }) => PATCH /api/uploads/[id]
  list: () => GET /api/uploads
}
```

### Upload Page Updates (`src/app/upload/page.tsx`)

Add `<UploadHistoryList />` section below the dropzone/OCR preview.

## i18n Keys

| Key | EN | ID |
|-----|----|----|
| `uploadHistory` | "Upload History" | "Riwayat Unggahan" |
| `noUploadHistory` | "No receipts scanned yet" | "Belum ada struk yang dipindai" |
| `scanDate` | "Scanned" | "Dipindai" |
| `extractedAmount` | "Extracted Amount" | "Jumlah Terdeteksi" |
| `reView` | "Re-view" | "Lihat Lagi" |
| `scanFailed` | "Scan failed" | "Pemindaian gagal" |
| `scanProcessing` | "Processing..." | "Memproses..." |

## Testing

- `POST /api/uploads` creates record with correct fields
- `PATCH /api/uploads/[id]` updates status and extracted_data
- `GET /api/uploads` returns sorted list (newest first)
- `useUpload` hook calls `api.uploads.create` on file drop
- `useUpload` hook calls `api.uploads.update` after OCR success/failure

## Edge Cases & Risks

| Risk | Mitigation |
|------|-----------|
| PATCH fails after OCR (network error) | Upload record stuck at 'processing'; acceptable — it's historical data, not critical state |
| Many old upload records | Paginate at 20, show "Load more" button |
| `extracted_data` contains sensitive info | Store only parsed fields + 500-char raw snippet, not full OCR text |
| Bulk upload tab (multiple files) | Each file gets its own upload record; `useBulkImport` updated separately |
| uploadId lost if component unmounts between create and OCR complete | Store uploadId in ref (not state) so it persists through re-renders |

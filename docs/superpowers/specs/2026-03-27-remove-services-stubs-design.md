---
feature: Remove Old services.ts Stubs
type: spec
date: 2026-03-27
status: draft
tier: 4
---

# Remove Old services.ts Stubs — Design Spec

## Overview

`src/lib/services.ts` is a legacy file containing 4 stub async functions and 3 placeholder interface types — all with hardcoded mock returns and simulated `setTimeout` delays. A codebase-wide search finds **zero active importers** — nothing in `src/` currently imports from this file. All stubs have real equivalents in the typed API client (`src/lib/api/client.ts`) and type contracts (`src/lib/api/contracts.ts`). This is pure dead code. Deleting it removes confusion and eliminates the risk of future code accidentally using stubs instead of real API calls.

## Goals

- Delete `src/lib/services.ts` entirely
- Confirm zero broken imports after deletion
- Verify typecheck, lint, and build pass

## Non-Goals

- No behavior changes — this is purely dead code removal
- No migration of functionality (all equivalents already exist elsewhere)

## Current State Analysis

### What `src/lib/services.ts` contains (105 lines)

Based on agent research, the file contains:

**Stub functions:**
| Stub | What it does | Real equivalent |
|------|-------------|----------------|
| `fetchDashboardStats()` | Returns hardcoded mock dashboard data after 500ms delay | `api.dashboard.summary()` in `client.ts` |
| `saveTransaction(tx)` | Returns `{ success: true }` after 300ms | `api.transactions.create()` in `client.ts` |
| `deleteTransactionRemote(id)` | Returns `{ success: true }` after 200ms | `api.transactions.delete()` in `client.ts` |
| `createExportJob(params)` | Returns mock export job after 400ms | `api.exportJobs.create()` in `client.ts` |
| `processReceiptOcr(file)` | Returns hardcoded OCR data after 1500ms | Real Tesseract.js implementation in `useUpload.ts` |

**Placeholder interfaces:**
| Interface | Real equivalent |
|-----------|----------------|
| `DashboardStats` | `DashboardSummary` in `types.ts` |
| `ExportJob` | `ExportJobResponse` in `contracts.ts` |
| `OcrResponse` | `OcrData` type in `OcrPreview.tsx` or `useUpload.ts` |

### Active importers
**Zero.** A comprehensive search for:
- `from '@/lib/services'`
- `from '../lib/services'`
- `from './services'`
- Each exported symbol name (`DashboardStats`, `ExportJob`, `OcrResponse`, `fetchDashboardStats`, `saveTransaction`, `deleteTransactionRemote`, `createExportJob`, `processReceiptOcr`)

...found **no results** in any file under `src/`. The file is completely orphaned.

## Removal Steps

1. **Verify** by searching one more time for any remaining references:
   ```
   grep -r "services" src/ --include="*.ts" --include="*.tsx" | grep -v "services.ts" | grep "lib/services"
   ```
   Expected: zero results.

2. **Delete** `src/lib/services.ts`

3. **Run verification:**
   ```bash
   npm run typecheck   # should pass with zero errors
   npm run lint        # should pass
   npm run build       # should pass
   ```

4. **Commit** with message: "chore: remove dead services.ts stub file"

## Risk Assessment

**Risk level: Very low.**

- Zero active importers confirmed by agent research
- All exported symbols have real equivalents in use
- TypeScript strict mode will catch any missed references at compile time
- The deletion cannot break any runtime behavior since nothing calls these stubs

**The only risk:** If a file outside `src/` (e.g., in `test/` or `__tests__/`) imports from services.ts. Run the search across the full project, not just `src/`.

## Testing

Run the full preflight after deletion:
```bash
npm run preflight   # format check + typecheck + lint + build
npm run test        # vitest suite — all 312+ tests should still pass
```

No new tests needed. This is a deletion with zero behavior change.

## Why This Matters

Dead code is a maintenance liability:
- Future developers may see `services.ts` and think it's the intended API boundary, wasting time understanding stubs
- If accidentally imported, stubs return fake data silently — a hard-to-debug category of bug
- Each file in the codebase costs cognitive load; orphaned files cost the most

Deleting it now, while it's confirmed unused, is the right time.

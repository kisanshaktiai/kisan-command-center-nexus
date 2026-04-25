# NDVI Codebase Audit & Cleanup Plan

## Findings (verified against live DB)

### Production NDVI pipeline (the one actually in use)
Three cron jobs run on the Supabase project and feed all NDVI data. **None live in this admin codebase.**

| Cron job | Schedule | Calls function |
|---|---|---|
| `weekly-ndvi-auto-sync` | `0 2 * * 1` (weekly Mon 02:00) | `weekly-ndvi-sync` |
| `mark-agricultural-tiles-every-5min` | `*/5 * * * *` | `mark-agricultural-tiles` |
| `proactive-evaluator-cron` | `*/15 5-21 * * *` | `proactive-evaluator` |

### Data activity (last 14 days)
| Table | Rows | Last write | Written by |
|---|---|---|---|
| `ndvi_data` | 2,060 | **2026-04-25** (today) | `weekly-ndvi-sync` (sentinel-2, 215 rows / 14d) |
| `ndvi_processing_logs` | 6,477 | **2026-04-25** | `weekly-ndvi-sync` |
| `ndvi_request_queue` | 20 | **2026-03-08** (failed) | this admin codebase — last 3 entries all `status=failed` ("Land not found") |
| `ndvi_micro_tiles` | 3 | 2025-12-16 | stale |
| `satellite_tiles` | 16 | 2025-12-01 | `mark-agricultural-tiles` |
| `satellite_imagery` | 0 | never | dead |
| `satellite_api_usage` | 0 | never | dead |

### Admin-codebase NDVI edge functions — verdict
| Function | Used? | Evidence |
|---|---|---|
| `batch-calculate-ndvi` | NO | not in any cron, no callers |
| `calculate-ndvi` | NO | not in any cron, no callers |
| `fetch-land-ndvi` | NO | only called from `LandNdviApiService` (admin UI tester), never automatically |
| `fetch-s2-ndvi` | NO | replaced by external `weekly-ndvi-sync`; even has `index-old.ts.bak` |
| `ndvi-data-process` | NO | unreferenced |
| `process-ndvi-highres` | NO | unreferenced |
| `sync-ndvi-complete` | NO | superseded by `weekly-ndvi-sync` |
| `mark-agricultural-tiles` | **YES** | active cron every 5 min — KEEP |

The only admin-codebase NDVI write attempts (via `landNdviService.queueBatchRequest` → `ndvi_request_queue`) all failed in March and haven't been retried since.

### Frontend NDVI surface
All NDVI UI pages/components in `src/components/ndvi/` and `src/pages/super-admin/NdviDataStatus.tsx` are pure read-only viewers of the tables that the external pipeline writes. They are **fine to keep** as monitoring dashboards, but their write paths (`SyncNdviDialog`, `BulkNdviScheduler`, `landNdviService.queueBatchRequest`) hit dead/dying functions and should be removed or rewired to a no-op + "managed by external pipeline" notice.

## Recommendation: Delete dead NDVI edge functions + write paths

### Step 1 — Delete unused edge functions (frees 6 of the 99 edge-function slots)
Delete from codebase **and** from Supabase deployment:
- `supabase/functions/batch-calculate-ndvi/`
- `supabase/functions/calculate-ndvi/`
- `supabase/functions/fetch-land-ndvi/`
- `supabase/functions/fetch-s2-ndvi/`
- `supabase/functions/ndvi-data-process/`
- `supabase/functions/process-ndvi-highres/`
- `supabase/functions/sync-ndvi-complete/`

Keep: `mark-agricultural-tiles` (active cron) and `_shared/ndvi-*` helpers only if `mark-agricultural-tiles` imports them (will verify; otherwise delete the helpers too).

### Step 2 — Remove dead frontend write paths
- Delete `src/services/landNdviService.ts` (`queueBatchRequest` writes to dead queue).
- Delete `src/services/api/LandNdviApiService.ts` (calls deleted `fetch-land-ndvi`).
- Delete `src/components/ndvi/SyncNdviDialog.tsx` and `BulkNdviScheduler.tsx` (UI for dead functions).
- Strip references from `src/pages/super-admin/NdviDataStatus.tsx` and `src/components/ndvi/index.ts`.
- Keep read-only viewers: `LandNdviCard`, `NdviApiDashboard`, `ApiCostMonitor`, `TileCacheMetrics`, `useLandNdvi` (read hooks).

### Step 3 — Add a banner on the NDVI admin page
Show "NDVI ingestion is handled by the external `weekly-ndvi-sync` cron job. This page is read-only." so future devs don't try to wire admin triggers again.

### Step 4 — Optional cleanup of dead tables
After Step 1–3, these tables receive zero writes and can be dropped in a future migration (NOT in this plan, will confirm with you separately):
- `satellite_imagery` (0 rows ever)
- `satellite_api_usage` (0 rows ever)
- `ndvi_micro_tiles` (3 rows, last write Dec 2025)
- `ndvi_request_queue` (only failed entries, only from the about-to-be-deleted code)

## What this gives you
- **6 freed edge function slots** (out of 99 limit).
- Zero risk to live NDVI data (verified — production cron untouched).
- Removes the "NDVI broken in production" confusion from the earlier audit: it isn't broken, the admin code just points at non-canonical functions.
- Smaller, clearer admin codebase.

## Out of scope (will ask separately)
- Dropping the dead tables.
- Touching `mark-agricultural-tiles`, `weekly-ndvi-sync`, or `proactive-evaluator`.

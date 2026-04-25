## NDVI Data Audit + Admin Analytics Enhancement

### A. NDVI Tables — Inventory & Audit (current state)

| Table | Rows | Status | Verdict |
|---|---|---|---|
| `ndvi_data` | **2,060** (31 lands, 1 tenant, 19-Dec-2025 → 25-Apr-2026) | **LIVE** — primary time-series | Source of truth |
| `ndvi_full_view` | view (NDVI + lands + farmers + village/district/state) | **LIVE** | Use for all dashboards |
| `ndvi_processing_logs` | 6,477 rows, current | LIVE | Pipeline observability |
| `land_tile_mapping` | 3 rows | LIVE | Land ↔ MGRS tile linkage |
| `mgrs_tiles` | 638 rows | Reference | India MGRS catalog |
| `tile_marking_progress` | 54,430 | LIVE | mark-agricultural-tiles output |
| `ndvi_micro_tiles` | 3 rows (1 day only) | **STALE** | Legacy land-first attempt |
| `ndvi_request_queue` | 20 rows, last March | **STALE** | Old admin trigger |
| `ndvi_coverage_stats` | 1 row | Empty | Unused |
| `ndvi_spatial_analytics`, `satellite_imagery`, `satellite_alerts`, `satellite_api_usage`, `copernicus_api_calls`, `land_tile_coverage`, `land_tile_intersections`, `staging_mgrs_tiles*` | 0 rows | **DEAD** | Skip in UI |
| `satellite_tiles` | 20 rows | Pipeline metadata | Keep, low priority |

### B. Data Quality Findings (critical)

1. **Forward-fill artifact** — Sentinel-2 revisits every ~5 days, but rows exist for every day with the same NDVI repeated (e.g. 0.239 for 7 consecutive days, 0.243 for 3). The worker fills gaps with the latest acquisition. ✅ Acceptable, but **dashboards must distinguish "actual acquisition" vs "carry-forward"** — group by distinct `ndvi_value` per land or by `created_at` to find true revisit dates.
2. **NDVI range** — All 2,060 values fall within [0, 0.58] — **no negative or out-of-range values**. ✅ Valid.
3. **Cloud cover is 100% NULL** in `ndvi_data` even though the worker filters by it. ⚠️ Show as "N/A" in UI; do not chart.
4. **Sparse extended indices**: `evi_value` 0/2060, `savi_value` 0/2060, `mcari_value` 0/2060, `soil_moisture` 0/2060. Only `ndwi_value` is populated (2060/2060). ⚠️ UI should only show NDVI + NDWI.
5. **Dual mean columns**: `ndvi_value` (single value) populated for all rows, `mean_ndvi/min_ndvi/max_ndvi` only for 17 rows. Use `ndvi_value` as primary; treat min/max/std as optional.
6. **Single tenant in production data** (`a2a59533-…`). Multi-tenant filter still required for safety.
7. **Crop joining gap**: `crop_history` is empty (0 rows). Crop context must come from `lands.current_crop` / `crop_schedules` (25 rows). `crop_health_assessments` and `crop_growth_analysis` are empty.

### C. Pipeline Audit

```text
[cron] → mark-agricultural-tiles → tile_marking_progress + land_tile_mapping
                                 ↓
[cron] → ndvi-data-process → tile-fetch-worker.onrender.com (FastAPI v1.8.2)
                           ↓
                    writes ndvi_data + ndvi_processing_logs
```

- ✅ Healthy: worker responds 200, processed 4 tiles per recent invocation, logs flowing.
- ⚠️ Render free tier sleeps; existing "Wake Service" UI handles this.
- ⚠️ No alerts when a land has not received NDVI for >7 days.
- ⚠️ No SLA dashboard for coverage % (lands with NDVI / total lands).

### D. RLS / Multi-Tenant Safety

All NDVI tables have RLS ON. `ndvi_data` SELECT uses `has_tenant_access(tenant_id)` — ✅ safe. The new pages will rely on this and never fetch with service_role.

---

### Implementation Plan (no breaking changes)

All work uses **existing tables only**. No schema changes, no migrations, no edge function deletions.

#### Step 1 — Refactor `NdviDataStatus.tsx` into a tabbed workspace
Keep current pipeline controls, restructure into 4 tabs:

1. **Pipeline** (current view: tile fetch, mark tiles, sync controls, satellite_tiles table)
2. **Coverage** (NEW)
3. **Tenant Analytics** (NEW)
4. **Land Explorer** (NEW)

#### Step 2 — Tab: Coverage & Health
KPIs from `ndvi_data` + `lands`:
- Lands with NDVI in last 7 / 14 / 30 days
- Coverage % (lands_with_recent_ndvi / total_lands per tenant)
- Stale lands list (no NDVI > 14 days)
- Pipeline success rate (from `ndvi_processing_logs`)
- Daily ingestion volume (last 30 days line chart)

#### Step 3 — Tab: Tenant Analytics (uses `ndvi_full_view`)
- **Region heatmap table**: state → district → village rollup with avg NDVI, land count, health classification
- **Crop-wise NDVI** (joins `lands.current_crop`): bar chart of avg NDVI per crop, sorted
- **Health distribution**: donut — Good (>0.5), Moderate (0.3–0.5), Poor (<0.3)
- **Seasonal trend**: weekly average NDVI line, last 16 weeks, broken out by crop
- **Low-NDVI alert zones**: districts where avg NDVI < 0.25 (sortable table)

Health bands documented inline; computed client-side from existing `ndvi_value`. No new tables.

#### Step 4 — Tab: Land Explorer (drill-down, farmer-level)
- Searchable land list (name, farmer, village, district, area, latest NDVI, days-since-update)
- Click → side panel with:
  - Land timeline chart (NDVI over time, deduped to true acquisition dates by detecting `ndvi_value` change)
  - 30-day moving average overlay
  - Anomaly markers (z-score > 2 vs land's own history)
  - Health badge + simple advisory rules (irrigation if NDVI dropped >0.1 in 14 days; nutrient stress if persistently <0.3 mid-season; harvest-ready if peaked then declining)
  - Crop context from `lands.current_crop` + matching `crop_schedules` row

#### Step 5 — AI Insights edge function (`ndvi-insights`)
New edge function (verify_jwt_token=true) using **Lovable AI Gateway** (`google/gemini-3-flash-preview` default). Two modes:
- `mode: "land"` → input land_id, function fetches last 90 days from `ndvi_full_view` + `lands` + `crop_schedules` + latest `weather_current` + `soil_health`, returns structured JSON (summary, trend, stress_signals[], advisory[]).
- `mode: "tenant"` → input tenant_id, returns regional summary + risk zones + crop performance ranking + farmer segments.

Strict tool-calling JSON schema — no free-text hallucination. Numeric values cited from data only. Insights cached in component state per session.

UI: "Generate AI Report" button on Land Explorer panel and on Tenant Analytics tab. Results render in a styled report card with copy/export-to-markdown.

#### Step 6 — Performance
- All queries use `ndvi_full_view` already-joined view (one round trip).
- React Query with 60s staleTime; dedupe per tab.
- For Tenant Analytics rollups: fetch with `.select('date, ndvi_value, district, state, current_crop, land_id')` once, aggregate client-side (≤2,060 rows today, fine until ~50k).
- Add a memoized "true-acquisition only" filter that drops carry-forward duplicates per land.

#### Step 7 — Files Touched
- **Edit**: `src/pages/super-admin/NdviDataStatus.tsx` (wrap existing UI in Tabs)
- **New**: `src/components/ndvi/CoverageTab.tsx`
- **New**: `src/components/ndvi/TenantAnalyticsTab.tsx`
- **New**: `src/components/ndvi/LandExplorerTab.tsx`
- **New**: `src/components/ndvi/AIInsightCard.tsx`
- **New**: `src/hooks/useNdviAnalytics.ts` (one hook, multiple selectors)
- **New**: `src/lib/ndvi/health.ts` (band logic, advisory rules, dedupe)
- **New**: `supabase/functions/ndvi-insights/index.ts` + register in `supabase/config.toml`
- **No changes** to existing pipeline functions, no DB migrations, no deletions.

### Production Readiness Score (NDVI subsystem today): **62 / 100**
- Ingestion: 85 ✅ • Quality: 70 ⚠️ (carry-forward, missing cloud) • Coverage visibility: 30 ❌ • Analytics: 25 ❌ • AI insights: 0 ❌ • RLS: 95 ✅
- After this plan: projected **88 / 100**.

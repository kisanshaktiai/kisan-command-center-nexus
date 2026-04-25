# SaaS Admin Enhancement Plan — 6 Critical Features

Goal: ship six missing super-admin capabilities additively. Zero changes to existing tenant/farmer-facing flows. All new work lives in **new files / new routes / new tabs**, reusing existing tables wherever possible.

---

## Existing Foundations (verified, will be reused)

| Need | Existing asset |
|---|---|
| Audit trail | `admin_audit_logs`, `audit_logs`, `security_audit_log` |
| AI cost data | `ai_model_metrics` (model_name, tenant_id, query_count, resource_usage jsonb), `ai_chat_analytics` |
| Kill-switch | `feature_flags` + `tenant_feature_overrides` + `EnhancedFeatureService` |
| Tenant signals | `usage_analytics`, `subscription_usage_logs`, `system_health_metrics`, `tenants` |
| Roles | `user_roles` + `has_role()` (super_admin) |

i18n: **no `react-i18next` installed** — admin strings are hardcoded. Will add as a foundational piece.

---

## 1. Tenant Health Score

Composite 0–100 score per tenant, computed server-side, surfaced in tenant cards + new dashboard column.

**Formula (weights configurable later):**
```
score = 0.30 * activeFarmerRatio   // active_farmers_30d / total_farmers
      + 0.25 * apiActivityScore    // log-scaled api calls last 7d vs plan baseline
      + 0.20 * (1 - churnRisk)     // churnRisk derived below
      + 0.15 * subscriptionHealth  // active/trial=1, past_due=0.4, cancelled=0
      + 0.10 * supportLoadInverse  // 1 - min(open_tickets/10, 1) — gracefully 1 when no tickets table
```
churnRisk = weighted blend of: 0 active farmers in 14d, declining 4-week API trend, payment failure flag.

**Implementation**
- New SQL view `tenant_health_scores` (tenant_id, score, breakdown jsonb, computed_at) refreshed by:
  - new edge function `compute-tenant-health` (cron-friendly, idempotent UPSERT into a new `tenant_health_snapshots` table — keeps history for trend sparkline).
- New hook `useTenantHealth(tenantId?)`.
- New component `TenantHealthBadge` (color band: ≥80 green, 60–79 amber, <60 red) added to `TenantCardRefactored` and tenant table row — additive prop, optional rendering.
- New tab "Health" inside existing TenantDetailsModal showing breakdown bars + 30-day sparkline.

---

## 2. AI Cost Dashboard (per tenant per model)

New super-admin page `/super-admin/ai-costs` (added to nav, does not replace anything).

**Data path**
- Source: `ai_model_metrics` (already populated). Cost derived via a new `ai_model_pricing` table:
  ```
  ai_model_pricing(model_name pk, input_cost_per_1k numeric, output_cost_per_1k numeric, currency text default 'USD', effective_from date)
  ```
  Seeded with current Lovable AI Gateway models (gemini-flash, gemini-pro, gpt-5, etc.).
- Cost = (tokens from `resource_usage` jsonb) × pricing. Fallback: query_count × flat estimate when token data missing.

**UI**
- KPIs: total spend (today / 7d / 30d), top 5 tenants by spend, top 5 models.
- Pivot table: rows = tenants, columns = models, cells = cost + query count, sortable.
- Line chart: daily spend trend, stacked by model.
- CSV export.
- Reuses `recharts` + existing card components.

---

## 3. Per-Tenant Kill-Switch (Feature Flag Override)

Already 80% built (`tenant_feature_overrides` + `EnhancedFeatureService.createTenantOverride`). Missing: a focused operator UI.

**New component** `TenantKillSwitchPanel` mounted as a tab inside TenantDetailsModal:
- Lists all active feature flags with current effective state for the tenant (global → override).
- Toggle creates/updates/deletes a `tenant_feature_overrides` row.
- Required `override_reason` field (validated, min 10 chars).
- Optional `expires_at` datetime picker (auto-revert).
- Every toggle writes to `admin_audit_logs` with action `feature_kill_switch_toggled`.
- Bulk "Disable all non-essential features" emergency button (disables flags tagged `non-essential`).

No schema change needed beyond adding a `tags` filter helper in service layer.

---

## 4. Impersonation ("Login as tenant admin") with Audit Trail

**Security model** — never share passwords or service-role keys with the browser.

New tables:
```
impersonation_sessions (
  id uuid pk, super_admin_id uuid, target_user_id uuid, target_tenant_id uuid,
  reason text not null, started_at timestamptz default now(),
  ended_at timestamptz, ip inet, user_agent text,
  scope text default 'read_only' check (scope in ('read_only','full'))
)
```

**Flow**
1. Super-admin clicks "Impersonate" on a tenant user → modal requires reason + scope.
2. Edge function `start-impersonation` (verify_jwt true, requires `super_admin` role):
   - Inserts `impersonation_sessions` row.
   - Issues a short-lived (15 min) signed JWT containing `act` claim (`{ sub: target_user_id, act: { sub: super_admin_id }, scope }`) using `SUPABASE_JWT_SECRET`.
   - Writes `admin_audit_logs` entry.
3. Frontend stores token in **memory only** (not localStorage), opens new tab to tenant app with `?impersonation=<token>`.
4. App-side: an `ImpersonationBanner` (sticky red bar, "You are viewing as X — End session") + interceptor adds `X-Impersonation: true` header.
5. Edge function `end-impersonation` closes the row and revokes via short TTL natural expiry.
6. RLS: add helper `is_impersonating()` reading JWT `act` claim; sensitive write policies can deny when `scope='read_only'`.

All actions performed during a session are tagged in `audit_logs.metadata.impersonation_session_id`.

---

## 5. Backup / Restore Status UI

Read-only operator dashboard at `/super-admin/backups`. Supabase manages the actual backups; we surface state + manual snapshot logging.

**New table**
```
backup_events (
  id uuid pk, kind text check (kind in ('daily_pitr','manual_snapshot','restore','export')),
  status text check (status in ('running','succeeded','failed')),
  size_bytes bigint, started_at timestamptz, finished_at timestamptz,
  triggered_by uuid, notes text, metadata jsonb
)
```

**Sources**
- Daily edge function `backup-status-sync` calls Supabase Management API (`/v1/projects/{ref}/database/backups`) using new secret `SUPABASE_MANAGEMENT_TOKEN`, upserts rows.
- Manual "Trigger logical export" button → edge function streams a `pg_dump`-style JSON export of selected tables to Supabase Storage bucket `admin-backups` (private, super-admin only).

**UI**
- Timeline of recent backup events with status icons.
- Storage usage gauge.
- Last successful backup age (red if >26h).
- Restore is **link-out only** to Supabase dashboard (we never automate restores) — clear warning copy.

---

## 6. i18n Readiness for Admin Panel

**Bootstrap**
- Add deps: `react-i18next`, `i18next`, `i18next-browser-languagedetector`.
- New `src/i18n/index.ts` initializing with namespaces: `common`, `admin`, `tenants`, `billing`, `monitoring`, `ndvi`, `ai`.
- Locale files under `src/i18n/locales/{en,hi,mr}/*.json` (English authoritative; Hindi + Marathi stubs since farmer app already uses these).
- Mount `<I18nextProvider>` in `App.tsx` above existing providers.

**Migration strategy (non-breaking)**
- Add `useTranslation()` to admin pages incrementally; each PR migrates one feature folder.
- Phase 1 in this plan: wire infrastructure + migrate the 6 NEW screens above + nav labels + super-admin page titles.
- Existing hardcoded strings keep working untouched; an ESLint rule `i18next/no-literal-string` added in **warn** mode, scoped to `src/pages/super-admin/**` and `src/components/super-admin/**`, so future code is guided without breaking the build.
- Add a language switcher in the super-admin top bar (defaults to browser language, falls back to `en`).

---

## Technical Section

**New files**
- `src/i18n/index.ts`, `src/i18n/locales/{en,hi,mr}/{common,admin,tenants,billing,monitoring,ai}.json`
- `src/components/super-admin/LanguageSwitcher.tsx`
- `src/components/tenant/TenantHealthBadge.tsx`, `src/components/tenant/tabs/TenantHealthTab.tsx`
- `src/hooks/useTenantHealth.ts`
- `src/pages/super-admin/AiCostDashboard.tsx` + `src/components/ai-costs/{KpiCards,ModelTenantPivot,SpendTrendChart,ExportCsvButton}.tsx`
- `src/hooks/useAiCosts.ts`, `src/services/AiCostService.ts`
- `src/components/tenant/tabs/TenantKillSwitchPanel.tsx`
- `src/components/super-admin/ImpersonateButton.tsx`, `src/components/impersonation/ImpersonationBanner.tsx`, `src/hooks/useImpersonation.ts`
- `src/pages/super-admin/BackupStatus.tsx` + `src/components/backups/{BackupTimeline,StorageGauge,LastBackupCard}.tsx`
- `src/hooks/useBackupEvents.ts`

**New edge functions**
- `compute-tenant-health` (scheduled hourly)
- `start-impersonation`, `end-impersonation`
- `backup-status-sync` (scheduled daily), `trigger-logical-export`

**New tables / migrations**
- `tenant_health_snapshots`, view `tenant_health_scores`
- `ai_model_pricing` (+ seed)
- `impersonation_sessions` + RLS + `is_impersonating()` helper
- `backup_events` + private storage bucket `admin-backups`

**New secrets required**
- `SUPABASE_MANAGEMENT_TOKEN` (for backup status)
- `LOVABLE_API_KEY` already present for any AI cost projections — no new AI secret needed.

**Routing & nav**
- Append to `nav-items.tsx` (super-admin section): "AI Costs", "Backups". No existing routes touched.

**Non-breaking guarantees**
- All schema additions are new tables — zero ALTERs on existing tables.
- All UI additions are new routes/tabs/components — existing pages render identically.
- Feature gating: each new page is wrapped in `RequireRole('super_admin')`.
- i18n is opt-in per component; missing keys fall back to the literal English string.

## Rollout Order
1. i18n bootstrap (infra only, no visible change).
2. Tenant Health Score (table + edge fn + badge).
3. AI Cost Dashboard.
4. Kill-Switch panel.
5. Backup Status UI.
6. Impersonation (last — highest security review surface).

Each step is independently shippable and reversible.

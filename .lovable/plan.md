
# KisanShaktiAI — Decision Brain Governance & Rules Audit Platform

## Guiding Constraints

- **Zero breakage**: no edits to `decision_rules`, edge functions, or rule-execution paths. All new work is **additive** (new tables, views, RPCs, UI routes under `/super-admin/governance/*`).
- **Rules remain authoritative**, AI only explains. Governance layer observes, validates, versions, and approves — never bypasses execution.
- **Multi-tenant + super-admin scoped** via existing `is_super_admin()` / RLS patterns.
- Reuse existing i18n, RBAC, `SuperAdminSidebar`, `AdminAuthWrapper`.

Current scale snapshot: 823 decision_rules, 138 hypotheses, 1,888 observations, 34 proactive rules, 37 ai_decision_log rows, 0 advisory_audit_log rows, plus 10+ legacy `_backup_*` / `_mapping_*` clutter tables.

---

## Phase 1 — Forensic Audit (read-only, output = reports)

Build a single edge function `governance-audit` that runs a battery of read-only SQL probes and writes results into a new `governance_audit_reports` table. Surfaced in UI as **"Schema & Integrity Reports"** dashboard.

Reports generated:

1. **Schema Risk** — tables without PK, nullable critical columns, oversized rows (`decision_rules` 160 cols).
2. **FK Integrity Risk** — orphan scans for `rule_product_mapping.rule_id`, `hypothesis_rule_mapping.*`, `intent_observation_mapping.*`, `observation_translations.observation_id`, `rule_performance.rule_id`.
3. **JSON Validation Risk** — `conditions_json` shape variance, missing required keys, unknown operators.
4. **Translation Coverage** — % of `observation_master` / `decision_rules` narration with hi/mr/en variants.
5. **Rule Conflict Matrix** — same `(crop_code, stage, observation, plant_part)` with divergent `action_type` or contradicting `bee_toxicity` / `ipm_level`.
6. **Hypothesis Contradiction** — overlapping causes without discriminator observations.
7. **Proactive Rule Duplication** — fuzzy match on `proactive_rules` triggers.
8. **Backup Clutter** — list of `*_backup_*`, `*_mapping_*_v2/final/ultimate` tables for archival recommendation.
9. **Multi-Tenant Isolation Audit** — tables missing `tenant_id` or RLS.
10. **Telemetry Gap** — rules with zero `rule_performance` rows in 30d.
11. **Hallucination Risk** — `ai_chat_messages` / `ai_decision_log` rows whose `rules_applied` is empty but contain product/chemical names.
12. **Edge Function Validation** — cross-check `ai_decision_log.rule_id` against active `decision_rules`.

No schema mutation. No data deletion. Reports are timestamped snapshots.

---

## Phase 2 — New Governance Schema (additive only)

New tables (all RLS-locked to `is_super_admin()` + agronomist role):

| Table | Purpose |
|---|---|
| `governance_audit_reports` | Snapshot store for Phase 1 reports |
| `rule_versions` | Immutable JSONB snapshot of every `decision_rules` row on change (filled by trigger on `decision_rules` — INSERT/UPDATE only, no schema change to source) |
| `rule_approval_workflow` | `draft → review → approved → published → deprecated`, reviewer_id, agronomist_notes |
| `rule_conflict_matrix` | Persisted output of conflict probe with severity |
| `rule_explainability` | Symbolic reasoning metadata: why-fired, why-not-fired, evidence path |
| `rule_validation_reports` | Per-rule AI + agronomist validation verdicts |
| `rule_json_schema_registry` | Versioned JSON schemas for `conditions_json` shapes |
| `rule_execution_trace` | Sampled execution snapshots (sampling rate config) |
| `hallucination_detection_logs` | Flagged AI outputs with rule-coverage diff |
| `translation_validation_reports` | Per-string i18n quality + reviewer sign-off |
| `regulatory_compliance_audit` | Banned/PHI/REI violations detected |
| `rule_lineage` | Parent→child rule evolution graph |
| `rule_dependency_graph` | Rule→hypothesis→observation→product edges |
| `orphan_integrity_alerts` | Persisted orphan findings |
| `edge_function_validation_logs` | Edge-fn execution audit hooks |
| `agronomist_review_queue` | Work queue for review dashboard |

New SQL functions:
- `governance.snapshot_rule_version(rule_id)` — manual + trigger-callable
- `governance.detect_conflicts(rule_id)` — returns conflict set
- `governance.simulate_rule(rule_id, sample_input jsonb)` — pure function, no side-effects
- `governance.compute_rule_lineage(rule_id)` — recursive CTE

Triggers attached only to `decision_rules`, `hypothesis_master`, `observation_master` for **versioning** (AFTER INSERT/UPDATE → write to `*_versions`). Non-blocking, no business logic change.

---

## Phase 3 — Frontend Governance Console

New route group `/super-admin/governance/*` added to `SuperAdmin.tsx` and `SuperAdminSidebar.tsx`. All strings via `react-i18next` (`governance.json` namespace).

### A. Decision Rules Console (`/governance/rules`)
- Server-side table over `v_decision_rules_admin` with filters: crop, stage, observation, plant_part, ipm_level, bee_toxicity, regulatory_status, expert_approved, confidence range, language coverage.
- Row drawer: JSON inspector (Monaco), telemetry chart, conflict badges, lineage timeline, approval state.
- Actions: **Simulate**, **Request Review**, **Approve**, **Deprecate**, **Rollback to version**.

### B. Hypothesis Console (`/governance/hypotheses`)
- Contradiction graph (react-flow), discriminator-missing list, confidence editor, rule-linkage view.

### C. Observation & Intent Console (`/governance/observations`)
- Synonym/alias dedupe, multilingual phrase coverage, intent-routing tester (paste farmer phrase → see resolution).

### D. Safety & Regulatory Console (`/governance/safety`)
- Banned chemical search, PHI/REI matrix per crop, ETL threshold validator, weather-risk cross-check.

### E. AI Narration Validation (`/governance/narration`)
- Diff view: symbolic output vs AI narration vs `rules_applied`. Hallucination flag queue from `hallucination_detection_logs`.

### F. Reports Dashboard (`/governance/reports`)
- Cards for each Phase 1 report; trend lines; export CSV.

### G. Approval Queue (`/governance/queue`)
- Kanban: draft → review → approved → published.

### H. Simulation Sandbox (`/governance/simulate`)
- Form: pick crop/stage/observation/region → calls `governance.simulate_rule` + edge function in dry-run mode → shows fired rules, suppressed rules, narration.

UI primitives: shadcn cards/tables, react-flow for graphs, recharts for telemetry, Monaco for JSON. Mobile-first via existing Tailwind tokens.

---

## Phase 4 — AI-Assisted Rule Builder (`/governance/rules/new`)

Wizard form that:
1. Reads schema dynamically (crop/stage/observation enums via RPC).
2. Calls Lovable AI Gateway (Gemini default) to draft `conditions_json`, narration, translations, ETL link, product mapping, hypothesis link, confidence.
3. Runs **pre-save validators** (reused from Phase 2 functions): crop-stage compatibility, regulatory, PHI/REI, duplicate, conflict, missing translations.
4. Saves as `draft` in `rule_approval_workflow`; `decision_rules` only written on **publish** by an approver (preserves SSOT integrity).

Edge function: `governance-rule-assistant`.

---

## Phase 5 — Hardening Recommendations (deferred, surfaced as "Recommended Migrations" UI panel; not auto-applied)

- `NOT VALID` FK additions for `rule_product_mapping`, `hypothesis_rule_mapping`, `observation_translations`, etc.
- Move `*_backup_*` tables to `archive` schema.
- Materialized view `mv_active_decision_rules` refreshed every 10 min.
- `pg_trgm` GIN on observation aliases.
- Cron: nightly translation coverage, conflict scan, orphan scan, proactive-rule consolidation report.

Each recommendation is a one-click **"Generate migration draft"** that prepares SQL but **does not execute** — admin reviews before approval.

---

## Phase 6 — Security & Multi-Tenancy

- All governance tables RLS: super_admin full; agronomist role (new `app_role` value) read + workflow writes; tenant admins read-only on tenant-scoped advisory outcomes.
- Immutable audit: append-only triggers on `rule_versions`, `rule_approval_workflow`, `regulatory_compliance_audit` (BEFORE UPDATE/DELETE → RAISE).
- Use existing `impersonation_sessions` for any "act-as agronomist" review actions.

---

## Delivery Order

```text
M1  Phase 1 reports table + governance-audit edge fn + Reports dashboard
M2  Phase 2 schema (versions, workflow, lineage, conflict, explainability)
M3  Rules Console + Hypothesis Console (read + telemetry)
M4  Observation/Intent + Safety consoles
M5  Simulation sandbox + Approval queue + version rollback
M6  AI Rule Builder + Narration validation
M7  Hardening migration drafts panel + cron jobs
```

Each milestone is independently shippable, leaves edge-function execution untouched, and only **adds** capabilities to the existing platform.

---

## Out of Scope (explicit)

- No edits to `decision_rules` columns or existing edge functions.
- No deletion of backup/legacy tables (only flagged for review).
- No change to farmer-facing advisory pipeline.
- No replacement of current i18n keys; only new `governance.json` namespace added.

Approve to begin **M1**.

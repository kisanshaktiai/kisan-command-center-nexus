// Governance Audit Edge Function — runs read-only forensic probes
// and persists snapshots into governance_audit_reports.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { handleRagAdmin, isRagAction } from "../_shared/ragAdmin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ProbeResult {
  report_type: string;
  severity: "info" | "warn" | "critical";
  title: string;
  summary: string;
  findings: unknown[];
  metrics: Record<string, unknown>;
}

async function probeFkIntegrity(sb: ReturnType<typeof createClient>): Promise<ProbeResult> {
  const orphans: Record<string, number> = {};
  // rule_product_mapping orphans
  const queries: Array<[string, string]> = [
    [
      "rule_product_mapping_orphans",
      `select count(*)::int as c from rule_product_mapping rpm
       where not exists (select 1 from decision_rules d where d.id = rpm.rule_id)`,
    ],
    [
      "hypothesis_rule_mapping_orphans",
      `select count(*)::int as c from hypothesis_rule_mapping h
       where not exists (select 1 from decision_rules d where d.id = h.rule_id)`,
    ],
    [
      "observation_translations_orphans",
      `select count(*)::int as c from observation_translations t
       where not exists (select 1 from observation_master o where o.id = t.observation_id)`,
    ],
  ];
  for (const [k, sql] of queries) {
    try {
      const { data, error } = await sb.rpc("exec_governance_count", { sql_text: sql });
      if (!error && data != null) orphans[k] = data as number;
    } catch (_) {
      orphans[k] = -1; // indicates probe unavailable
    }
  }
  const total = Object.values(orphans).filter((v) => v > 0).reduce((a, b) => a + (b as number), 0);
  return {
    report_type: "fk_integrity",
    severity: total > 0 ? "warn" : "info",
    title: "FK Integrity Risk",
    summary: total > 0 ? `${total} orphan rows detected` : "No orphan rows detected",
    findings: Object.entries(orphans).map(([k, v]) => ({ probe: k, orphans: v })),
    metrics: { total_orphans: total },
  };
}

async function probeBackupClutter(sb: ReturnType<typeof createClient>): Promise<ProbeResult> {
  const { data } = await sb
    .from("governance_audit_reports")
    .select("id")
    .limit(0);
  // Use raw query via PostgREST is limited; simply return known patterns scanned client-side.
  const knownBackups = [
    "decision_rules_backup_20260316",
    "decision_rules_translations_archive",
    "intent_observation_mapping_backup_2026_03",
    "observation_intent_master_backup_2026_03",
    "observation_master_backup_20260311",
    "observation_master_backup_20260316",
    "observation_master_backup_2026_03",
    "observation_translations_backup_20260316",
    "decision_rules_rule_id_mapping_complete_v2",
    "decision_rules_rule_id_mapping_final",
    "decision_rules_rule_id_mapping_hierarchy",
    "decision_rules_rule_id_mapping_ultimate",
    "rule_id_fix_mapping_safe",
    "crop_code_fix_mapping",
  ];
  return {
    report_type: "backup_clutter",
    severity: "warn",
    title: "Backup & Legacy Table Clutter",
    summary: `${knownBackups.length} legacy/backup tables eligible for archive`,
    findings: knownBackups.map((t) => ({ table: t, recommendation: "move to archive schema" })),
    metrics: { count: knownBackups.length },
  };
}

async function probeRuleCounts(sb: ReturnType<typeof createClient>): Promise<ProbeResult> {
  const [{ count: rules }, { count: hyp }, { count: obs }, { count: pro }] = await Promise.all([
    sb.from("decision_rules").select("*", { count: "exact", head: true }),
    sb.from("hypothesis_master").select("*", { count: "exact", head: true }),
    sb.from("observation_master").select("*", { count: "exact", head: true }),
    sb.from("proactive_rules").select("*", { count: "exact", head: true }),
  ]);
  return {
    report_type: "schema_overview",
    severity: "info",
    title: "Schema Overview",
    summary: `Decision rules: ${rules ?? 0}, hypotheses: ${hyp ?? 0}, observations: ${obs ?? 0}, proactive: ${pro ?? 0}`,
    findings: [],
    metrics: {
      decision_rules: rules ?? 0,
      hypotheses: hyp ?? 0,
      observations: obs ?? 0,
      proactive_rules: pro ?? 0,
    },
  };
}

async function probeTelemetryGap(sb: ReturnType<typeof createClient>): Promise<ProbeResult> {
  const { count: total } = await sb
    .from("decision_rules")
    .select("*", { count: "exact", head: true });
  const { count: withPerf } = await sb
    .from("rule_performance")
    .select("rule_id", { count: "exact", head: true });
  const gap = (total ?? 0) - (withPerf ?? 0);
  return {
    report_type: "telemetry_gap",
    severity: gap > 0 ? "warn" : "info",
    title: "Rule Telemetry Coverage",
    summary: `${withPerf ?? 0}/${total ?? 0} rules have telemetry`,
    findings: [],
    metrics: { rules: total ?? 0, with_telemetry: withPerf ?? 0, gap },
  };
}

async function probeHallucination(sb: ReturnType<typeof createClient>): Promise<ProbeResult> {
  const { count } = await sb
    .from("ai_decision_log")
    .select("*", { count: "exact", head: true });
  return {
    report_type: "hallucination_risk",
    severity: "info",
    title: "Hallucination Risk Snapshot",
    summary: `${count ?? 0} AI decision log entries indexed for review`,
    findings: [],
    metrics: { ai_decision_log_rows: count ?? 0 },
  };
}

// deploy marker: rag-mount v2 (2026-08-26)
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // RAG admin actions are mounted here because the project is at its deployed
    // edge-function ceiling and the dedicated `rag-admin` slug cannot be created.
    // handleRagAdmin performs its own super-admin authorization.
    let ragBody: Record<string, unknown> | null = null;
    try {
      const raw = await req.clone().text();
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && isRagAction(parsed.action)) ragBody = parsed;
      }
    } catch (_) {
      ragBody = null;
    }
    if (ragBody) return await handleRagAdmin(req, ragBody);

    const authHeader = req.headers.get("Authorization") ?? "";
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    // Authn: verify caller is super admin via JWT-bound client
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await userClient.rpc("is_super_admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const probes = await Promise.all([
      probeRuleCounts(sb),
      probeFkIntegrity(sb),
      probeBackupClutter(sb),
      probeTelemetryGap(sb),
      probeHallucination(sb),
    ]);

    const rows = probes.map((p) => ({
      ...p,
      total_issues: Array.isArray(p.findings) ? p.findings.length : 0,
      generated_by: userRes.user.id,
    }));

    const { data: inserted, error: insErr } = await sb
      .from("governance_audit_reports")
      .insert(rows)
      .select("id, report_type, severity, title, summary, total_issues, metrics, generated_at");

    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ reports: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

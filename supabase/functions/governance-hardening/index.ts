// Governance Hardening — generates non-executable migration drafts.
// Drafts are inserted into governance_migration_drafts and reviewed by humans.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Draft {
  category: string;
  title: string;
  rationale: string;
  sql_draft: string;
  severity: "info" | "warn" | "critical";
  metadata?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Authn — caller must be super_admin
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await supabase.rpc("is_super_admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const drafts: Draft[] = [];

    // 1. Backup / clutter table archive recommendations
    const { data: backupTables } = await supabase
      .from("information_schema.tables" as any)
      .select("table_name")
      .eq("table_schema", "public");

    const candidates = (backupTables || [])
      .map((r: any) => r.table_name as string)
      .filter((n) => /(_backup_|_v2$|_final$|_ultimate$|_old$)/i.test(n));

    if (candidates.length) {
      drafts.push({
        category: "archive",
        title: `Move ${candidates.length} legacy tables to archive schema`,
        rationale:
          "Backup / versioned clone tables clutter the public schema and risk accidental writes. Move them to a dedicated `archive` schema.",
        severity: "info",
        metadata: { tables: candidates },
        sql_draft: [
          "CREATE SCHEMA IF NOT EXISTS archive;",
          ...candidates.map(
            (t) => `ALTER TABLE public."${t}" SET SCHEMA archive;`,
          ),
        ].join("\n"),
      });
    }

    // 2. Materialized view for active rules
    drafts.push({
      category: "performance",
      title: "Materialized view: mv_active_decision_rules",
      rationale:
        "Hot path queries scan all 800+ decision_rules. A 10-minute refreshed materialized view of active rules dramatically cuts read latency.",
      severity: "warn",
      sql_draft: `CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_active_decision_rules AS
SELECT * FROM public.decision_rules
WHERE COALESCE(is_active, true) = true
  AND COALESCE(expert_approved, false) = true;
CREATE UNIQUE INDEX IF NOT EXISTS mv_active_decision_rules_pk
  ON public.mv_active_decision_rules (id);
-- Schedule with pg_cron:
-- SELECT cron.schedule('refresh-mv-active-rules','*/10 * * * *',
--   $$REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_active_decision_rules;$$);`,
    });

    // 3. Trigram index for observation aliases
    drafts.push({
      category: "performance",
      title: "pg_trgm GIN index on observation_master.aliases",
      rationale:
        "Fuzzy matching on farmer phrases relies on aliases lookup. A trigram GIN index makes ILIKE / similarity queries ~100× faster.",
      severity: "info",
      sql_draft: `CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_observation_master_aliases_trgm
  ON public.observation_master USING GIN (aliases gin_trgm_ops);`,
    });

    // 4. Foreign key NOT VALID drafts for known orphan-prone tables
    drafts.push({
      category: "integrity",
      title: "NOT VALID FK additions for mapping tables",
      rationale:
        "Mapping tables currently allow orphan rows. Adding NOT VALID FKs enforces forward-going integrity without locking historical data.",
      severity: "warn",
      sql_draft: `ALTER TABLE public.rule_product_mapping
  ADD CONSTRAINT rule_product_mapping_rule_fk
  FOREIGN KEY (rule_id) REFERENCES public.decision_rules(id) NOT VALID;
ALTER TABLE public.hypothesis_rule_mapping
  ADD CONSTRAINT hypothesis_rule_mapping_rule_fk
  FOREIGN KEY (rule_id) REFERENCES public.decision_rules(id) NOT VALID;
ALTER TABLE public.observation_translations
  ADD CONSTRAINT observation_translations_obs_fk
  FOREIGN KEY (observation_id) REFERENCES public.observation_master(id) NOT VALID;`,
    });

    // 5. Cron: nightly translation coverage
    drafts.push({
      category: "automation",
      title: "Nightly translation coverage scan",
      rationale:
        "Tracks % of decision_rules / observations with hi/mr narration. Catches regressions early.",
      severity: "info",
      sql_draft: `SELECT cron.schedule(
  'governance-translation-coverage',
  '15 2 * * *',
  $$INSERT INTO public.governance_audit_reports (report_type, payload)
    SELECT 'translation_coverage',
           jsonb_build_object(
             'rules_total', count(*),
             'rules_hi', count(*) FILTER (WHERE narration_hi IS NOT NULL),
             'rules_mr', count(*) FILTER (WHERE narration_mr IS NOT NULL))
    FROM public.decision_rules;$$
);`,
    });

    // Insert drafts (skip duplicates by title within last 7d)
    const inserted: Draft[] = [];
    for (const d of drafts) {
      const { data: existing } = await supabase
        .from("governance_migration_drafts")
        .select("id")
        .eq("title", d.title)
        .eq("status", "pending")
        .gte(
          "created_at",
          new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
        )
        .maybeSingle();
      if (existing) continue;
      const { error } = await supabase
        .from("governance_migration_drafts")
        .insert(d);
      if (!error) inserted.push(d);
    }

    // Update cron registry heartbeat
    await supabase
      .from("governance_cron_jobs")
      .update({ last_run_at: new Date().toISOString(), last_status: "ok" })
      .eq("job_name", "governance-weekly-hardening");

    return new Response(
      JSON.stringify({
        ok: true,
        generated: drafts.length,
        new_drafts: inserted.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

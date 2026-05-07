import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function renderTemplate(tpl: string, vars: Record<string, any>) {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => {
    const v = vars?.[k];
    return v == null ? "" : String(v);
  });
}

function validateRequired(schema: any, vars: any): string[] {
  const missing: string[] = [];
  if (Array.isArray(schema)) {
    for (const f of schema) {
      if (f.required && (vars?.[f.key] == null || vars?.[f.key] === "")) {
        missing.push(f.key);
      }
    }
  }
  return missing;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);
    const { data: isAdmin } = await userClient.rpc("is_super_admin");
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body?.action ?? "draft";

    if (action === "draft") {
      const { template_key, template_id, variables = {}, persist = true } = body;
      let tplQ = adminClient.from("ai_prompt_templates").select("*").limit(1);
      if (template_id) tplQ = tplQ.eq("id", template_id);
      else if (template_key) tplQ = tplQ.eq("key", template_key);
      else return json({ error: "template_key or template_id required" }, 400);

      const { data: tplRows, error: tplErr } = await tplQ;
      if (tplErr || !tplRows?.length) return json({ error: "template not found" }, 404);
      const tpl = tplRows[0];
      if (!tpl.is_active) return json({ error: "template inactive" }, 400);

      const missing = validateRequired(tpl.variables_schema, variables);
      if (missing.length) return json({ error: "missing required variables", missing }, 400);

      const userPrompt = renderTemplate(tpl.user_prompt_template, variables);

      const tools = [{
        type: "function",
        function: {
          name: "emit_payload",
          description: `Return a payload for ${tpl.target_table}`,
          parameters: tpl.output_schema,
        },
      }];

      let aiResp: Response;
      try {
        aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: tpl.model,
            temperature: Number(tpl.temperature ?? 0.2),
            messages: [
              { role: "system", content: tpl.system_prompt },
              { role: "user", content: userPrompt },
            ],
            tools,
            tool_choice: { type: "function", function: { name: "emit_payload" } },
          }),
        });
      } catch (e) {
        return json({ error: "ai_gateway_unreachable", details: String(e) }, 502);
      }

      if (aiResp.status === 429) return json({ error: "rate_limited" }, 429);
      if (aiResp.status === 402) return json({ error: "credits_exhausted" }, 402);
      if (!aiResp.ok) {
        const t = await aiResp.text();
        const isModel = /model|not.*found|unsupported/i.test(t);
        return json({
          error: isModel ? "model_unavailable" : "ai_gateway_error",
          details: t,
          hint: isModel ? `Model "${tpl.model}" is not available on the gateway. Edit the template to use a supported model (e.g. google/gemini-3-flash-preview).` : undefined,
        }, 502);
      }

      const data = await aiResp.json();
      const call = data.choices?.[0]?.message?.tool_calls?.[0];
      let draft: any = null;
      try { draft = call ? JSON.parse(call.function.arguments) : null; } catch { /* ignore */ }
      if (!draft) return json({ error: "no_draft", raw: data }, 502);

      const warnings: string[] = [];
      const required = tpl.output_schema?.required ?? [];
      for (const f of required) {
        if (draft[f] == null || draft[f] === "") warnings.push(`Required field missing: ${f}`);
      }
      if (draft.narration && typeof draft.narration === "object") {
        if (!draft.narration.hi) warnings.push("Hindi narration missing");
        if (!draft.narration.mr) warnings.push("Marathi narration missing");
      }

      let duplicates: any[] = [];
      const dedupeKeys: string[] = Array.isArray(tpl.dedupe_keys) ? tpl.dedupe_keys : [];
      if (dedupeKeys.length && dedupeKeys.every(k => draft[k] != null)) {
        let q: any = adminClient.from(tpl.target_table).select("id").limit(5);
        for (const k of dedupeKeys) q = q.eq(k, draft[k]);
        const { data: dupes } = await q;
        duplicates = dupes ?? [];
        if (duplicates.length) warnings.push(`${duplicates.length} existing record(s) match dedupe keys`);
      }

      let runId: string | null = null;
      if (persist) {
        const { data: run } = await adminClient.from("ai_prompt_runs").insert({
          template_id: tpl.id,
          input_variables: variables,
          raw_output: draft,
          warnings,
          duplicates,
          status: "drafted",
          target_table: tpl.target_table,
          created_by: user.id,
        }).select("id").single();
        runId = run?.id ?? null;
      }

      return json({ draft, warnings, duplicates, template: tpl, run_id: runId });
    }

    if (action === "apply") {
      const { run_id, payload, mode } = body;
      if (!run_id) return json({ error: "run_id required" }, 400);
      const { data: run } = await adminClient.from("ai_prompt_runs").select("*").eq("id", run_id).single();
      if (!run) return json({ error: "run not found" }, 404);
      const { data: tpl } = await adminClient.from("ai_prompt_templates").select("*").eq("id", run.template_id).single();
      if (!tpl) return json({ error: "template not found" }, 404);

      const finalPayload = payload ?? run.raw_output;
      const useDirect = mode === "direct" || (mode !== "queue" && tpl.auto_apply);

      if (useDirect) {
        const { data: inserted, error: insErr } = await adminClient
          .from(tpl.target_table)
          .insert(finalPayload)
          .select("id")
          .single();
        if (insErr) {
          await adminClient.from("ai_prompt_runs").update({ status: "failed", error: insErr.message }).eq("id", run_id);
          return json({ error: "insert_failed", details: insErr.message }, 400);
        }
        await adminClient.from("ai_prompt_runs").update({
          status: "auto_applied",
          target_record_id: inserted.id,
          raw_output: finalPayload,
        }).eq("id", run_id);
        return json({ ok: true, mode: "direct", record_id: inserted.id });
      }

      const { data: wf, error: wfErr } = await adminClient.from("rule_approval_workflow").insert({
        state: "draft",
        submitted_by: user.id,
        submitted_at: new Date().toISOString(),
        proposed_payload: finalPayload,
        agronomist_notes: body.notes ?? null,
        metadata: { source: "ai_rule_builder", template_key: tpl.key, target_table: tpl.target_table, run_id },
      }).select("id").single();
      if (wfErr) return json({ error: "queue_failed", details: wfErr.message }, 400);

      await adminClient.from("ai_prompt_runs").update({
        status: "submitted",
        raw_output: finalPayload,
      }).eq("id", run_id);

      return json({ ok: true, mode: "queue", workflow_id: wf.id });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    console.error("governance-ai-builder error", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

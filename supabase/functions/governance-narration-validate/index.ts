import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callAIWithFallback } from "../_shared/aiChat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const JUDGE_SYSTEM = `You are an agricultural fact-checker. You receive AI-generated farmer-facing
narration and the JSON list of decision_rules that were actually fired. Determine whether the narration
contains hallucinations: chemical/product names, dosages, PHI/REI, banned-status claims, or actions
that are NOT grounded in the supplied rules. Respond ONLY via the tool call.`;

const TOOL = {
  type: "function",
  function: {
    name: "judge_narration",
    description: "Return a verdict on the narration grounding.",
    parameters: {
      type: "object",
      properties: {
        verdict: { type: "string", enum: ["clean", "suspect", "hallucinated"] },
        hallucination_score: { type: "number", minimum: 0, maximum: 1 },
        flagged_terms: { type: "array", items: { type: "string" } },
        reasoning: { type: "string" },
      },
      required: ["verdict", "hallucination_score", "flagged_terms", "reasoning"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await supabase.rpc("is_super_admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { ai_content, rules_applied, source_type, source_id, persist } = body ?? {};
    if (!ai_content || typeof ai_content !== "string") {
      return new Response(JSON.stringify({ error: "ai_content required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `AI narration:\n${ai_content}\n\nRules applied (JSON):\n${JSON.stringify(rules_applied ?? [], null, 2)}`;

    let judge: any = null;
    let provider = "none";
    let model = "none";
    try {
      const result = await callAIWithFallback({
        messages: [
          { role: "system", content: JUDGE_SYSTEM },
          { role: "user", content: userPrompt },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "judge_narration" } },
      });
      provider = result.provider;
      model = result.model;
      const call = result.data.choices?.[0]?.message?.tool_calls?.[0];
      try { judge = call ? JSON.parse(call.function.arguments) : null; } catch { /* ignore */ }
      if (!judge) {
        judge = {
          verdict: "suspect",
          hallucination_score: 0.5,
          flagged_terms: [],
          reasoning: "Judge returned no structured verdict; defaulting to suspect (fail-safe).",
        };
      }
    } catch (e) {
      // FAIL-SAFE: an unjudged narration is never "clean".
      console.error("ai judge failed", e);
      judge = {
        verdict: "suspect",
        hallucination_score: 0.5,
        flagged_terms: [],
        reasoning: `AI judging unavailable (fail-safe verdict): ${e instanceof Error ? e.message : String(e)}`,
      };
    }

    let logId: string | null = null;
    if (persist) {
      // Use service role for insert, since RLS forbids non-admin inserts; admins are fine here too via select policy.
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: row, error } = await admin
        .from("hallucination_detection_logs")
        .insert({
          source_type: source_type ?? "manual_validation",
          source_id: source_id ?? null,
          ai_content,
          rules_applied: rules_applied ?? [],
          flagged_terms: judge.flagged_terms ?? [],
          hallucination_score: judge.hallucination_score ?? 0,
          verdict: judge.verdict ?? "pending",
          judge_model: `${provider}/${model}`,
          judge_reasoning: judge.reasoning ?? null,
        })
        .select("id")
        .single();
      if (error) console.error("persist error", error);
      else logId = row?.id ?? null;
    }

    return new Response(JSON.stringify({ judge, log_id: logId, provider, model }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("narration-validate error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

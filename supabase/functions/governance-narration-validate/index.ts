import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

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

    const ai = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: JUDGE_SYSTEM },
          { role: "user", content: userPrompt },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "judge_narration" } },
      }),
    });

    if (ai.status === 429 || ai.status === 402) {
      return new Response(JSON.stringify({ error: ai.status === 429 ? "rate_limited" : "credits_exhausted" }), {
        status: ai.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!ai.ok) {
      const t = await ai.text();
      return new Response(JSON.stringify({ error: "ai_gateway_error", details: t }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await ai.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    let judge: any = null;
    try { judge = call ? JSON.parse(call.function.arguments) : null; } catch { /* ignore */ }
    if (!judge) {
      return new Response(JSON.stringify({ error: "no_verdict" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
          judge_model: "google/gemini-3-flash-preview",
          judge_reasoning: judge.reasoning ?? null,
        })
        .select("id")
        .single();
      if (error) console.error("persist error", error);
      else logId = row?.id ?? null;
    }

    return new Response(JSON.stringify({ judge, log_id: logId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("narration-validate error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

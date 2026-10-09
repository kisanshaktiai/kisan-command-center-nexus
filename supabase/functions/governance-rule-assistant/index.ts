import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callAIWithFallback } from "../_shared/aiChat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an agronomy rule architect for KisanShaktiAI.
Given a crop, stage, observation and free-text intent, draft a JSON proposal for a decision_rules row.
You MUST return strictly the tool call. Keep narration short, factual, multilingual (en/hi/mr).
Never invent banned chemicals. If unsure, leave fields null.`;

const TOOL = {
  type: "function",
  function: {
    name: "draft_decision_rule",
    description: "Return a draft decision_rules proposal.",
    parameters: {
      type: "object",
      properties: {
        crop_code: { type: "string" },
        stage: { type: "string" },
        observation: { type: "string" },
        plant_part: { type: "string" },
        action_type: { type: "string" },
        ipm_level: { type: "string", enum: ["cultural", "biological", "chemical", "monitoring"] },
        bee_toxicity: { type: "string", enum: ["none", "low", "moderate", "high", "unknown"] },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        conditions_json: { type: "object", additionalProperties: true },
        narration: {
          type: "object",
          properties: {
            en: { type: "string" },
            hi: { type: "string" },
            mr: { type: "string" },
          },
          required: ["en"],
        },
        rationale: { type: "string" },
      },
      required: ["crop_code", "stage", "observation", "narration", "rationale"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // ON HOLD: free-text AI rule drafting disabled pending evidence-citation redesign.
  return new Response(JSON.stringify({
    error: "disabled",
    reason: "Rule drafting via free-text AI is disabled pending evidence-citation redesign. Use the evidence-first authoring pipeline.",
  }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
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
    const { crop_code, stage, observation, plant_part, intent } = body ?? {};
    if (!crop_code || !stage || !observation) {
      return new Response(JSON.stringify({ error: "crop_code, stage, observation required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Crop: ${crop_code}
Stage: ${stage}
Observation: ${observation}
Plant part: ${plant_part ?? "n/a"}
Agronomist intent: ${intent ?? "draft a sensible default rule"}`;

    const { data } = await callAIWithFallback({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      tools: [TOOL],
      tool_choice: { type: "function", function: { name: "draft_decision_rule" } },
    });
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    let draft: any = null;
    try { draft = call ? JSON.parse(call.function.arguments) : null; } catch { /* ignore */ }
    if (!draft) {
      return new Response(JSON.stringify({ error: "no_draft", raw: data }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pre-save validators
    const warnings: string[] = [];
    if (!draft.narration?.hi) warnings.push("Hindi narration missing");
    if (!draft.narration?.mr) warnings.push("Marathi narration missing");
    if (draft.confidence == null) warnings.push("Confidence not set");
    if (!draft.conditions_json || Object.keys(draft.conditions_json).length === 0) {
      warnings.push("conditions_json empty");
    }

    // Duplicate detection
    const { data: dupes } = await supabase
      .from("decision_rules")
      .select("id, action_type, ipm_level")
      .eq("crop_code", draft.crop_code)
      .eq("stage", draft.stage)
      .eq("observation", draft.observation)
      .limit(5);
    if (dupes && dupes.length) warnings.push(`${dupes.length} rule(s) already match crop/stage/observation`);

    return new Response(JSON.stringify({ draft, warnings, duplicates: dupes ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rule-assistant error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

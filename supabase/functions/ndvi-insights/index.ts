import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const MODEL = "google/gemini-3-flash-preview";

interface LandPayload {
  mode: "land";
  land_id: string;
}
interface TenantPayload {
  mode: "tenant";
  tenant_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return json({ error: "LOVABLE_API_KEY missing" }, 500);
    }

    const body = (await req.json()) as LandPayload | TenantPayload;
    if (!body?.mode) return json({ error: "mode required" }, 400);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    let context: any;
    let toolName: string;
    let toolSchema: any;

    if (body.mode === "land") {
      if (!body.land_id) return json({ error: "land_id required" }, 400);
      context = await buildLandContext(supabase, body.land_id);
      toolName = "land_ndvi_report";
      toolSchema = LAND_SCHEMA;
    } else if (body.mode === "tenant") {
      if (!body.tenant_id) return json({ error: "tenant_id required" }, 400);
      context = await buildTenantContext(supabase, body.tenant_id);
      toolName = "tenant_ndvi_report";
      toolSchema = TENANT_SCHEMA;
    } else {
      return json({ error: "invalid mode" }, 400);
    }

    const systemPrompt =
      body.mode === "land"
        ? `You are an agronomy analyst. Generate a concise NDVI report for ONE farmer's land using ONLY the JSON data provided. Cite numeric NDVI values where relevant. Never invent data. If the series is too short or missing, say so. Keep advisory items practical (irrigation, nutrient, pest, harvest timing). Health bands: NDVI ≥ 0.5 good, 0.3–0.5 moderate, < 0.3 poor.`
        : `You are an agronomy analyst for a multi-tenant agritech platform. Generate a tenant-level NDVI report using ONLY the JSON data provided. Cite numbers. Identify low-NDVI districts as risk zones. Never invent data. Health bands: NDVI ≥ 0.5 good, 0.3–0.5 moderate, < 0.3 poor.`;

    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Data for ${body.mode}:\n\`\`\`json\n${JSON.stringify(context).slice(0, 30000)}\n\`\`\``,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: toolName,
                description: "Return the structured NDVI report.",
                parameters: toolSchema,
              },
            },
          ],
          tool_choice: { type: "function", function: { name: toolName } },
        }),
      }
    );

    if (!aiResp.ok) {
      const t = await aiResp.text();
      if (aiResp.status === 429) return json({ error: "Rate limited. Try again shortly." }, 429);
      if (aiResp.status === 402) return json({ error: "AI credits exhausted. Add credits in Lovable workspace." }, 402);
      console.error("AI gateway error", aiResp.status, t);
      return json({ error: "AI gateway failed" }, 502);
    }

    const ai = await aiResp.json();
    const call = ai?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) {
      return json({ error: "AI returned no structured output" }, 502);
    }

    const parsed = JSON.parse(call.function.arguments);
    return json({
      ...parsed,
      data_window: context.data_window,
    });
  } catch (e) {
    console.error("ndvi-insights error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function buildLandContext(supabase: any, landId: string) {
  const since = new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10);

  const [{ data: land }, { data: ndvi }, { data: schedule }, { data: weather }, { data: soil }] = await Promise.all([
    supabase.from("lands").select("id, name, current_crop, area_acres, tenant_id, farmer_id").eq("id", landId).maybeSingle(),
    supabase.from("ndvi_data").select("date, ndvi_value, ndwi_value, cloud_cover").eq("land_id", landId).gte("date", since).order("date"),
    supabase.from("crop_schedules").select("crop_name, stage_name, planned_start, planned_end").eq("land_id", landId).limit(20),
    supabase.from("weather_current").select("*").eq("land_id", landId).maybeSingle(),
    supabase.from("soil_health").select("*").eq("land_id", landId).maybeSingle(),
  ]);

  const acquisitions: any[] = [];
  let prev: number | null = null;
  for (const r of ndvi ?? []) {
    const v = r.ndvi_value == null ? null : Number(r.ndvi_value);
    if (acquisitions.length === 0 || v !== prev) {
      acquisitions.push({ date: r.date, ndvi: v, ndwi: r.ndwi_value });
      prev = v;
    }
  }

  return {
    data_window: `${since} → today`,
    land,
    crop_schedule: schedule ?? [],
    weather_current: weather ?? null,
    soil_health: soil ?? null,
    ndvi_acquisitions: acquisitions,
    ndvi_stats: stats(acquisitions.map((a) => a.ndvi).filter((v) => v != null)),
  };
}

async function buildTenantContext(supabase: any, tenantId: string) {
  const since = new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10);

  const [{ data: lands }, { data: ndvi }] = await Promise.all([
    supabase.from("lands").select("id, name, current_crop, district, state, area_acres").eq("tenant_id", tenantId).limit(2000),
    supabase.from("ndvi_data").select("land_id, date, ndvi_value").eq("tenant_id", tenantId).gte("date", since).limit(20000),
  ]);

  const latest = new Map<string, any>();
  (ndvi ?? []).forEach((r: any) => {
    const cur = latest.get(r.land_id);
    if (!cur || r.date > cur.date) latest.set(r.land_id, r);
  });

  const districtAgg: Record<string, { sum: number; n: number; state: string }> = {};
  const cropAgg: Record<string, { sum: number; n: number }> = {};
  (lands ?? []).forEach((l: any) => {
    const last = latest.get(l.id);
    if (!last || last.ndvi_value == null) return;
    const v = Number(last.ndvi_value);
    if (l.district) {
      const k = l.district;
      districtAgg[k] = districtAgg[k] ?? { sum: 0, n: 0, state: l.state ?? "" };
      districtAgg[k].sum += v;
      districtAgg[k].n += 1;
    }
    if (l.current_crop) {
      cropAgg[l.current_crop] = cropAgg[l.current_crop] ?? { sum: 0, n: 0 };
      cropAgg[l.current_crop].sum += v;
      cropAgg[l.current_crop].n += 1;
    }
  });

  return {
    data_window: `${since} → today`,
    total_lands: lands?.length ?? 0,
    lands_with_recent_ndvi: latest.size,
    by_district: Object.entries(districtAgg).map(([d, v]) => ({ district: d, state: v.state, avg_ndvi: +(v.sum / v.n).toFixed(3), lands: v.n })).sort((a, b) => a.avg_ndvi - b.avg_ndvi),
    by_crop: Object.entries(cropAgg).map(([c, v]) => ({ crop: c, avg_ndvi: +(v.sum / v.n).toFixed(3), lands: v.n })).sort((a, b) => b.avg_ndvi - a.avg_ndvi),
    overall_avg_ndvi: latest.size > 0 ? +(Array.from(latest.values()).reduce((s: number, r: any) => s + Number(r.ndvi_value || 0), 0) / latest.size).toFixed(3) : null,
  };
}

function stats(values: number[]) {
  if (!values.length) return null;
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: n,
    min: +sorted[0].toFixed(3),
    max: +sorted[n - 1].toFixed(3),
    mean: +mean.toFixed(3),
    latest: +values[values.length - 1].toFixed(3),
    delta_recent: n >= 2 ? +(values[n - 1] - values[n - 2]).toFixed(3) : null,
  };
}

const LAND_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "2-3 sentence overview citing latest NDVI." },
    trend: { type: "string", description: "Direction of NDVI over the window with numbers." },
    stress_signals: { type: "array", items: { type: "string" } },
    advisory: { type: "array", items: { type: "string" }, description: "Practical actions for the farmer." },
    notes: { type: "string", description: "Caveats about data sufficiency." },
  },
  required: ["summary", "trend", "advisory"],
  additionalProperties: false,
};

const TENANT_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    trend: { type: "string" },
    risk_zones: { type: "array", items: { type: "string" }, description: "Districts with low avg NDVI." },
    crop_performance: { type: "array", items: { type: "string" } },
    farmer_segments: { type: "array", items: { type: "string" } },
    advisory: { type: "array", items: { type: "string" } },
    notes: { type: "string" },
  },
  required: ["summary", "risk_zones", "advisory"],
  additionalProperties: false,
};

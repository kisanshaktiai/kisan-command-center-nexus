// REPO: kisanshaktiai/kisan-command-center-nexus (admin panel)  BRANCH: SaaS-dashboard-3007  (NEW FILE)
// PATH: supabase/functions/ai-registry-admin/index.ts
//
// CHANGE LOG
// 2026-10-03 — AI control plane Phase 2a (key pool): super-admin-only edge function behind the
//   "AI Control → API Keys" screen. Action `key_status` reports, for every ai_key_slot row, whether the
//   Supabase secret named by env_var is set and — when `probe` is true — whether the provider accepts
//   the key, using a request that spends no tokens (OpenAI GET /v1/models, Gemini GET /v1beta/models;
//   the Lovable gateway has no such endpoint, so it is reported as not probed). Key material is never
//   returned, logged or written anywhere. Authorisation follows governance-audit: JWT user +
//   is_super_admin() RPC. Later Phase 2 actions (test call, activate model) are added here.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface KeySlotRow { provider: "openai" | "gemini" | "lovable"; slot_no: number; env_var: string; is_enabled: boolean }
interface KeyStatus {
  provider: string;
  slot_no: number;
  env_var: string;
  is_enabled: boolean;
  configured: boolean;
  probe: { ok: boolean; http_status: number | null; detail: string } | null;
}

// Only secrets of this shape may be read — the same pattern the ai_key_slot.env_var CHECK enforces.
const ENV_VAR_PATTERN = /^[A-Z][A-Z0-9]*_API_KEY(_[2-9])?$/;
const PROBE_TIMEOUT_MS = 8_000;

async function probeKey(provider: KeySlotRow["provider"], key: string): Promise<KeyStatus["probe"]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    let res: Response;
    if (provider === "openai") {
      res = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` }, signal: controller.signal });
    } else if (provider === "gemini") {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=${encodeURIComponent(key)}`, { signal: controller.signal });
    } else {
      return null; // no token-free check is published for the Lovable AI Gateway
    }
    const text = await res.text().catch(() => "");
    // Never echo the response verbatim: an error body could quote request headers. Keep a short, key-free note.
    const detail = res.ok ? "ok" : (text.toLowerCase().includes("insufficient_quota") || text.toLowerCase().includes("no credits") ? "no credits" : `http ${res.status}`);
    return { ok: res.ok, http_status: res.status, detail };
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    return { ok: false, http_status: null, detail: aborted ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    // Authn: verify the caller is a super admin via a JWT-bound client (governance-audit pattern).
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await userClient.rpc("is_super_admin");
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    let body: { action?: string; probe?: boolean } = {};
    try { body = await req.json(); } catch { body = {}; }

    if (body.action !== "key_status") return json({ error: `Unknown action: ${body.action ?? "(none)"}` }, 400);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: slots, error } = await sb
      .from("ai_key_slot")
      .select("provider,slot_no,env_var,is_enabled")
      .order("provider")
      .order("slot_no");
    if (error) return json({ error: error.message }, 500);

    const keys: KeyStatus[] = await Promise.all(((slots ?? []) as KeySlotRow[]).map(async (s) => {
      const safeName = ENV_VAR_PATTERN.test(s.env_var);
      const key = safeName ? (Deno.env.get(s.env_var) ?? "").trim() : "";
      const configured = key !== "";
      const probe = body.probe === true && configured ? await probeKey(s.provider, key) : null;
      return { provider: s.provider, slot_no: s.slot_no, env_var: s.env_var, is_enabled: s.is_enabled, configured, probe };
    }));

    console.log(`[ai-registry-admin] key_status by ${userRes.user.id}: ${keys.map((k) => `${k.provider}#${k.slot_no}=${k.configured ? "set" : "missing"}${k.probe ? (k.probe.ok ? "/ok" : `/${k.probe.detail}`) : ""}`).join(" ")}`);
    return json({ checked_at: new Date().toISOString(), keys });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

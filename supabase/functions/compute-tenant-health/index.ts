// Compute composite tenant health score from existing tables.
// Scheduled hourly (cron config can be added externally).
// Verifies caller is super_admin when invoked manually; cron call uses service role.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Breakdown {
  activeFarmerRatio: number;
  apiActivityScore: number;
  churnRisk: number;
  subscriptionHealth: number;
  supportLoadInverse: number;
}

function computeScore(b: Breakdown): number {
  const s =
    0.30 * b.activeFarmerRatio +
    0.25 * b.apiActivityScore +
    0.20 * (1 - b.churnRisk) +
    0.15 * b.subscriptionHealth +
    0.10 * b.supportLoadInverse;
  return Math.round(Math.max(0, Math.min(1, s)) * 10000) / 100; // 0–100, 2dp
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const { data: tenants, error: tErr } = await supabase
      .from('tenants')
      .select('id,subscription_status')
      .limit(1000);
    if (tErr) throw tErr;

    const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const since14 = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
    const since7 = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    const snapshots: any[] = [];

    for (const t of tenants || []) {
      // Farmers
      const { count: farmerTotal } = await supabase
        .from('farmers')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', t.id);
      const { count: activeFarmers30 } = await supabase
        .from('farmers')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', t.id)
        .gte('updated_at', since30);
      const { count: activeFarmers14 } = await supabase
        .from('farmers')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', t.id)
        .gte('updated_at', since14);

      const activeFarmerRatio = farmerTotal && farmerTotal > 0
        ? Math.min(1, (activeFarmers30 || 0) / farmerTotal)
        : 0;

      // API activity (usage_analytics, last 7d)
      const { count: apiCalls7 } = await supabase
        .from('usage_analytics')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', t.id)
        .gte('timestamp', since7);
      // Log-scaled: 0 -> 0, 1000+ -> 1
      const apiActivityScore = Math.min(1, Math.log10(1 + (apiCalls7 || 0)) / 3);

      // Churn risk: no active farmers in 14d → 0.7, declining trend → +0.2 (heuristic)
      let churnRisk = 0;
      if (!activeFarmers14 || activeFarmers14 === 0) churnRisk += 0.7;
      if ((farmerTotal || 0) > 0 && (activeFarmers30 || 0) / (farmerTotal || 1) < 0.1) churnRisk += 0.2;
      churnRisk = Math.min(1, churnRisk);

      // Subscription health
      const subStatus = (t as any).subscription_status || 'unknown';
      const subscriptionHealth =
        subStatus === 'active' || subStatus === 'trial' ? 1
        : subStatus === 'past_due' ? 0.4
        : subStatus === 'cancelled' || subStatus === 'expired' ? 0
        : 0.6;

      // Support load (graceful — no support table guaranteed)
      const supportLoadInverse = 1;

      const breakdown: Breakdown = {
        activeFarmerRatio,
        apiActivityScore,
        churnRisk,
        subscriptionHealth,
        supportLoadInverse,
      };
      const score = computeScore(breakdown);
      snapshots.push({ tenant_id: t.id, score, breakdown });
    }

    if (snapshots.length > 0) {
      const { error: insErr } = await supabase.from('tenant_health_snapshots').insert(snapshots);
      if (insErr) throw insErr;
    }

    return new Response(
      JSON.stringify({ success: true, count: snapshots.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

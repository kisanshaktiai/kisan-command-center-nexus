// REPO: kisanshaktiai/kisan-command-center-nexus (admin panel)  BRANCH: SaaS-dashboard-3007
// PATH: src/services/AiCostService.ts
//
// CHANGE LOG
// 2026-10-01 — AI control plane Phase 1: cost comes from the ledger's stored cost_usd (the price at
//   call time written by the AI router), read through the ai_usage_daily view (one row per UTC day ×
//   feature × job × function × tenant × model). The previous client-side re-estimate from
//   ai_model_pricing — including the 500-tokens-per-query guess when usage was missing — is removed:
//   past reports no longer shift when a price is edited, and the 5 000-raw-row limit is gone.
//   New in the summary: per-feature spend, failed / fallback / uncosted call counts and token totals.
//   getSummary(days) keeps its name and the fields AiCostDashboard already uses.
import { supabase } from '@/integrations/supabase/client';

export interface AiUsageDailyRow {
  day: string;
  feature_key: string | null;
  task_key: string | null;
  function_name: string | null;
  tenant_id: string | null;
  model_name: string;
  model_requested: string | null;
  calls: number;
  ok_calls: number;
  failed_calls: number;
  fallback_calls: number;
  uncosted_calls: number;
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  avg_latency_ms: number | null;
}

export interface AiCostRow {
  tenant_id: string | null;
  tenant_name: string;
  model_name: string;
  queries: number;
  cost_usd: number;
  date: string; // ISO date (UTC day)
}

export interface AiCostSummary {
  total: number;
  calls: number;
  failedCalls: number;
  fallbackCalls: number;
  uncostedCalls: number;
  inputTokens: number;
  outputTokens: number;
  byTenant: Array<{ tenant_id: string | null; tenant_name: string; cost: number; queries: number }>;
  byModel: Array<{ model_name: string; cost: number; queries: number }>;
  byFeature: Array<{ feature_key: string; feature_name: string; cost: number; queries: number; failed: number; fallbacks: number }>;
  byTenantByModel: AiCostRow[];
  byDay: Array<{ date: string; cost: number; queries: number }>;
}

export class AiCostService {
  static async getSummary(days: number): Promise<AiCostSummary> {
    // ai_usage_daily is keyed by UTC day; `days` = today plus the previous (days - 1) days.
    const sinceDate = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const [usageRes, tenantsRes, featuresRes] = await Promise.all([
      supabase
        .from('ai_usage_daily')
        .select('*')
        .gte('day', sinceDate)
        .order('day', { ascending: false }),
      supabase.from('tenants').select('id,name'),
      supabase.from('ai_feature').select('feature_key,name'),
    ]);
    if (usageRes.error) throw usageRes.error;
    if (tenantsRes.error) throw tenantsRes.error;
    if (featuresRes.error) throw featuresRes.error;

    const tenantNameById = new Map<string, string>();
    (tenantsRes.data || []).forEach((t: any) => tenantNameById.set(t.id, t.name));
    const featureNameByKey = new Map<string, string>();
    (featuresRes.data || []).forEach((f: any) => featureNameByKey.set(f.feature_key, f.name));

    const rows = (usageRes.data || []) as unknown as AiUsageDailyRow[];

    const byTenant = new Map<string, { tenant_id: string | null; tenant_name: string; cost: number; queries: number }>();
    const byModel = new Map<string, { model_name: string; cost: number; queries: number }>();
    const byFeature = new Map<string, { feature_key: string; feature_name: string; cost: number; queries: number; failed: number; fallbacks: number }>();
    const byPair = new Map<string, AiCostRow>();
    const byDay = new Map<string, { date: string; cost: number; queries: number }>();
    let total = 0;
    let calls = 0;
    let failedCalls = 0;
    let fallbackCalls = 0;
    let uncostedCalls = 0;
    let inputTokens = 0;
    let outputTokens = 0;

    for (const r of rows) {
      const cost = Number(r.cost_usd || 0);
      total += cost;
      calls += r.calls;
      failedCalls += r.failed_calls;
      fallbackCalls += r.fallback_calls;
      uncostedCalls += r.uncosted_calls;
      inputTokens += Number(r.input_tokens || 0);
      outputTokens += Number(r.output_tokens || 0);

      const tName = r.tenant_id ? tenantNameById.get(r.tenant_id) || 'Unknown tenant' : 'Platform';
      const tKey = r.tenant_id || '__platform__';

      const tAgg = byTenant.get(tKey) || { tenant_id: r.tenant_id, tenant_name: tName, cost: 0, queries: 0 };
      tAgg.cost += cost;
      tAgg.queries += r.calls;
      byTenant.set(tKey, tAgg);

      const mAgg = byModel.get(r.model_name) || { model_name: r.model_name, cost: 0, queries: 0 };
      mAgg.cost += cost;
      mAgg.queries += r.calls;
      byModel.set(r.model_name, mAgg);

      // Rows written before a job was routed (task_key null) have no feature; they are shown as "other".
      const fKey = r.feature_key || 'other';
      const fAgg = byFeature.get(fKey) || {
        feature_key: fKey,
        feature_name: featureNameByKey.get(fKey) || fKey,
        cost: 0,
        queries: 0,
        failed: 0,
        fallbacks: 0,
      };
      fAgg.cost += cost;
      fAgg.queries += r.calls;
      fAgg.failed += r.failed_calls;
      fAgg.fallbacks += r.fallback_calls;
      byFeature.set(fKey, fAgg);

      const pairKey = `${tKey}::${r.model_name}`;
      const pair = byPair.get(pairKey) || {
        tenant_id: r.tenant_id,
        tenant_name: tName,
        model_name: r.model_name,
        queries: 0,
        cost_usd: 0,
        date: r.day,
      };
      pair.cost_usd += cost;
      pair.queries += r.calls;
      byPair.set(pairKey, pair);

      const dAgg = byDay.get(r.day) || { date: r.day, cost: 0, queries: 0 };
      dAgg.cost += cost;
      dAgg.queries += r.calls;
      byDay.set(r.day, dAgg);
    }

    return {
      total,
      calls,
      failedCalls,
      fallbackCalls,
      uncostedCalls,
      inputTokens,
      outputTokens,
      byTenant: Array.from(byTenant.values()).sort((a, b) => b.cost - a.cost),
      byModel: Array.from(byModel.values()).sort((a, b) => b.cost - a.cost),
      byFeature: Array.from(byFeature.values()).sort((a, b) => b.cost - a.cost),
      byTenantByModel: Array.from(byPair.values()).sort((a, b) => b.cost_usd - a.cost_usd),
      byDay: Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }
}

import { supabase } from '@/integrations/supabase/client';

export interface PricingRow {
  model_name: string;
  input_cost_per_1k: number;
  output_cost_per_1k: number;
  currency: string;
}

export interface AiUsageRow {
  tenant_id: string | null;
  model_name: string;
  query_count: number;
  resource_usage: Record<string, any> | null;
  timestamp: string;
}

export interface AiCostRow {
  tenant_id: string | null;
  tenant_name: string;
  model_name: string;
  queries: number;
  cost_usd: number;
  date: string; // ISO date
}

export interface AiCostSummary {
  total: number;
  byTenant: Array<{ tenant_id: string | null; tenant_name: string; cost: number; queries: number }>;
  byModel: Array<{ model_name: string; cost: number; queries: number }>;
  byTenantByModel: AiCostRow[];
  byDay: Array<{ date: string; cost: number; queries: number }>;
}

export class AiCostService {
  static async getPricing(): Promise<Map<string, PricingRow>> {
    const { data, error } = await supabase
      .from('ai_model_pricing')
      .select('model_name,input_cost_per_1k,output_cost_per_1k,currency')
      .eq('is_active', true);
    if (error) throw error;
    const map = new Map<string, PricingRow>();
    (data || []).forEach((row: any) => map.set(row.model_name, row as PricingRow));
    return map;
  }

  /**
   * Estimate cost for a single ai_model_metrics row.
   * resource_usage may contain { input_tokens, output_tokens, total_tokens }.
   * Falls back to query_count * (input+output)/2 * 500 tokens average if missing.
   */
  static estimateCost(usage: AiUsageRow, pricing: Map<string, PricingRow>): number {
    const p = pricing.get(usage.model_name);
    if (!p) return 0;
    const ru = usage.resource_usage || {};
    const inTok = Number(ru.input_tokens ?? ru.prompt_tokens ?? 0);
    const outTok = Number(ru.output_tokens ?? ru.completion_tokens ?? 0);
    if (inTok > 0 || outTok > 0) {
      return (inTok / 1000) * p.input_cost_per_1k + (outTok / 1000) * p.output_cost_per_1k;
    }
    const totalTok = Number(ru.total_tokens ?? 0);
    if (totalTok > 0) {
      const avg = (p.input_cost_per_1k + p.output_cost_per_1k) / 2;
      return (totalTok / 1000) * avg;
    }
    // Heuristic fallback: 500 tokens per query, half-input half-output.
    const fallbackTokens = Math.max(usage.query_count, 0) * 500;
    const avg = (p.input_cost_per_1k + p.output_cost_per_1k) / 2;
    return (fallbackTokens / 1000) * avg;
  }

  static async getSummary(days: number): Promise<AiCostSummary> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const [pricing, metricsRes, tenantsRes] = await Promise.all([
      this.getPricing(),
      supabase
        .from('ai_model_metrics')
        .select('tenant_id,model_name,query_count,resource_usage,timestamp')
        .gte('timestamp', since)
        .order('timestamp', { ascending: false })
        .limit(5000),
      supabase.from('tenants').select('id,name'),
    ]);
    if (metricsRes.error) throw metricsRes.error;
    if (tenantsRes.error) throw tenantsRes.error;

    const tenantNameById = new Map<string, string>();
    (tenantsRes.data || []).forEach((t: any) => tenantNameById.set(t.id, t.name));

    const rows = (metricsRes.data || []) as unknown as AiUsageRow[];

    const byTenant = new Map<string, { tenant_id: string | null; tenant_name: string; cost: number; queries: number }>();
    const byModel = new Map<string, { model_name: string; cost: number; queries: number }>();
    const byPair = new Map<string, AiCostRow>();
    const byDay = new Map<string, { date: string; cost: number; queries: number }>();
    let total = 0;

    for (const r of rows) {
      const cost = this.estimateCost(r, pricing);
      total += cost;
      const tName = r.tenant_id ? tenantNameById.get(r.tenant_id) || 'Unknown tenant' : 'Platform';
      const tKey = r.tenant_id || '__platform__';

      const tAgg = byTenant.get(tKey) || { tenant_id: r.tenant_id, tenant_name: tName, cost: 0, queries: 0 };
      tAgg.cost += cost;
      tAgg.queries += r.query_count;
      byTenant.set(tKey, tAgg);

      const mAgg = byModel.get(r.model_name) || { model_name: r.model_name, cost: 0, queries: 0 };
      mAgg.cost += cost;
      mAgg.queries += r.query_count;
      byModel.set(r.model_name, mAgg);

      const pairKey = `${tKey}::${r.model_name}`;
      const date = r.timestamp.slice(0, 10);
      const pair = byPair.get(pairKey) || {
        tenant_id: r.tenant_id,
        tenant_name: tName,
        model_name: r.model_name,
        queries: 0,
        cost_usd: 0,
        date,
      };
      pair.cost_usd += cost;
      pair.queries += r.query_count;
      byPair.set(pairKey, pair);

      const dAgg = byDay.get(date) || { date, cost: 0, queries: 0 };
      dAgg.cost += cost;
      dAgg.queries += r.query_count;
      byDay.set(date, dAgg);
    }

    return {
      total,
      byTenant: Array.from(byTenant.values()).sort((a, b) => b.cost - a.cost),
      byModel: Array.from(byModel.values()).sort((a, b) => b.cost - a.cost),
      byTenantByModel: Array.from(byPair.values()).sort((a, b) => b.cost_usd - a.cost_usd),
      byDay: Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }
}

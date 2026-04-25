import { supabase } from '@/integrations/supabase/client';

export interface HealthBreakdown {
  activeFarmerRatio: number;
  apiActivityScore: number;
  churnRisk: number;
  subscriptionHealth: number;
  supportLoadInverse: number;
}

export interface TenantHealthSnapshot {
  id: string;
  tenant_id: string;
  score: number;
  breakdown: HealthBreakdown;
  computed_at: string;
}

export class TenantHealthService {
  /** Get latest snapshot per tenant. */
  static async getLatestForAll(): Promise<TenantHealthSnapshot[]> {
    const { data, error } = await supabase
      .from('tenant_health_snapshots')
      .select('*')
      .order('computed_at', { ascending: false })
      .limit(2000);
    if (error) throw error;
    // Dedupe to latest per tenant
    const seen = new Set<string>();
    const latest: TenantHealthSnapshot[] = [];
    for (const row of (data || []) as any[]) {
      if (seen.has(row.tenant_id)) continue;
      seen.add(row.tenant_id);
      latest.push(row as TenantHealthSnapshot);
    }
    return latest;
  }

  static async getHistory(tenantId: string, days = 30): Promise<TenantHealthSnapshot[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('tenant_health_snapshots')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('computed_at', since)
      .order('computed_at', { ascending: true });
    if (error) throw error;
    return (data || []) as unknown as TenantHealthSnapshot[];
  }

  static async triggerRecompute(): Promise<void> {
    const { error } = await supabase.functions.invoke('compute-tenant-health', { body: {} });
    if (error) throw error;
  }
}

/** Color band helper for badges. */
export function healthBand(score: number): 'good' | 'warning' | 'critical' {
  if (score >= 80) return 'good';
  if (score >= 60) return 'warning';
  return 'critical';
}

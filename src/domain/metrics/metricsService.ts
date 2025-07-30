
import { supabase } from '@/integrations/supabase/client';
import { SystemMetric, FinancialMetric, ResourceMetric } from '@/data/types/metrics';

export class MetricsService {
  async getSystemMetrics(): Promise<SystemMetric[]> {
    const { data, error } = await supabase
      .from('system_health_metrics')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  }

  async getFinancialMetrics(dateRange?: { from: Date; to: Date }): Promise<FinancialMetric[]> {
    let query = supabase
      .from('financial_analytics')
      .select('*')
      .order('timestamp', { ascending: false });

    if (dateRange) {
      query = query
        .gte('timestamp', dateRange.from.toISOString())
        .lte('timestamp', dateRange.to.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getResourceMetrics(): Promise<ResourceMetric[]> {
    const { data, error } = await supabase
      .from('resource_utilization')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  }

  async getTenantMetrics(tenantId: string) {
    const { data, error } = await supabase
      .from('tenant_metrics')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  }

  // New methods for mutations
  async updateSystemMetric(id: string, data: Partial<SystemMetric>): Promise<SystemMetric> {
    const { data: result, error } = await supabase
      .from('system_health_metrics')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async createFinancialRecord(data: Omit<FinancialMetric, 'id' | 'created_at'>): Promise<FinancialMetric> {
    const { data: result, error } = await supabase
      .from('financial_analytics')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async updateResourceThreshold(resourceType: string, threshold: number): Promise<void> {
    const { error } = await supabase
      .from('resource_utilization')
      .update({ threshold })
      .eq('resource_type', resourceType);

    if (error) throw error;
  }
}

export const metricsService = new MetricsService();

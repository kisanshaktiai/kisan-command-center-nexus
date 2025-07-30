
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
    
    // Map database fields to interface with computed fields
    return (data || []).map(item => ({
      ...item,
      name: item.metric_name,
      status: this.computeHealthStatus(item.value, item.metric_type)
    }));
  }

  async getFinancialMetrics(dateRange?: { from: Date; to: Date }): Promise<FinancialMetric[]> {
    let query = supabase
      .from('financial_analytics')
      .select('*')
      .order('created_at', { ascending: false });

    if (dateRange) {
      query = query
        .gte('period_start', dateRange.from.toISOString())
        .lte('period_end', dateRange.to.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;
    
    // Map database fields to interface with computed fields
    return (data || []).map(item => ({
      ...item,
      category: this.categorizeFiancialMetric(item.metric_type),
      period: `${item.period_start} to ${item.period_end}`
    }));
  }

  async getResourceMetrics(): Promise<ResourceMetric[]> {
    const { data, error } = await supabase
      .from('resource_utilization')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    
    // Map database fields to interface with computed fields
    return (data || []).map(item => ({
      ...item,
      threshold: item.max_limit * 0.8, // 80% threshold
      status: this.computeResourceStatus(item.usage_percentage),
      timestamp: item.created_at
    }));
  }

  async updateSystemMetric(id: string, data: Partial<Omit<SystemMetric, 'id' | 'name' | 'status'>>): Promise<SystemMetric> {
    const { data: result, error } = await supabase
      .from('system_health_metrics')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    return {
      ...result,
      name: result.metric_name,
      status: this.computeHealthStatus(result.value, result.metric_type)
    };
  }

  async createFinancialRecord(data: Omit<FinancialMetric, 'id' | 'created_at' | 'updated_at' | 'category' | 'period'>): Promise<FinancialMetric> {
    const { data: result, error } = await supabase
      .from('financial_analytics')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    
    return {
      ...result,
      category: this.categorizeFiancialMetric(result.metric_type),
      period: `${result.period_start} to ${result.period_end}`
    };
  }

  async updateResourceThreshold(resourceType: string, maxLimit: number): Promise<void> {
    const { error } = await supabase
      .from('resource_utilization')
      .update({ max_limit: maxLimit })
      .eq('resource_type', resourceType);

    if (error) throw error;
  }

  private computeHealthStatus(value: number, metricType: string): 'healthy' | 'warning' | 'critical' {
    // Simple logic - can be enhanced based on metric type
    if (metricType === 'cpu_usage' || metricType === 'memory_usage') {
      if (value > 90) return 'critical';
      if (value > 70) return 'warning';
      return 'healthy';
    }
    return 'healthy';
  }

  private computeResourceStatus(usagePercentage: number): 'normal' | 'warning' | 'critical' {
    if (usagePercentage > 90) return 'critical';
    if (usagePercentage > 80) return 'warning';
    return 'normal';
  }

  private categorizeFiancialMetric(metricType: string): string {
    const categories: Record<string, string> = {
      revenue: 'Revenue',
      cost: 'Costs',
      profit: 'Profit',
      subscription: 'Subscriptions'
    };
    return categories[metricType] || 'Other';
  }
}

export const metricsService = new MetricsService();

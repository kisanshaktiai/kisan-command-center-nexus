
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
    
    // Map database fields to interface with computed fields and proper type casting
    return (data || []).map(item => ({
      ...item,
      name: item.metric_name,
      status: this.computeHealthStatus(item.value, item.metric_type),
      labels: (item.labels as Record<string, any>) || {},
      tenant_id: item.tenant_id || '',
      unit: item.unit || '',
      timestamp: item.timestamp || item.created_at
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
    
    // Map database fields to interface with computed fields and proper type casting
    return (data || []).map(item => ({
      ...item,
      category: this.categorizeFiancialMetric(item.metric_type),
      period: `${item.period_start} to ${item.period_end}`,
      breakdown: (item.breakdown as Record<string, any>) || {},
      tenant_id: item.tenant_id || ''
    }));
  }

  async getResourceMetrics(): Promise<ResourceMetric[]> {
    const { data, error } = await supabase
      .from('resource_utilization')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    
    // Map database fields to interface with computed fields and proper type casting
    return (data || []).map(item => ({
      ...item,
      threshold: (item.max_limit || 0) * 0.8, // 80% threshold
      status: this.computeResourceStatus(item.usage_percentage || 0),
      timestamp: item.created_at,
      metadata: (item.metadata as Record<string, any>) || {},
      tenant_id: item.tenant_id || '',
      max_limit: item.max_limit || 0,
      usage_percentage: item.usage_percentage || 0
    }));
  }

  async getTenantMetrics(tenantId: string): Promise<any> {
    // Get tenant-specific metrics from multiple tables
    const [systemMetrics, financialMetrics, resourceMetrics] = await Promise.all([
      this.getSystemMetrics(),
      this.getFinancialMetrics(),
      this.getResourceMetrics()
    ]);

    // Filter metrics for the specific tenant
    const tenantSystemMetrics = systemMetrics.filter(m => m.tenant_id === tenantId);
    const tenantFinancialMetrics = financialMetrics.filter(m => m.tenant_id === tenantId);
    const tenantResourceMetrics = resourceMetrics.filter(m => m.tenant_id === tenantId);

    return {
      system: tenantSystemMetrics,
      financial: tenantFinancialMetrics,
      resources: tenantResourceMetrics,
      summary: {
        totalMetrics: tenantSystemMetrics.length + tenantFinancialMetrics.length + tenantResourceMetrics.length,
        healthScore: this.calculateTenantHealthScore(tenantSystemMetrics, tenantResourceMetrics),
        lastUpdated: new Date().toISOString()
      }
    };
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
      status: this.computeHealthStatus(result.value, result.metric_type),
      labels: (result.labels as Record<string, any>) || {},
      tenant_id: result.tenant_id || '',
      unit: result.unit || ''
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
      period: `${result.period_start} to ${result.period_end}`,
      breakdown: (result.breakdown as Record<string, any>) || {},
      tenant_id: result.tenant_id || ''
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

  private calculateTenantHealthScore(systemMetrics: SystemMetric[], resourceMetrics: ResourceMetric[]): number {
    const healthySystem = systemMetrics.filter(m => m.status === 'healthy').length;
    const normalResources = resourceMetrics.filter(r => r.status === 'normal').length;
    const total = systemMetrics.length + resourceMetrics.length;
    
    if (total === 0) return 100;
    return Math.round(((healthySystem + normalResources) / total) * 100);
  }
}

export const metricsService = new MetricsService();


import { supabase } from '@/integrations/supabase/client';
import { SystemMetric, FinancialMetric, ResourceMetric, TenantMetric } from '@/data/types/metrics';

class MetricsService {
  async getSystemMetrics(): Promise<SystemMetric[]> {
    try {
      const { data, error } = await supabase
        .from('system_health_metrics')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);

      if (error) throw error;

      return data?.map(item => ({
        id: item.id,
        name: item.metric_name || 'Unknown',
        value: item.value || 0,
        unit: item.unit || '',
        status: this.calculateStatus(item.value, item.threshold),
        timestamp: item.timestamp
      })) || [];
    } catch (error) {
      console.error('Error fetching system metrics:', error);
      return [];
    }
  }

  async getFinancialMetrics(dateRange?: { from: Date; to: Date }): Promise<FinancialMetric[]> {
    try {
      let query = supabase
        .from('financial_analytics')
        .select('*');

      if (dateRange) {
        query = query
          .gte('period_start', dateRange.from.toISOString())
          .lte('period_end', dateRange.to.toISOString());
      }

      const { data, error } = await query
        .order('period_start', { ascending: false })
        .limit(50);

      if (error) throw error;

      return data?.map(item => ({
        id: item.id,
        category: this.parseJsonField(item.metadata, 'category') || 'General',
        amount: item.amount || 0,
        currency: item.currency || 'USD',
        period: item.period_start,
        change_percentage: this.parseJsonField(item.metadata, 'change_percentage')
      })) || [];
    } catch (error) {
      console.error('Error fetching financial metrics:', error);
      return [];
    }
  }

  async getResourceMetrics(): Promise<ResourceMetric[]> {
    try {
      const { data, error } = await supabase
        .from('resource_utilization')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(20);

      if (error) throw error;

      return data?.map(item => ({
        id: item.id,
        resource_type: item.resource_type || 'cpu',
        usage_percentage: item.usage_percentage || 0,
        threshold: item.threshold || 80,
        status: this.calculateResourceStatus(item.usage_percentage, item.threshold),
        timestamp: item.timestamp
      })) || [];
    } catch (error) {
      console.error('Error fetching resource metrics:', error);
      return [];
    }
  }

  async getTenantMetrics(tenantId: string): Promise<TenantMetric[]> {
    try {
      // This would typically query tenant-specific metrics
      // For now, return empty array as the table structure may vary
      return [];
    } catch (error) {
      console.error('Error fetching tenant metrics:', error);
      return [];
    }
  }

  private calculateStatus(value: number, threshold?: number): 'healthy' | 'warning' | 'critical' {
    if (!threshold) return 'healthy';
    
    if (value >= threshold * 0.9) return 'critical';
    if (value >= threshold * 0.7) return 'warning';
    return 'healthy';
  }

  private calculateResourceStatus(usage: number, threshold: number): 'normal' | 'warning' | 'critical' {
    if (usage >= threshold) return 'critical';
    if (usage >= threshold * 0.8) return 'warning';
    return 'normal';
  }

  private parseJsonField(jsonData: any, field: string): any {
    try {
      if (typeof jsonData === 'string') {
        const parsed = JSON.parse(jsonData);
        return parsed[field];
      }
      if (typeof jsonData === 'object' && jsonData !== null) {
        return jsonData[field];
      }
      return undefined;
    } catch {
      return undefined;
    }
  }
}

export const metricsService = new MetricsService();

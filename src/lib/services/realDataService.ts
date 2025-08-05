
import { supabase } from '@/integrations/supabase/client';

export interface SIMInfo {
  detected: boolean;
  info: any;
  timestamp: string;
}

export class RealDataService {
  // Fetch platform alerts with correct column names
  async fetchAlerts() {
    try {
      const { data, error } = await supabase
        .from('platform_alerts')
        .select('id, message, severity, status, created_at, tenant_id')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching platform alerts:', error);
        throw new Error(`Failed to fetch alerts: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Service error fetching alerts:', error);
      return [];
    }
  }

  // Fetch system health metrics - using correct column names from actual schema
  async fetchSystemHealth() {
    try {
      const { data, error } = await supabase
        .from('system_health_metrics')
        .select('id, metric_name, metric_type, value, unit, timestamp, created_at, tenant_id, labels')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching system health:', error);
        throw new Error(`Failed to fetch system health: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Service error fetching system health:', error);
      return [];
    }
  }

  // Fetch financial metrics - using correct column names and PostgREST syntax
  async fetchFinancialMetrics() {
    try {
      const { data, error } = await supabase
        .from('financial_analytics')
        .select('id, amount, metric_type, currency, period_start, period_end, period_type, breakdown, created_at, tenant_id')
        .eq('metric_type', 'revenue') // Use PostgREST syntax
        .order('period_start', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching financial metrics:', error);
        throw new Error(`Failed to fetch financial metrics: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Service error fetching financial metrics:', error);
      return [];
    }
  }

  // SIM Detection with better error handling
  async fetchSIMDetectionData(): Promise<SIMInfo> {
    try {
      // Mock SIM detection for now - replace with actual logic
      const simulatedDetection = Math.random() > 0.7;
      
      return {
        detected: simulatedDetection,
        info: simulatedDetection ? {
          carrier: 'Sample Carrier',
          country: 'India',
          type: 'Mobile'
        } : null,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('SIM detection error:', error);
      return {
        detected: false,
        info: null,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Alert management with proper error handling
  async acknowledgeAlert(alertId: string) {
    try {
      const { data, error } = await supabase
        .from('platform_alerts')
        .update({ 
          status: 'acknowledged',
          updated_at: new Date().toISOString()
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) {
        console.error('Error acknowledging alert:', error);
        throw new Error(`Failed to acknowledge alert: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Service error acknowledging alert:', error);
      throw error;
    }
  }

  async resolveAlert(alertId: string) {
    try {
      const { data, error } = await supabase
        .from('platform_alerts')
        .update({ 
          status: 'resolved',
          updated_at: new Date().toISOString()
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) {
        console.error('Error resolving alert:', error);
        throw new Error(`Failed to resolve alert: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Service error resolving alert:', error);
      throw error;
    }
  }

  // Fetch resource utilization data - using correct column names from actual schema
  async fetchResourceUtilization() {
    try {
      const { data, error } = await supabase
        .from('resource_utilization')
        .select('id, tenant_id, resource_type, current_usage, max_limit, usage_percentage, period_start, period_end, metadata, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching resource utilization:', error);
        throw new Error(`Failed to fetch resource utilization: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Service error fetching resource utilization:', error);
      return [];
    }
  }
}

export const realDataService = new RealDataService();

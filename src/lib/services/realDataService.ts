
import { supabase } from '@/integrations/supabase/client';

export interface SIMInfo {
  carrierName?: string;
  countryCode?: string;
  mobileCountryCode?: string;
  mobileNetworkCode?: string;
  isoCountryCode?: string;
  callsAllowed?: boolean;
  voiceRoamingAllowed?: boolean;
  dataRoamingAllowed?: boolean;
}

export class RealDataService {
  private static instance: RealDataService;

  public static getInstance(): RealDataService {
    if (!RealDataService.instance) {
      RealDataService.instance = new RealDataService();
    }
    return RealDataService.instance;
  }

  // Fetch platform alerts from database with better error handling
  async fetchAlerts() {
    try {
      const { data, error } = await supabase
        .from('platform_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching alerts:', error.message, error.details, error.hint);
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }
  }

  // Fetch system health metrics with corrected column names
  async fetchSystemHealth() {
    try {
      const { data, error } = await supabase
        .from('system_health_metrics')
        .select('id, metric_name, value, unit, timestamp, created_at, tenant_id')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching system health:', error.message, error.details, error.hint);
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('Error fetching system health:', error);
      return [];
    }
  }

  // Fetch financial metrics with corrected column names
  async fetchFinancialMetrics() {
    try {
      const { data, error } = await supabase
        .from('financial_analytics')
        .select('id, amount, metric_type, period_start, period_end, created_at, tenant_id')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching financial metrics:', error.message, error.details, error.hint);
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('Error fetching financial metrics:', error);
      return [];
    }
  }

  // Fetch SIM detection data
  async fetchSIMDetectionData() {
    try {
      const simInfo = await this.detectSIMInfo();
      return {
        detected: !!simInfo,
        info: simInfo,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching SIM detection data:', error);
      return {
        detected: false,
        info: null,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Acknowledge alert with better error handling
  async acknowledgeAlert(alertId: string) {
    try {
      const { error } = await supabase
        .from('platform_alerts')
        .update({ status: 'acknowledged' })
        .eq('id', alertId);

      if (error) {
        console.error('Error acknowledging alert:', error.message, error.details, error.hint);
        throw error;
      }
      return { success: true };
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      throw error;
    }
  }

  // Resolve alert with better error handling
  async resolveAlert(alertId: string) {
    try {
      const { error } = await supabase
        .from('platform_alerts')
        .update({ status: 'resolved' })
        .eq('id', alertId);

      if (error) {
        console.error('Error resolving alert:', error.message, error.details, error.hint);
        throw error;
      }
      return { success: true };
    } catch (error) {
      console.error('Error resolving alert:', error);
      throw error;
    }
  }

  // Get real SIM information - simplified implementation
  async detectSIMInfo(): Promise<SIMInfo | null> {
    try {
      const location = await this.detectUserLocation();
      
      return {
        carrierName: 'Unknown',
        countryCode: location.countryCode || 'Unknown',
        isoCountryCode: location.countryCode || 'Unknown',
        callsAllowed: true,
        voiceRoamingAllowed: false,
        dataRoamingAllowed: true,
      };
    } catch (error) {
      console.error('Error detecting SIM info:', error);
      return this.detectBrowserSIMInfo();
    }
  }

  private async detectBrowserSIMInfo(): Promise<SIMInfo> {
    // Use navigator APIs if available, otherwise return detected location info
    const location = await this.detectUserLocation();
    
    return {
      carrierName: 'Unknown',
      countryCode: location.countryCode || 'Unknown',
      isoCountryCode: location.countryCode || 'Unknown',
      callsAllowed: true,
      voiceRoamingAllowed: false,
      dataRoamingAllowed: true,
    };
  }

  private async detectUserLocation(): Promise<{ countryCode?: string }> {
    try {
      // Use IP geolocation or browser geolocation
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      return { countryCode: data.country_code };
    } catch {
      return { countryCode: 'IN' }; // Default fallback
    }
  }

  async getCarrierName(): Promise<string> {
    const simInfo = await this.detectSIMInfo();
    return simInfo?.carrierName || 'Unknown Carrier';
  }

  async getCountryCode(): Promise<string> {
    const simInfo = await this.detectSIMInfo();
    return simInfo?.countryCode || simInfo?.isoCountryCode || 'Unknown';
  }

  async isRoaming(): Promise<boolean> {
    const simInfo = await this.detectSIMInfo();
    return simInfo?.dataRoamingAllowed || false;
  }
}

export const realDataService = RealDataService.getInstance();

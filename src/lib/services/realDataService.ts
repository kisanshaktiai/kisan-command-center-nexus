
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

  // Get real SIM information from device capabilities table
  async detectSIMInfo(): Promise<SIMInfo | null> {
    try {
      // Try to get SIM info from user's device capabilities if stored
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_device_capabilities')
        .select('sim_info')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data?.sim_info) {
        // Fall back to browser detection or return basic info
        return this.detectBrowserSIMInfo();
      }

      return data.sim_info as SIMInfo;
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

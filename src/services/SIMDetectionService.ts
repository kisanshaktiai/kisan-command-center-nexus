
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

export class SIMDetectionService {
  private static instance: SIMDetectionService;

  public static getInstance(): SIMDetectionService {
    if (!SIMDetectionService.instance) {
      SIMDetectionService.instance = new SIMDetectionService();
    }
    return SIMDetectionService.instance;
  }

  async detectSIMInfo(): Promise<SIMInfo | null> {
    try {
      // Check if we're in a mobile environment with Capacitor
      if (typeof window !== 'undefined' && (window as any).Capacitor) {
        try {
          // For now, return mock data since SIM plugin is not installed
          console.log('Capacitor detected but SIM plugin not available, using mock data');
          return this.getMockSIMInfo();
        } catch (error) {
          console.warn('SIM plugin not available or failed:', error);
          return this.getMockSIMInfo();
        }
      }

      // For web environment, return mock data
      return this.getMockSIMInfo();
    } catch (error) {
      console.error('Error detecting SIM info:', error);
      return null;
    }
  }

  private getMockSIMInfo(): SIMInfo {
    return {
      carrierName: 'Demo Carrier',
      countryCode: 'IN',
      mobileCountryCode: '404',
      mobileNetworkCode: '01',
      isoCountryCode: 'IN',
      callsAllowed: true,
      voiceRoamingAllowed: false,
      dataRoamingAllowed: false,
    };
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

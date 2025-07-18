
export interface SIMInfo {
  carrierName: string;
  countryCode: string;
  mobileCountryCode: string;
  mobileNetworkCode: string;
  allowsVoip: boolean;
  phoneNumber?: string;
  isDataRoaming: boolean;
  isNetworkRoaming: boolean;
}

export class SIMDetectionService {
  private static instance: SIMDetectionService;

  public static getInstance(): SIMDetectionService {
    if (!SIMDetectionService.instance) {
      SIMDetectionService.instance = new SIMDetectionService();
    }
    return SIMDetectionService.instance;
  }

  async detectSIMs(): Promise<SIMInfo[]> {
    try {
      // Check if native plugin is available
      if (!window.Capacitor?.isNativePlatform()) {
        throw new Error('SIM detection requires native platform');
      }

      // Attempt to use native SIM detection plugin
      const { SIM } = await import('@capacitor-community/sim');
      
      const simInfo = await SIM.getSimCards();
      
      if (!simInfo || !simInfo.simCards || simInfo.simCards.length === 0) {
        console.warn('No SIM cards detected on device');
        return [];
      }

      return simInfo.simCards.map((sim: any) => ({
        carrierName: sim.carrierName || 'Unknown Carrier',
        countryCode: sim.countryCode || '',
        mobileCountryCode: sim.mobileCountryCode || '',
        mobileNetworkCode: sim.mobileNetworkCode || '',
        allowsVoip: sim.allowsVoip || false,
        phoneNumber: sim.phoneNumber,
        isDataRoaming: sim.isDataRoaming || false,
        isNetworkRoaming: sim.isNetworkRoaming || false,
      }));
    } catch (error) {
      console.error('SIM detection failed:', error);
      throw new Error('Unable to detect SIM cards. This feature requires a mobile device with native plugin support.');
    }
  }

  async hasValidSIM(): Promise<boolean> {
    try {
      const sims = await this.detectSIMs();
      return sims.length > 0;
    } catch (error) {
      console.error('SIM validation failed:', error);
      return false;
    }
  }
}

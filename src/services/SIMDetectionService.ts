
import { realDataService, SIMInfo } from '@/lib/services/realDataService';

export { SIMInfo } from '@/lib/services/realDataService';

export class SIMDetectionService {
  private static instance: SIMDetectionService;

  public static getInstance(): SIMDetectionService {
    if (!SIMDetectionService.instance) {
      SIMDetectionService.instance = new SIMDetectionService();
    }
    return SIMDetectionService.instance;
  }

  async detectSIMInfo(): Promise<SIMInfo | null> {
    return realDataService.detectSIMInfo();
  }

  async getCarrierName(): Promise<string> {
    return realDataService.getCarrierName();
  }

  async getCountryCode(): Promise<string> {
    return realDataService.getCountryCode();
  }

  async isRoaming(): Promise<boolean> {
    return realDataService.isRoaming();
  }
}


// Platform configuration service for multi-tenant support
export interface PlatformConfig {
  platformName: string;
  baseDomain: string;
  proxyDomain: string;
  verificationPrefix: string;
  supportEmail: string;
  fromEmail: string;
}

// Default configuration - can be overridden by environment variables
const DEFAULT_CONFIG: PlatformConfig = {
  platformName: 'KisanShakti Platform',
  baseDomain: 'kisanshakti.com',
  proxyDomain: 'proxy.kisanshakti.com',
  verificationPrefix: 'kisanshakti-verify',
  supportEmail: 'support@kisanshakti.com',
  fromEmail: 'admin@kisanshaktiai.in'
};

class PlatformConfigService {
  private static instance: PlatformConfigService;
  private config: PlatformConfig;

  private constructor() {
    // Initialize with default config, can be extended to load from environment or database
    this.config = {
      ...DEFAULT_CONFIG,
      // Override with environment variables if available
      platformName: this.getEnvVar('VITE_PLATFORM_NAME', DEFAULT_CONFIG.platformName),
      baseDomain: this.getEnvVar('VITE_BASE_DOMAIN', DEFAULT_CONFIG.baseDomain),
      proxyDomain: this.getEnvVar('VITE_PROXY_DOMAIN', DEFAULT_CONFIG.proxyDomain),
      verificationPrefix: this.getEnvVar('VITE_VERIFICATION_PREFIX', DEFAULT_CONFIG.verificationPrefix),
      supportEmail: this.getEnvVar('VITE_SUPPORT_EMAIL', DEFAULT_CONFIG.supportEmail),
      fromEmail: this.getEnvVar('VITE_FROM_EMAIL', DEFAULT_CONFIG.fromEmail)
    };
  }

  public static getInstance(): PlatformConfigService {
    if (!PlatformConfigService.instance) {
      PlatformConfigService.instance = new PlatformConfigService();
    }
    return PlatformConfigService.instance;
  }

  private getEnvVar(key: string, defaultValue: string): string {
    // In a real implementation, this would check environment variables
    // For now, return default values
    return defaultValue;
  }

  public getConfig(): PlatformConfig {
    return { ...this.config };
  }

  public getPlatformName(): string {
    return this.config.platformName;
  }

  public getBaseDomain(): string {
    return this.config.baseDomain;
  }

  public getProxyDomain(): string {
    return this.config.proxyDomain;
  }

  public getVerificationPrefix(): string {
    return this.config.verificationPrefix;
  }

  public getSupportEmail(): string {
    return this.config.supportEmail;
  }

  public getFromEmail(): string {
    return this.config.fromEmail;
  }

  // Method to update config dynamically (for admin settings)
  public updateConfig(newConfig: Partial<PlatformConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

export const platformConfigService = PlatformConfigService.getInstance();


/**
 * Security Headers Middleware
 * Implements comprehensive security headers for the application
 */

export interface SecurityHeadersConfig {
  contentSecurityPolicy?: string;
  xFrameOptions?: string;
  xContentTypeOptions?: string;
  referrerPolicy?: string;
  permissionsPolicy?: string;
  strictTransportSecurity?: string;
}

export const DEFAULT_SECURITY_HEADERS: SecurityHeadersConfig = {
  contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: 'camera=(), microphone=(), geolocation=()',
  strictTransportSecurity: 'max-age=31536000; includeSubDomains'
};

export class SecurityHeadersService {
  private static instance: SecurityHeadersService;
  private config: SecurityHeadersConfig;

  private constructor(config: SecurityHeadersConfig = DEFAULT_SECURITY_HEADERS) {
    this.config = config;
  }

  public static getInstance(config?: SecurityHeadersConfig): SecurityHeadersService {
    if (!SecurityHeadersService.instance) {
      SecurityHeadersService.instance = new SecurityHeadersService(config);
    }
    return SecurityHeadersService.instance;
  }

  /**
   * Apply security headers to fetch requests
   */
  public applyToFetchRequest(headers: Headers): Headers {
    const securityHeaders = new Headers(headers);

    if (this.config.contentSecurityPolicy) {
      securityHeaders.set('Content-Security-Policy', this.config.contentSecurityPolicy);
    }

    if (this.config.xFrameOptions) {
      securityHeaders.set('X-Frame-Options', this.config.xFrameOptions);
    }

    if (this.config.xContentTypeOptions) {
      securityHeaders.set('X-Content-Type-Options', this.config.xContentTypeOptions);
    }

    if (this.config.referrerPolicy) {
      securityHeaders.set('Referrer-Policy', this.config.referrerPolicy);
    }

    if (this.config.permissionsPolicy) {
      securityHeaders.set('Permissions-Policy', this.config.permissionsPolicy);
    }

    if (this.config.strictTransportSecurity) {
      securityHeaders.set('Strict-Transport-Security', this.config.strictTransportSecurity);
    }

    return securityHeaders;
  }

  /**
   * Get security headers as object
   */
  public getHeadersObject(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.config.contentSecurityPolicy) {
      headers['Content-Security-Policy'] = this.config.contentSecurityPolicy;
    }

    if (this.config.xFrameOptions) {
      headers['X-Frame-Options'] = this.config.xFrameOptions;
    }

    if (this.config.xContentTypeOptions) {
      headers['X-Content-Type-Options'] = this.config.xContentTypeOptions;
    }

    if (this.config.referrerPolicy) {
      headers['Referrer-Policy'] = this.config.referrerPolicy;
    }

    if (this.config.permissionsPolicy) {
      headers['Permissions-Policy'] = this.config.permissionsPolicy;
    }

    if (this.config.strictTransportSecurity) {
      headers['Strict-Transport-Security'] = this.config.strictTransportSecurity;
    }

    return headers;
  }

  /**
   * Update security headers configuration
   */
  public updateConfig(newConfig: Partial<SecurityHeadersConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Initialize security headers for the application
 */
export const initializeSecurityHeaders = () => {
  const securityService = SecurityHeadersService.getInstance();
  
  // Apply to all fetch requests
  const originalFetch = window.fetch;
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers);
    const secureHeaders = securityService.applyToFetchRequest(headers);
    
    return originalFetch(input, {
      ...init,
      headers: secureHeaders
    });
  };

  return securityService;
};

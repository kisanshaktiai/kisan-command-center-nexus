
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
   * Apply appropriate headers to fetch requests (minimal set to avoid CORS issues)
   */
  public applyToFetchRequest(headers: Headers): Headers {
    const securityHeaders = new Headers(headers);

    // Only apply minimal security headers that won't cause CORS preflight issues
    // Most security headers are response-only and should not be sent in requests
    
    // Only add headers that are commonly accepted by APIs and won't trigger CORS preflight
    return securityHeaders;
  }

  /**
   * Get security headers as object (for server responses)
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
  
  // Apply minimal security headers to outgoing requests to avoid CORS issues
  const originalFetch = window.fetch;
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers);
    
    // Only apply request-appropriate headers to avoid CORS preflight issues
    // For Supabase requests, use minimal headers to prevent CORS conflicts
    const isSupabaseRequest = typeof input === 'string' && input.includes('supabase.co');
    
    if (isSupabaseRequest) {
      // For Supabase requests, don't add any custom headers that might cause CORS issues
      return originalFetch(input, init);
    }
    
    // For other requests, apply minimal security headers
    const secureHeaders = securityService.applyToFetchRequest(headers);
    
    return originalFetch(input, {
      ...init,
      headers: secureHeaders
    });
  };

  return securityService;
};

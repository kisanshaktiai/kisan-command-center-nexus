
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
 * Check if URL is a Supabase endpoint
 */
function isSupabaseRequest(url: string): boolean {
  return url.includes('supabase.co') || url.includes('supabase.com');
}

/**
 * Initialize security headers for the application
 */
export const initializeSecurityHeaders = () => {
  const securityService = SecurityHeadersService.getInstance();
  
  // Apply minimal security headers to outgoing requests to avoid CORS issues
  const originalFetch = window.fetch;
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    // Check if this is a Supabase request
    const url = typeof input === 'string' ? input : input.toString();
    
    if (isSupabaseRequest(url)) {
      // For Supabase requests, don't add any custom headers that might cause CORS issues
      // Remove any problematic headers that might be set
      if (init?.headers) {
        const headers = new Headers(init.headers);
        
        // Remove headers that commonly cause CORS preflight issues
        headers.delete('referrer-policy');
        headers.delete('x-frame-options');
        headers.delete('x-content-type-options');
        headers.delete('strict-transport-security');
        headers.delete('permissions-policy');
        headers.delete('content-security-policy');
        
        init = { ...init, headers };
      }
      
      return originalFetch(input, init);
    }
    
    // For other requests, apply minimal security headers
    const headers = new Headers(init?.headers);
    const secureHeaders = securityService.applyToFetchRequest(headers);
    
    return originalFetch(input, {
      ...init,
      headers: secureHeaders
    });
  };

  return securityService;
};

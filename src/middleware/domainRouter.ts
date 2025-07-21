
export interface DomainMapping {
  tenant_id: string;
  portal_type: string;
  branding?: any;
  features?: any;
}

export class DomainRouter {
  private static domainCache = new Map<string, DomainMapping>();
  private static cacheExpiry = new Map<string, number>();
  private static CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static async getDomainMapping(hostname: string): Promise<DomainMapping | null> {
    // Check cache first
    if (this.domainCache.has(hostname)) {
      const expiry = this.cacheExpiry.get(hostname) || 0;
      if (Date.now() < expiry) {
        return this.domainCache.get(hostname) || null;
      }
    }

    try {
      // Fetch from database
      const response = await fetch('/api/internal/domain-mapping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hostname })
      });

      if (!response.ok) {
        return null;
      }

      const mapping = await response.json();
      
      // Update cache
      this.domainCache.set(hostname, mapping);
      this.cacheExpiry.set(hostname, Date.now() + this.CACHE_TTL);
      
      return mapping;
    } catch (error) {
      console.error('Error fetching domain mapping:', error);
      return null;
    }
  }

  static getTenantIdFromHeaders(): string | null {
    if (typeof window === 'undefined') return null;
    
    // In a browser environment, we'd typically get this from a custom header
    // set by the middleware or from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('tenant') || null;
  }

  static async validateTenantAccess(tenantId: string, requiredRole?: string): Promise<boolean> {
    try {
      const response = await fetch('/api/internal/validate-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenantId, requiredRole })
      });

      return response.ok;
    } catch (error) {
      console.error('Error validating tenant access:', error);
      return false;
    }
  }

  static clearCache(): void {
    this.domainCache.clear();
    this.cacheExpiry.clear();
  }
}

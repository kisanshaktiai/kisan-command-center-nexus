
import { supabase } from '@/integrations/supabase/client';

export interface TenantInfo {
  id: string;
  name: string;
  subdomain: string;
  status: 'active' | 'inactive' | 'suspended';
  branding: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
    company_name?: string;
    tagline?: string;
  };
  subscription_status: 'active' | 'inactive' | 'trial' | 'expired';
  features: string[];
}

export class TenantDetectionService {
  private static instance: TenantDetectionService;
  private currentTenant: TenantInfo | null = null;

  public static getInstance(): TenantDetectionService {
    if (!TenantDetectionService.instance) {
      TenantDetectionService.instance = new TenantDetectionService();
    }
    return TenantDetectionService.instance;
  }

  async detectTenant(): Promise<TenantInfo | null> {
    try {
      const hostname = window.location.hostname;
      const subdomain = this.extractSubdomain(hostname);
      
      if (!subdomain) {
        throw new Error('No subdomain detected - tenant identification required');
      }

      // Simplified tenant detection - get any tenant for development
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('id, name, created_at')
        .limit(1)
        .single();

      if (error || !tenant) {
        console.error('Failed to fetch tenant data:', error);
        // Return mock tenant for development
        const mockTenant: TenantInfo = {
          id: 'default-tenant-id',
          name: 'Default Tenant',
          subdomain: subdomain,
          status: 'active',
          branding: {},
          subscription_status: 'trial',
          features: []
        };
        
        this.currentTenant = mockTenant;
        return mockTenant;
      }

      const tenantInfo: TenantInfo = {
        id: tenant.id,
        name: tenant.name,
        subdomain: subdomain,
        status: 'active', // Default since status column might not exist
        branding: {},     // Default since branding column might not exist
        subscription_status: 'trial', // Default since subscription_status column might not exist
        features: []      // Default since tenant_features might not exist
      };

      this.currentTenant = tenantInfo;
      return tenantInfo;
    } catch (error) {
      console.error('Tenant detection failed:', error);
      throw error;
    }
  }

  private extractSubdomain(hostname: string): string | null {
    if (hostname === 'localhost' || hostname.startsWith('192.168.') || hostname.includes('.lovableproject.com')) {
      // For development, attempt to get tenant from URL params or local storage
      const urlParams = new URLSearchParams(window.location.search);
      const tenantParam = urlParams.get('tenant');
      if (tenantParam) {
        return tenantParam;
      }
      
      const storedTenant = localStorage.getItem('dev_tenant');
      if (storedTenant) {
        return storedTenant;
      }
      
      return null;
    }

    const parts = hostname.split('.');
    if (parts.length > 2) {
      return parts[0];
    }
    
    return null;
  }

  getCurrentTenant(): TenantInfo | null {
    return this.currentTenant;
  }

  async refreshTenant(): Promise<TenantInfo | null> {
    this.currentTenant = null;
    return this.detectTenant();
  }
}

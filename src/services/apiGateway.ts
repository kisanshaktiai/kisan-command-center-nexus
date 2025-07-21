
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TenantDetails {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  subscription_plan: string;
  branding?: any;
  features?: any;
  limits?: any;
}

export interface DomainSetupRequest {
  tenantId: string;
  domain: string;
  portalType: 'farmer' | 'dealer' | 'admin';
  sslEnabled?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

class ApiGateway {
  private async validateRequest(requiredRole?: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Authentication required');
    }

    if (requiredRole) {
      // Check user role - this would need to be implemented based on your auth system
      const userRole = user.user_metadata?.role || 'user';
      const roleHierarchy = ['user', 'tenant_admin', 'platform_admin', 'super_admin'];
      const requiredIndex = roleHierarchy.indexOf(requiredRole);
      const userIndex = roleHierarchy.indexOf(userRole);
      
      if (userIndex < requiredIndex) {
        throw new Error('Insufficient permissions');
      }
    }

    return true;
  }

  async createTenant(tenantData: any): Promise<ApiResponse<TenantDetails>> {
    try {
      await this.validateRequest('platform_admin');
      
      const { data, error } = await supabase.rpc('create_tenant_with_validation', {
        p_name: tenantData.name,
        p_slug: tenantData.slug,
        p_type: tenantData.type,
        p_status: tenantData.status || 'trial',
        p_subscription_plan: tenantData.subscription_plan || 'Kisan_Basic',
        p_owner_name: tenantData.owner_name,
        p_owner_email: tenantData.owner_email,
        p_owner_phone: tenantData.owner_phone,
        p_business_registration: tenantData.business_registration,
        p_business_address: tenantData.business_address,
        p_established_date: tenantData.established_date,
        p_max_farmers: tenantData.max_farmers,
        p_max_dealers: tenantData.max_dealers,
        p_max_products: tenantData.max_products,
        p_max_storage_gb: tenantData.max_storage_gb,
        p_max_api_calls_per_day: tenantData.max_api_calls_per_day,
        p_subdomain: tenantData.subdomain,
        p_custom_domain: tenantData.custom_domain,
        p_metadata: tenantData.metadata || {}
      });

      if (error) {
        throw new Error(error.message);
      }

      const result = data as any;
      if (!result.success) {
        throw new Error(result.error || 'Failed to create tenant');
      }

      return {
        success: true,
        data: result.data,
        code: result.code
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'API_ERROR'
      };
    }
  }

  async getTenantDetails(tenantId: string): Promise<ApiResponse<TenantDetails>> {
    try {
      await this.validateRequest('tenant_admin');
      
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          id,
          name,
          slug,
          type,
          status,
          subscription_plan,
          max_farmers,
          max_dealers,
          max_products,
          max_storage_gb,
          max_api_calls_per_day,
          subdomain,
          custom_domain,
          metadata,
          tenant_branding(*),
          tenant_features(*)
        `)
        .eq('id', tenantId)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        data: data as TenantDetails
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'API_ERROR'
      };
    }
  }

  async setupDomain(domainSetup: DomainSetupRequest): Promise<ApiResponse> {
    try {
      await this.validateRequest('tenant_admin');
      
      const { data, error } = await supabase
        .from('domain_mappings')
        .insert({
          domain: domainSetup.domain,
          tenant_id: domainSetup.tenantId,
          portal_mappings: {
            type: domainSetup.portalType,
            ssl_enabled: domainSetup.sslEnabled || true
          },
          ssl_status: 'pending',
          is_active: true,
          is_verified: false
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Trigger background job for DNS verification and SSL provisioning
      await this.triggerDomainVerification(data.id);

      return {
        success: true,
        data: data,
        code: 'DOMAIN_SETUP_INITIATED'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'DOMAIN_SETUP_ERROR'
      };
    }
  }

  async getTenantBranding(tenantId: string): Promise<ApiResponse> {
    try {
      const { data, error } = await supabase
        .from('tenant_branding')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is OK
        throw new Error(error.message);
      }

      return {
        success: true,
        data: data || {
          primary_color: '#10B981',
          secondary_color: '#065F46',
          accent_color: '#F59E0B',
          app_name: 'KisanShakti AI',
          logo_url: null
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'BRANDING_ERROR'
      };
    }
  }

  private async triggerDomainVerification(domainMappingId: string): Promise<void> {
    // This would typically call a background job service
    // For now, we'll just log and could implement with Supabase Edge Functions
    console.log(`Triggering domain verification for mapping: ${domainMappingId}`);
    
    // In a real implementation, this would:
    // 1. Verify DNS records
    // 2. Request SSL certificate
    // 3. Update domain_mappings status
  }
}

export const apiGateway = new ApiGateway();

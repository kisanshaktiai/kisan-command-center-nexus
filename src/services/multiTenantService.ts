
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TenantContext {
  tenant_id: string;
  subdomain?: string;
  custom_domain?: string;
  branding: {
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    app_name: string;
    logo_url?: string;
  };
  features: Record<string, boolean>;
  limits: {
    farmers: number;
    dealers: number;
    products: number;
    storage: number;
    api_calls: number;
  };
}

export class MultiTenantService {
  private static currentTenant: TenantContext | null = null;

  // Detect tenant from subdomain or custom domain
  static async detectTenant(hostname: string): Promise<TenantContext | null> {
    try {
      console.log('MultiTenantService: Detecting tenant from hostname:', hostname);

      // Check if it's a custom domain first
      let { data, error } = await supabase
        .from('tenants')
        .select(`
          id,
          name,
          slug,
          subdomain,
          custom_domain,
          subscription_plan,
          max_farmers,
          max_dealers,
          max_products,
          max_storage_gb,
          max_api_calls_per_day,
          tenant_branding (
            primary_color,
            secondary_color,
            accent_color,
            app_name,
            logo_url
          ),
          tenant_features (
            ai_chat,
            weather_forecast,
            marketplace,
            community_forum,
            satellite_imagery,
            soil_testing,
            drone_monitoring,
            iot_integration,
            ecommerce,
            payment_gateway,
            inventory_management,
            logistics_tracking,
            basic_analytics,
            advanced_analytics,
            predictive_analytics,
            custom_reports,
            api_access,
            webhook_support,
            third_party_integrations,
            white_label_mobile_app
          )
        `)
        .eq('custom_domain', hostname)
        .eq('status', 'active')
        .single();

      // If not found by custom domain, check subdomain
      if (error || !data) {
        const subdomain = hostname.split('.')[0];
        const response = await supabase
          .from('tenants')
          .select(`
            id,
            name,
            slug,
            subdomain,
            custom_domain,
            subscription_plan,
            max_farmers,
            max_dealers,
            max_products,
            max_storage_gb,
            max_api_calls_per_day,
            tenant_branding (
              primary_color,
              secondary_color,
              accent_color,
              app_name,
              logo_url
            ),
            tenant_features (
              ai_chat,
              weather_forecast,
              marketplace,
              community_forum,
              satellite_imagery,
              soil_testing,
              drone_monitoring,
              iot_integration,
              ecommerce,
              payment_gateway,
              inventory_management,
              logistics_tracking,
              basic_analytics,
              advanced_analytics,
              predictive_analytics,
              custom_reports,
              api_access,
              webhook_support,
              third_party_integrations,
              white_label_mobile_app
            )
          `)
          .eq('subdomain', subdomain)
          .eq('status', 'active')
          .single();

        data = response.data;
        error = response.error;
      }

      if (error || !data) {
        console.warn('MultiTenantService: Tenant not found for hostname:', hostname);
        return null;
      }

      // Transform the data into TenantContext
      const tenantContext: TenantContext = {
        tenant_id: data.id,
        subdomain: data.subdomain,
        custom_domain: data.custom_domain,
        branding: {
          primary_color: data.tenant_branding?.[0]?.primary_color || '#10B981',
          secondary_color: data.tenant_branding?.[0]?.secondary_color || '#065F46',
          accent_color: data.tenant_branding?.[0]?.accent_color || '#F59E0B',
          app_name: data.tenant_branding?.[0]?.app_name || data.name,
          logo_url: data.tenant_branding?.[0]?.logo_url,
        },
        features: data.tenant_features?.[0] || {},
        limits: {
          farmers: data.max_farmers || 1000,
          dealers: data.max_dealers || 50,
          products: data.max_products || 100,
          storage: data.max_storage_gb || 10,
          api_calls: data.max_api_calls_per_day || 10000,
        },
      };

      console.log('MultiTenantService: Tenant detected successfully:', tenantContext);
      this.currentTenant = tenantContext;
      return tenantContext;
    } catch (error) {
      console.error('MultiTenantService: Error detecting tenant:', error);
      return null;
    }
  }

  // Get current tenant context
  static getCurrentTenant(): TenantContext | null {
    return this.currentTenant;
  }

  // Set current tenant context (for testing or manual setup)
  static setCurrentTenant(tenant: TenantContext): void {
    this.currentTenant = tenant;
  }

  // Apply tenant branding to DOM
  static applyTenantBranding(branding: TenantContext['branding']): void {
    try {
      const root = document.documentElement;
      
      // Apply CSS custom properties for theming
      root.style.setProperty('--tenant-primary', branding.primary_color);
      root.style.setProperty('--tenant-secondary', branding.secondary_color);
      root.style.setProperty('--tenant-accent', branding.accent_color);

      // Update document title
      if (branding.app_name) {
        document.title = branding.app_name;
      }

      // Update favicon if logo_url exists
      if (branding.logo_url) {
        const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        if (favicon) {
          favicon.href = branding.logo_url;
        }
      }

      console.log('MultiTenantService: Tenant branding applied successfully');
    } catch (error) {
      console.error('MultiTenantService: Error applying tenant branding:', error);
    }
  }

  // Check if a feature is enabled for current tenant
  static isFeatureEnabled(featureName: string): boolean {
    if (!this.currentTenant) return false;
    return this.currentTenant.features[featureName] === true;
  }

  // Check if tenant is within limits
  static checkLimit(limitType: keyof TenantContext['limits'], currentValue: number): boolean {
    if (!this.currentTenant) return false;
    return currentValue < this.currentTenant.limits[limitType];
  }

  // Get tenant-scoped Supabase client
  static getTenantScopedClient() {
    const client = supabase;
    const tenantId = this.currentTenant?.tenant_id;

    if (!tenantId) {
      throw new Error('No tenant context available');
    }

    return {
      ...client,
      from: (tableName: string) => {
        return client.from(tableName).eq('tenant_id', tenantId);
      },
      getTenantId: () => tenantId,
    };
  }

  // Initialize tenant context from URL
  static async initializeTenantFromURL(): Promise<TenantContext | null> {
    try {
      const hostname = window.location.hostname;
      
      // Skip tenant detection for localhost or main domain
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('lovable.app')) {
        console.log('MultiTenantService: Skipping tenant detection for development/main domain');
        return null;
      }

      const tenant = await this.detectTenant(hostname);
      
      if (tenant) {
        this.applyTenantBranding(tenant.branding);
        return tenant;
      }

      return null;
    } catch (error) {
      console.error('MultiTenantService: Error initializing tenant from URL:', error);
      return null;
    }
  }

  // Validate tenant access for API calls
  static validateTenantAccess(requiredFeature?: string): boolean {
    if (!this.currentTenant) {
      toast.error('No tenant context available');
      return false;
    }

    if (requiredFeature && !this.isFeatureEnabled(requiredFeature)) {
      toast.error(`Feature "${requiredFeature}" is not enabled for this tenant`);
      return false;
    }

    return true;
  }
}

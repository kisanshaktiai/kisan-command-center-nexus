import { supabase } from '@/integrations/supabase/client';
import { BaseService, ServiceResult } from './BaseService';

/**
 * White Label Sync Service
 * Makes white_label_configs the source of truth for tenant branding/domain data
 * Handles bidirectional sync between tenants and white_label_configs tables
 */
export class WhiteLabelSyncService extends BaseService {
  private static instance: WhiteLabelSyncService;

  private constructor() {
    super();
  }

  public static getInstance(): WhiteLabelSyncService {
    if (!WhiteLabelSyncService.instance) {
      WhiteLabelSyncService.instance = new WhiteLabelSyncService();
    }
    return WhiteLabelSyncService.instance;
  }

  /**
   * Create white_label_config for a new tenant with initial branding data
   */
  async createWhiteLabelConfig(tenantId: string, brandingData?: any): Promise<ServiceResult<any>> {
    return this.executeOperation(
      async () => {
        // Check if config already exists
        const { data: existing } = await supabase
          .from('white_label_configs')
          .select('id')
          .eq('tenant_id', tenantId)
          .single();

        if (existing) {
          console.log('White-label config already exists for tenant:', tenantId);
          return existing;
        }

        // Get current user for audit
        const { data: { user } } = await supabase.auth.getUser();

        // Create initial config with defaults + provided data
        const configData = {
          tenant_id: tenantId,
          brand_identity: {
            primary_color: brandingData?.primary_color || '#3b82f6',
            secondary_color: brandingData?.secondary_color || '#64748b',
            accent_color: brandingData?.accent_color || '#10b981',
            font_family: brandingData?.font_family || 'Inter',
            company_name: brandingData?.company_name || '',
            app_name: brandingData?.app_name || '',
            tagline: brandingData?.tagline || '',
            logo_url: brandingData?.logo_url || ''
          },
          domain_config: {
            custom_domain: brandingData?.custom_domain || '',
            subdomain: brandingData?.subdomain || '',
            ssl_enabled: true,
            redirect_urls: []
          },
          theme_colors: brandingData?.theme_colors || {},
          email_templates: {
            header_color: brandingData?.primary_color || '#3b82f6',
            footer_text: 'Powered by KisanShaktiAI'
          },
          app_store_config: {
            category: 'Agriculture',
            keywords: ['agriculture', 'farming', 'crops']
          },
          pwa_config: {
            display: 'standalone',
            orientation: 'portrait',
            theme_color: brandingData?.primary_color || '#3b82f6',
            background_color: '#ffffff',
            icons: []
          },
          splash_screens: {},
          css_injection: {
            enabled: false,
            custom_css: '',
            mobile_css: '',
            print_css: ''
          },
          app_customization: {
            animations_enabled: true,
            respect_reduce_motion: true,
            transition_duration: 300,
            visible_modules: {}
          },
          content_management: {
            custom_messaging_enabled: false,
            faq_items: []
          },
          distribution: {
            pwa_enabled: false,
            pwa_offline_support: false,
            auto_updates: true,
            update_check_interval: 24
          },
          domain_health: {
            ssl_status: 'pending' as const,
            dns_status: 'pending' as const,
            performance_score: 0,
            uptime_percentage: 0,
            last_checked: new Date().toISOString()
          },
          is_active: true,
          created_by: user?.id,
          updated_by: user?.id
        };

        const { data, error } = await supabase
          .from('white_label_configs')
          .insert(configData)
          .select()
          .single();

        if (error) throw error;

        console.log('Created white-label config for tenant:', tenantId);
        return data;
      },
      'createWhiteLabelConfig'
    );
  }

  /**
   * Sync tenant data FROM white_label_configs TO tenants table
   * This keeps minimal branding info in tenants table for quick access
   */
  async syncToTenant(tenantId: string): Promise<ServiceResult<boolean>> {
    return this.executeOperation(
      async () => {
        // Get white_label_config (source of truth)
        const { data: wlConfig, error: wlError } = await supabase
          .from('white_label_configs')
          .select('*')
          .eq('tenant_id', tenantId)
          .single();

        if (wlError || !wlConfig) {
          throw new Error('White-label config not found for tenant');
        }

        // Extract branding data with type safety
        const brandIdentity = (wlConfig.brand_identity as any) || {};
        const domainConfig = (wlConfig.domain_config as any) || {};

        // Update tenant with synchronized data
        const { error: updateError } = await supabase
          .from('tenants')
          .update({
            subdomain: domainConfig.subdomain || null,
            custom_domain: domainConfig.custom_domain || null,
            metadata: {
              branding_synced_from_wl: true,
              branding_sync_at: new Date().toISOString(),
              white_label_config_id: wlConfig.id
            }
          })
          .eq('id', tenantId);

        if (updateError) throw updateError;

        console.log('Synced white-label config to tenant:', tenantId);
        return true;
      },
      'syncToTenant'
    );
  }

  /**
   * Sync tenant data FROM tenants TO white_label_configs
   * Use this when tenant is updated and we need to reflect changes in white_label_configs
   */
  async syncFromTenant(tenantId: string, tenantData: any): Promise<ServiceResult<boolean>> {
    return this.executeOperation(
      async () => {
        // Get current white_label_config
        const { data: wlConfig, error: wlError } = await supabase
          .from('white_label_configs')
          .select('*')
          .eq('tenant_id', tenantId)
          .single();

        if (wlError) {
          // If config doesn't exist, create it
          await this.createWhiteLabelConfig(tenantId, tenantData);
          return true;
        }

        // Get current user for audit
        const { data: { user } } = await supabase.auth.getUser();

        // Merge tenant data into white_label_config with type safety
        const updates: any = {
          updated_by: user?.id,
          updated_at: new Date().toISOString()
        };

        const wlDomainConfig = (wlConfig.domain_config as any) || {};
        const wlBrandIdentity = (wlConfig.brand_identity as any) || {};

        // Sync domain data
        if (tenantData.subdomain || tenantData.custom_domain) {
          updates.domain_config = {
            ...wlDomainConfig,
            subdomain: tenantData.subdomain || wlDomainConfig.subdomain,
            custom_domain: tenantData.custom_domain || wlDomainConfig.custom_domain
          };
        }

        // Sync branding from metadata if exists
        const metadata = tenantData.metadata as any;
        if (metadata?.branding) {
          updates.brand_identity = {
            ...wlBrandIdentity,
            ...metadata.branding
          };
        }

        const { error: updateError } = await supabase
          .from('white_label_configs')
          .update(updates)
          .eq('tenant_id', tenantId);

        if (updateError) throw updateError;

        console.log('Synced tenant data to white-label config:', tenantId);
        return true;
      },
      'syncFromTenant'
    );
  }

  /**
   * Fix existing data mismatches for all tenants
   * Creates missing white_label_configs and syncs data
   */
  async fixAllTenantsData(): Promise<ServiceResult<{ fixed: number; errors: string[] }>> {
    return this.executeOperation(
      async () => {
        // Get all tenants
        const { data: tenants, error: tenantsError } = await supabase
          .from('tenants')
          .select('id, name, subdomain, custom_domain, metadata');

        if (tenantsError) throw tenantsError;

        const errors: string[] = [];
        let fixed = 0;

        for (const tenant of tenants || []) {
          try {
            // Check if white_label_config exists
            const { data: wlConfig } = await supabase
              .from('white_label_configs')
              .select('id')
              .eq('tenant_id', tenant.id)
              .single();

            if (!wlConfig) {
              // Create missing config
              const tenantMetadata = tenant.metadata as any;
              const brandingData = {
                subdomain: tenant.subdomain,
                custom_domain: tenant.custom_domain,
                ...(tenantMetadata?.branding || {})
              };

              await this.createWhiteLabelConfig(tenant.id, brandingData);
              fixed++;
              console.log(`Created white-label config for tenant: ${tenant.name}`);
            } else {
              // Sync existing data
              await this.syncToTenant(tenant.id);
              fixed++;
              console.log(`Synced white-label config for tenant: ${tenant.name}`);
            }
          } catch (error: any) {
            errors.push(`${tenant.name}: ${error.message}`);
            console.error(`Error fixing tenant ${tenant.name}:`, error);
          }
        }

        return { fixed, errors };
      },
      'fixAllTenantsData'
    );
  }

  /**
   * Update white_label_config and sync back to tenant
   * This is the primary update method to use when modifying branding
   */
  async updateWhiteLabelConfig(
    tenantId: string, 
    updates: any
  ): Promise<ServiceResult<any>> {
    return this.executeOperation(
      async () => {
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
          .from('white_label_configs')
          .update({
            ...updates,
            updated_by: user?.id,
            updated_at: new Date().toISOString()
          })
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (error) throw error;

        // Sync critical data back to tenant
        await this.syncToTenant(tenantId);

        return data;
      },
      'updateWhiteLabelConfig'
    );
  }
}

export const whiteLabelSyncService = WhiteLabelSyncService.getInstance();

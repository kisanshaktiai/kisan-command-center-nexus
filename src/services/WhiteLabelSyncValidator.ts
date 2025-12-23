import { supabase } from '@/integrations/supabase/client';

/**
 * White Label Sync Validator
 * Validates that tenant data is in sync with white_label_configs
 */
export class WhiteLabelSyncValidator {
  /**
   * Check if tenant data is in sync with white_label_configs
   */
  static async validateSync(tenantId: string): Promise<{
    isInSync: boolean;
    differences: string[];
  }> {
    // Fetch both records with new domain_config structure
    const [wlResult, tenantResult] = await Promise.all([
      supabase
        .from('white_label_configs')
        .select('domain_config')
        .eq('tenant_id', tenantId)
        .single(),
      supabase
        .from('tenants')
        .select('domain_config, subdomain, custom_domain')
        .eq('id', tenantId)
        .single()
    ]);

    if (wlResult.error || tenantResult.error) {
      return { isInSync: false, differences: ['Failed to fetch data'] };
    }

    const wlConfig = wlResult.data;
    const tenant = tenantResult.data;
    const wlDomainConfig = (wlConfig.domain_config as any) || {};
    const tenantDomainConfig = (tenant.domain_config as any) || {};
    
    const differences: string[] = [];

    // Check if using new triple domain structure
    const isTripleDomain = wlDomainConfig.public_website !== undefined;

    if (isTripleDomain) {
      // NEW STRUCTURE: Compare triple domain configs
      
      // Compare public_website
      const wlPublic = wlDomainConfig.public_website?.custom_domain || '';
      const tenantPublic = tenantDomainConfig.public_website?.custom_domain || '';
      if (wlPublic !== tenantPublic) {
        differences.push(`Public Website domain mismatch: WL="${wlPublic}" vs Tenant="${tenantPublic}"`);
      }

      // Compare tenant_portal
      const wlPortal = wlDomainConfig.tenant_portal?.custom_domain || '';
      const tenantPortal = tenantDomainConfig.tenant_portal?.custom_domain || '';
      if (wlPortal !== tenantPortal) {
        differences.push(`Tenant Portal domain mismatch: WL="${wlPortal}" vs Tenant="${tenantPortal}"`);
      }

      // Compare farmer_app
      const wlFarmer = wlDomainConfig.farmer_app?.custom_domain || '';
      const tenantFarmer = tenantDomainConfig.farmer_app?.custom_domain || '';
      if (wlFarmer !== tenantFarmer) {
        differences.push(`Farmer App domain mismatch: WL="${wlFarmer}" vs Tenant="${tenantFarmer}"`);
      }
    } else {
      // OLD STRUCTURE: Compare flat domain config
      if (wlDomainConfig.subdomain !== tenant.subdomain) {
        differences.push(`Subdomain mismatch: WL="${wlDomainConfig.subdomain}" vs Tenant="${tenant.subdomain}"`);
      }

      if (wlDomainConfig.custom_domain !== tenant.custom_domain) {
        differences.push(`Custom domain mismatch: WL="${wlDomainConfig.custom_domain}" vs Tenant="${tenant.custom_domain}"`);
      }
    }

    return {
      isInSync: differences.length === 0,
      differences
    };
  }

  /**
   * Validate sync for all tenants
   */
  static async validateAllTenants(): Promise<{
    total: number;
    inSync: number;
    outOfSync: number;
    details: Array<{ tenantId: string; tenantName: string; differences: string[] }>;
  }> {
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, name');

    if (!tenants) {
      return { total: 0, inSync: 0, outOfSync: 0, details: [] };
    }

    const results = await Promise.all(
      tenants.map(async (tenant) => {
        const validation = await this.validateSync(tenant.id);
        return {
          tenantId: tenant.id,
          tenantName: tenant.name,
          isInSync: validation.isInSync,
          differences: validation.differences
        };
      })
    );

    const outOfSync = results.filter(r => !r.isInSync);

    return {
      total: results.length,
      inSync: results.length - outOfSync.length,
      outOfSync: outOfSync.length,
      details: outOfSync
    };
  }
}

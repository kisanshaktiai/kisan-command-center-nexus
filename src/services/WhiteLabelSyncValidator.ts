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
    // Fetch both records
    const [wlResult, tenantResult] = await Promise.all([
      supabase
        .from('white_label_configs')
        .select('domain_config')
        .eq('tenant_id', tenantId)
        .single(),
      supabase
        .from('tenants')
        .select('subdomain, custom_domain')
        .eq('id', tenantId)
        .single()
    ]);

    if (wlResult.error || tenantResult.error) {
      return { isInSync: false, differences: ['Failed to fetch data'] };
    }

    const wlConfig = wlResult.data;
    const tenant = tenantResult.data;
    const domainConfig = (wlConfig.domain_config as any) || {};
    
    const differences: string[] = [];

    if (domainConfig.subdomain !== tenant.subdomain) {
      differences.push(`Subdomain mismatch: WL="${domainConfig.subdomain}" vs Tenant="${tenant.subdomain}"`);
    }

    if (domainConfig.custom_domain !== tenant.custom_domain) {
      differences.push(`Custom domain mismatch: WL="${domainConfig.custom_domain}" vs Tenant="${tenant.custom_domain}"`);
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

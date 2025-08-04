
import { BaseService } from './BaseService';
import { supabase } from '@/integrations/supabase/client';

export abstract class TenantAwareService extends BaseService {
  protected currentTenantId: string | null = null;

  constructor() {
    super();
    this.initializeTenant();
  }

  private async initializeTenant() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get user's active tenant
        const { data: userTenants } = await supabase
          .from('user_tenants')
          .select('tenant_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        
        this.currentTenantId = userTenants?.tenant_id || null;
      }
    } catch (error) {
      console.warn('Could not initialize tenant context:', error);
    }
  }

  protected async getTenantId(): Promise<string | null> {
    if (!this.currentTenantId) {
      await this.initializeTenant();
    }
    return this.currentTenantId;
  }

  protected async withTenantFilter<T>(query: any): Promise<T> {
    const tenantId = await this.getTenantId();
    if (tenantId) {
      return query.eq('tenant_id', tenantId);
    }
    return query;
  }

  protected async ensureTenantAccess(resourceTenantId?: string): Promise<boolean> {
    const currentTenantId = await this.getTenantId();
    if (!currentTenantId) {
      throw new Error('No tenant context available');
    }
    if (resourceTenantId && resourceTenantId !== currentTenantId) {
      throw new Error('Access denied: Resource belongs to different tenant');
    }
    return true;
  }
}

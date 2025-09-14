
import { supabase } from '@/integrations/supabase/client';
import { CreateTenantDTO, UpdateTenantDTO, Tenant, createTenantID, convertDatabaseTenant } from '@/types/tenant';

export interface TenantBusinessResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Tenant Business Service
 * Handles all tenant-related business logic and rules
 */
export class TenantBusinessService {
  private static instance: TenantBusinessService;

  static getInstance(): TenantBusinessService {
    if (!TenantBusinessService.instance) {
      TenantBusinessService.instance = new TenantBusinessService();
    }
    return TenantBusinessService.instance;
  }

  /**
   * Create a new tenant with business validation
   */
  async createTenant(data: CreateTenantDTO): Promise<TenantBusinessResult<Tenant>> {
    try {
      // Get current authenticated user - this is required
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { success: false, error: 'Authentication required to create tenant' };
      }

      // Validate business rules
      const validation = await this.validateTenantCreation(data);
      if (!validation.success) {
        return { success: false, error: validation.error };
      }

      // Prepare tenant data with authenticated user's ID
      const tenantDataWithCreator = {
        ...data,
        created_by: user.id
      };

      // Create tenant
      const { data: tenant, error } = await supabase
        .from('tenants')
        .insert(tenantDataWithCreator)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: convertDatabaseTenant(tenant) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create tenant'
      };
    }
  }

  /**
   * Update tenant with business validation
   */
  async updateTenant(id: string, data: UpdateTenantDTO): Promise<TenantBusinessResult<Tenant>> {
    try {
      // Get current authenticated user for audit trail
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      // Validate business rules
      const validation = await this.validateTenantUpdate(id, data);
      if (!validation.success) {
        return { success: false, error: validation.error };
      }

      // Prepare update data with audit information
      const updateDataWithAudit = {
        ...data,
        updated_at: new Date().toISOString()
      };

      // Add updated_by if we have an authenticated user
      if (!authError && user) {
        updateDataWithAudit.metadata = {
          ...updateDataWithAudit.metadata,
          updated_by: user.id,
          last_updated: new Date().toISOString()
        };
      }

      // Update tenant
      const { data: tenant, error } = await supabase
        .from('tenants')
        .update(updateDataWithAudit)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: convertDatabaseTenant(tenant) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update tenant'
      };
    }
  }

  /**
   * Suspend tenant (soft delete)
   */
  async suspendTenant(id: string, reason?: string): Promise<TenantBusinessResult<boolean>> {
    try {
      const { data, error } = await supabase.rpc('suspend_tenant', {
        p_tenant_id: id,
        p_reason: reason || 'Suspended by admin'
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const result = data as any;
      if (!result?.success) {
        return { success: false, error: result?.error || 'Failed to suspend tenant' };
      }

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to suspend tenant'
      };
    }
  }

  /**
   * Reactivate suspended tenant
   */
  async reactivateTenant(id: string): Promise<TenantBusinessResult<boolean>> {
    try {
      const { data, error } = await supabase.rpc('reactivate_tenant', {
        p_tenant_id: id
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const result = data as any;
      if (!result?.success) {
        return { success: false, error: result?.error || 'Failed to reactivate tenant' };
      }

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reactivate tenant'
      };
    }
  }

  /**
   * Validate tenant creation business rules
   */
  private async validateTenantCreation(data: CreateTenantDTO): Promise<TenantBusinessResult> {
    const errors: string[] = [];

    // Required fields validation
    if (!data.name?.trim()) {
      errors.push('Tenant name is required');
    }

    if (!data.slug?.trim()) {
      errors.push('Tenant slug is required');
    }

    if (!data.owner_email?.trim()) {
      errors.push('Owner email is required');
    }

    // Email format validation
    if (data.owner_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.owner_email)) {
      errors.push('Invalid email format');
    }

    // Check slug availability
    if (data.slug) {
      const { data: existing } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', data.slug)
        .single();

      if (existing) {
        errors.push('Slug is already taken');
      }
    }

    if (errors.length > 0) {
      return { success: false, error: errors.join(', ') };
    }

    return { success: true };
  }

  /**
   * Validate tenant update business rules
   */
  private async validateTenantUpdate(id: string, data: UpdateTenantDTO): Promise<TenantBusinessResult> {
    const errors: string[] = [];

    // Email format validation if provided
    if (data.owner_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.owner_email)) {
      errors.push('Invalid email format');
    }

    if (errors.length > 0) {
      return { success: false, error: errors.join(', ') };
    }

    return { success: true };
  }
}

export const tenantBusinessService = TenantBusinessService.getInstance();

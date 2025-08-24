
import { supabase } from '@/integrations/supabase/client';
import { CreateTenantDTO, UpdateTenantDTO, Tenant } from '@/types/tenant';

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
      // Validate business rules
      const validation = await this.validateTenantCreation(data);
      if (!validation.success) {
        return { success: false, error: validation.error };
      }

      // Create tenant
      const { data: tenant, error } = await supabase
        .from('tenants')
        .insert(data)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: tenant };
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
      // Validate business rules
      const validation = await this.validateTenantUpdate(id, data);
      if (!validation.success) {
        return { success: false, error: validation.error };
      }

      // Update tenant
      const { data: tenant, error } = await supabase
        .from('tenants')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: tenant };
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

    // Check slug availability if changing
    if (data.slug) {
      const { data: existing } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', data.slug)
        .neq('id', id)
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
}

export const tenantBusinessService = TenantBusinessService.getInstance();

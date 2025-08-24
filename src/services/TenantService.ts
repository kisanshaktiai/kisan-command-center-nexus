
import { BaseService, ServiceResult } from '@/services/BaseService';
import { CreateTenantDTO, UpdateTenantDTO, TenantFilters, Tenant, convertDatabaseTenant } from '@/types/tenant';
import { supabase } from '@/integrations/supabase/client';

/**
 * Consolidated Tenant Service
 * Single source of truth for all tenant operations
 */
export class TenantService extends BaseService {
  private static instance: TenantService;

  private constructor() {
    super();
  }

  public static getInstance(): TenantService {
    if (!TenantService.instance) {
      TenantService.instance = new TenantService();
    }
    return TenantService.instance;
  }

  async getAllTenants(filters?: TenantFilters): Promise<ServiceResult<Tenant[]>> {
    return this.executeOperation(
      async () => {
        let query = supabase
          .from('tenants')
          .select(`
            *,
            tenant_subscriptions (
              id,
              subscription_plan,
              status,
              current_period_start,
              current_period_end
            ),
            tenant_features (*),
            tenant_branding (*)
          `)
          .order('created_at', { ascending: false });

        // Apply filters
        if (filters?.search) {
          query = query.ilike('name', `%${filters.search}%`);
        }
        if (filters?.type && filters.type !== 'all') {
          query = query.eq('type', filters.type);
        }
        if (filters?.status && filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map(convertDatabaseTenant);
      },
      'getAllTenants'
    );
  }

  async getTenantById(id: string): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      async () => {
        const { data, error } = await supabase
          .from('tenants')
          .select(`
            *,
            tenant_subscriptions (*),
            tenant_features (*),
            tenant_branding (*)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        return convertDatabaseTenant(data);
      },
      'getTenantById'
    );
  }

  async createTenant(data: CreateTenantDTO): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      async () => {
        const { data: result, error } = await supabase
          .from('tenants')
          .insert(data)
          .select()
          .single();

        if (error) throw error;
        return convertDatabaseTenant(result);
      },
      'createTenant'
    );
  }

  async updateTenant(id: string, data: UpdateTenantDTO): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      async () => {
        const { data: result, error } = await supabase
          .from('tenants')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return convertDatabaseTenant(result);
      },
      'updateTenant'
    );
  }

  async suspendTenant(id: string, reason?: string): Promise<ServiceResult<boolean>> {
    return this.executeOperation(
      async () => {
        const { data, error } = await supabase.rpc('suspend_tenant', {
          p_tenant_id: id,
          p_reason: reason || 'Suspended by admin'
        });

        if (error) throw error;
        return data?.success || false;
      },
      'suspendTenant'
    );
  }

  async reactivateTenant(id: string): Promise<ServiceResult<boolean>> {
    return this.executeOperation(
      async () => {
        const { data, error } = await supabase.rpc('reactivate_tenant', {
          p_tenant_id: id
        });

        if (error) throw error;
        return data?.success || false;
      },
      'reactivateTenant'
    );
  }

  async getMetrics(tenantId: string): Promise<ServiceResult<any>> {
    return this.executeOperation(
      async () => {
        const { data, error } = await supabase.functions.invoke('tenant-real-time-metrics', {
          body: { tenant_id: tenantId }
        });

        if (error) throw error;
        return data;
      },
      'getMetrics'
    );
  }
}

export const tenantService = TenantService.getInstance();

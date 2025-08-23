
import { supabase } from '@/integrations/supabase/client';
import { BaseService, ServiceResult } from '@/services/BaseService';
import { CreateTenantDTO, UpdateTenantDTO, Tenant, TenantFilters, convertDatabaseTenant, TenantType, TenantStatus, SubscriptionPlan } from '@/types/tenant';

export class TenantRepository extends BaseService {
  private static instance: TenantRepository;

  private constructor() {
    super();
  }

  public static getInstance(): TenantRepository {
    if (!TenantRepository.instance) {
      TenantRepository.instance = new TenantRepository();
    }
    return TenantRepository.instance;
  }

  async getTenants(filters?: TenantFilters): Promise<ServiceResult<Tenant[]>> {
    return this.executeOperation(
      async () => {
        let query = supabase
          .from('tenants')
          .select(`
            *,
            tenant_branding (*),
            tenant_features (*)
          `)
          .order('created_at', { ascending: false });

        // Apply filters
        if (filters?.search) {
          query = query.or(`name.ilike.%${filters.search}%,owner_email.ilike.%${filters.search}%`);
        }
        if (filters?.type && filters.type !== 'all') {
          query = query.eq('type', filters.type as any);
        }
        if (filters?.status && filters.status !== 'all') {
          query = query.eq('status', filters.status as any);
        }

        const { data, error } = await query;

        if (error) throw error;
        if (!data) return [];

        return data.map((item: any) => convertDatabaseTenant(item));
      },
      'getTenants'
    );
  }

  async getTenant(id: string): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      async () => {
        const { data, error } = await supabase
          .from('tenants')
          .select(`
            *,
            tenant_branding (*),
            tenant_features (*)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        if (!data) throw new Error('Tenant not found');

        return convertDatabaseTenant(data);
      },
      'getTenant'
    );
  }

  async createTenant(data: CreateTenantDTO): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      async () => {
        // Ensure required fields have defaults
        const tenantData = {
          type: TenantType.AGRI_COMPANY,
          status: TenantStatus.TRIAL,
          subscription_plan: SubscriptionPlan.KISAN_BASIC,
          ...data,
          metadata: data.metadata || {}
        };

        const { data: tenant, error } = await supabase
          .from('tenants')
          .insert(tenantData as any)
          .select()
          .single();

        if (error) throw error;
        return convertDatabaseTenant(tenant);
      },
      'createTenant'
    );
  }

  async updateTenant(id: string, data: UpdateTenantDTO): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      async () => {
        const { id: _, ...updateData } = data;
        const { data: tenant, error } = await supabase
          .from('tenants')
          .update(updateData as any)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return convertDatabaseTenant(tenant);
      },
      'updateTenant'
    );
  }

  async deleteTenant(id: string): Promise<ServiceResult<boolean>> {
    return this.executeOperation(
      async () => {
        const { error } = await supabase
          .from('tenants')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return true;
      },
      'deleteTenant'
    );
  }
}

export const tenantRepository = TenantRepository.getInstance();

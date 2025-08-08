
import { BaseService, ServiceResult } from '@/services/BaseService';
import { supabase } from '@/integrations/supabase/client';
import { CreateTenantDTO, UpdateTenantDTO, TenantDTO } from '@/data/types/tenant';
import { TenantType, TenantStatus } from '@/types/tenant';

export interface TenantFilters {
  search?: string;
  type?: string;
  status?: string;
}

export class TenantApiService extends BaseService {
  private static instance: TenantApiService;

  private constructor() {
    super();
  }

  public static getInstance(): TenantApiService {
    if (!TenantApiService.instance) {
      TenantApiService.instance = new TenantApiService();
    }
    return TenantApiService.instance;
  }

  async getTenants(filters?: TenantFilters): Promise<ServiceResult<TenantDTO[]>> {
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
            tenant_features (*)
          `)
          .order('created_at', { ascending: false });

        // Apply filters
        if (filters?.search) {
          query = query.or(`name.ilike.%${filters.search}%,slug.ilike.%${filters.search}%`);
        }
        
        if (filters?.type) {
          query = query.eq('type', filters.type);
        }
        
        if (filters?.status) {
          query = query.eq('status', filters.status);
        }

        const { data, error } = await query;
        
        if (error) throw error;
        
        return (data || []).map((tenant: any): TenantDTO => ({
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          type: tenant.type as TenantType,
          status: tenant.status as TenantStatus,
          subscription_plan: tenant.subscription_plan,
          created_at: tenant.created_at,
          updated_at: tenant.updated_at,
          owner_email: tenant.owner_email,
          owner_name: tenant.owner_name,
          owner_phone: tenant.owner_phone,
          business_registration: tenant.business_registration,
          business_address: tenant.business_address,
          established_date: tenant.established_date,
          subscription_start_date: tenant.subscription_start_date,
          subscription_end_date: tenant.subscription_end_date,
          trial_ends_at: tenant.trial_ends_at,
          max_farmers: tenant.max_farmers,
          max_dealers: tenant.max_dealers,
          max_products: tenant.max_products,
          max_storage_gb: tenant.max_storage_gb,
          max_api_calls_per_day: tenant.max_api_calls_per_day,
          subdomain: tenant.subdomain,
          custom_domain: tenant.custom_domain,
          metadata: tenant.metadata,
        }));
      },
      'getTenants'
    );
  }

  async getTenantById(id: string): Promise<ServiceResult<TenantDTO>> {
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
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error('Tenant not found');

        return {
          id: data.id,
          name: data.name,
          slug: data.slug,
          type: data.type as TenantType,
          status: data.status as TenantStatus,
          subscription_plan: data.subscription_plan,
          created_at: data.created_at,
          updated_at: data.updated_at,
          owner_email: data.owner_email,
          owner_name: data.owner_name,
          owner_phone: data.owner_phone,
          business_registration: data.business_registration,
          business_address: data.business_address,
          established_date: data.established_date,
          subscription_start_date: data.subscription_start_date,
          subscription_end_date: data.subscription_end_date,
          trial_ends_at: data.trial_ends_at,
          max_farmers: data.max_farmers,
          max_dealers: data.max_dealers,
          max_products: data.max_products,
          max_storage_gb: data.max_storage_gb,
          max_api_calls_per_day: data.max_api_calls_per_day,
          subdomain: data.subdomain,
          custom_domain: data.custom_domain,
          metadata: data.metadata,
        } as TenantDTO;
      },
      'getTenantById'
    );
  }

  async createTenant(data: CreateTenantDTO): Promise<ServiceResult<TenantDTO>> {
    return this.executeOperation(
      async () => {
        const { data: tenant, error } = await supabase
          .from('tenants')
          .insert(data)
          .select()
          .single();

        if (error) throw error;
        if (!tenant) throw new Error('Failed to create tenant');

        return {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          type: tenant.type as TenantType,
          status: tenant.status as TenantStatus,
          subscription_plan: tenant.subscription_plan,
          created_at: tenant.created_at,
          updated_at: tenant.updated_at,
          owner_email: tenant.owner_email,
          owner_name: tenant.owner_name,
          owner_phone: tenant.owner_phone,
          business_registration: tenant.business_registration,
          business_address: tenant.business_address,
          established_date: tenant.established_date,
          subscription_start_date: tenant.subscription_start_date,
          subscription_end_date: tenant.subscription_end_date,
          trial_ends_at: tenant.trial_ends_at,
          max_farmers: tenant.max_farmers,
          max_dealers: tenant.max_dealers,
          max_products: tenant.max_products,
          max_storage_gb: tenant.max_storage_gb,
          max_api_calls_per_day: tenant.max_api_calls_per_day,
          subdomain: tenant.subdomain,
          custom_domain: tenant.custom_domain,
          metadata: tenant.metadata,
        } as TenantDTO;
      },
      'createTenant'
    );
  }

  async updateTenant(id: string, data: UpdateTenantDTO): Promise<ServiceResult<TenantDTO>> {
    return this.executeOperation(
      async () => {
        const { data: tenant, error } = await supabase
          .from('tenants')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        if (!tenant) throw new Error('Failed to update tenant');

        return {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          type: tenant.type as TenantType,
          status: tenant.status as TenantStatus,
          subscription_plan: tenant.subscription_plan,
          created_at: tenant.created_at,
          updated_at: tenant.updated_at,
          owner_email: tenant.owner_email,
          owner_name: tenant.owner_name,
          owner_phone: tenant.owner_phone,
          business_registration: tenant.business_registration,
          business_address: tenant.business_address,
          established_date: tenant.established_date,
          subscription_start_date: tenant.subscription_start_date,
          subscription_end_date: tenant.subscription_end_date,
          trial_ends_at: tenant.trial_ends_at,
          max_farmers: tenant.max_farmers,
          max_dealers: tenant.max_dealers,
          max_products: tenant.max_products,
          max_storage_gb: tenant.max_storage_gb,
          max_api_calls_per_day: tenant.max_api_calls_per_day,
          subdomain: tenant.subdomain,
          custom_domain: tenant.custom_domain,
          metadata: tenant.metadata,
        } as TenantDTO;
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

export const tenantApiService = TenantApiService.getInstance();

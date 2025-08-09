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

  private mapTenantFromDatabase(tenant: any): TenantDTO {
    // Helper function to validate and return tenant type
    const getTenantType = (value: any): TenantType => {
      const validTypes = [
        'agri_company', 'dealer', 'ngo', 'government', 
        'university', 'sugar_factory', 'cooperative', 'insurance'
      ] as const;
      
      if (typeof value === 'string') {
        for (const type of validTypes) {
          if (value === type) {
            return type;
          }
        }
      }
      return 'agri_company';
    };

    // Helper function to validate and return tenant status
    const getTenantStatus = (value: any): TenantStatus => {
      const validStatuses = [
        'trial', 'active', 'suspended', 'cancelled', 'archived', 'pending_approval'
      ] as const;
      
      if (typeof value === 'string') {
        for (const status of validStatuses) {
          if (value === status) {
            return status;
          }
        }
      }
      return 'trial';
    };

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      type: getTenantType(tenant.type),
      status: getTenantStatus(tenant.status),
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
    };
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
        
        return (data || []).map((tenant: any) => this.mapTenantFromDatabase(tenant));
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

        return this.mapTenantFromDatabase(data);
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

        return this.mapTenantFromDatabase(tenant);
      },
      'createTenant'
    );
  }

  async updateTenant(id: string, data: UpdateTenantDTO): Promise<ServiceResult<TenantDTO>> {
    return this.executeOperation(
      async () => {
        // Clean the data to ensure no invalid enum values are passed
        const cleanedData = { ...data };
        
        // Remove any fields that might contain invalid enum values
        // The error suggests 'admin' is being passed to a user_role enum
        // Make sure metadata doesn't contain problematic fields
        if (cleanedData.metadata) {
          const { metadata } = cleanedData;
          // Filter out any metadata that might contain role information
          const cleanedMetadata = Object.keys(metadata).reduce((acc, key) => {
            // Skip any fields that might contain role information or other enum conflicts
            if (key === 'role' || key === 'user_role' || key === 'admin_role' || key === 'admin') {
              console.log(`Filtering out potentially problematic metadata field: ${key}`);
              return acc;
            }
            acc[key] = metadata[key];
            return acc;
          }, {} as Record<string, any>);
          
          cleanedData.metadata = cleanedMetadata;
        }

        const { data: tenant, error } = await supabase
          .from('tenants')
          .update(cleanedData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        if (!tenant) throw new Error('Failed to update tenant');

        return this.mapTenantFromDatabase(tenant);
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

import { BaseService, ServiceResult } from '@/services/BaseService';
import { supabase } from '@/integrations/supabase/client';
import { CreateTenantDTO, UpdateTenantDTO, TenantDTO } from '@/data/types/tenant';
import { TenantType, TenantStatus } from '@/types/tenant';

export interface TenantFilters {
  search?: string;
  type?: TenantType;     // ✅ strict enum instead of string
  status?: TenantStatus; // ✅ strict enum instead of string
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

  // ----- Enum helpers (safe narrowing from DB/string) -----
  private static readonly validTypes = [
    'agri_company',
    'dealer',
    'ngo',
    'government',
    'university',
    'sugar_factory',
    'cooperative',
    'insurance',
  ] as const;

  private static readonly validStatuses = [
    'trial',
    'active',
    'suspended',
    'cancelled',
    'archived',
    'pending_approval',
  ] as const;

  private static isTenantType = (v: unknown): v is TenantType =>
    typeof v === 'string' &&
    (TenantApiService.validTypes as readonly string[]).includes(v);

  private static isTenantStatus = (v: unknown): v is TenantStatus =>
    typeof v === 'string' &&
    (TenantApiService.validStatuses as readonly string[]).includes(v);

  private getTenantType(value: unknown): TenantType {
    return TenantApiService.isTenantType(value) ? value : 'agri_company';
  }

  private getTenantStatus(value: unknown): TenantStatus {
    return TenantApiService.isTenantStatus(value) ? value : 'trial';
  }

  private mapTenantFromDatabase(tenant: any): TenantDTO {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      type: this.getTenantType(tenant.type),
      status: this.getTenantStatus(tenant.status),
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

        // Apply filters (TS-safe)
        if (filters?.search && filters.search.trim().length > 0) {
          const s = filters.search.trim();
          // NOTE: Supabase `or` uses comma to join conditions.
          query = query.or(`name.ilike.%${s}%,slug.ilike.%${s}%`);
        }

        if (filters?.type) {
          query = query.eq('type', filters.type); // ✅ enum-safe
        }

        if (filters?.status) {
          query = query.eq('status', filters.status); // ✅ enum-safe
        }

        const { data, error } = await query;

        if (error) throw error;

        return (data ?? []).map((t: any) => this.mapTenantFromDatabase(t));
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

  async createTenant(payload: CreateTenantDTO): Promise<ServiceResult<TenantDTO>> {
    return this.executeOperation(
      async () => {
        // Optional safety: coerce enums before insert
        const data: CreateTenantDTO = {
          ...payload,
          type: this.getTenantType(payload.type),
          status: this.getTenantStatus(payload.status),
        };

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

  async updateTenant(id: string, payload: UpdateTenantDTO): Promise<ServiceResult<TenantDTO>> {
    return this.executeOperation(
      async () => {
        // Clean & coerce enums
        const cleanedData: UpdateTenantDTO = { ...payload };

        if (cleanedData.type != null) {
          cleanedData.type = this.getTenantType(cleanedData.type as unknown);
        }
        if (cleanedData.status != null) {
          cleanedData.status = this.getTenantStatus(cleanedData.status as unknown);
        }

        // Scrub metadata keys that might collide with enum columns in other tables
        if (cleanedData.metadata && typeof cleanedData.metadata === 'object') {
          const { metadata } = cleanedData;
          const cleanedMetadata = Object.keys(metadata).reduce((acc, key) => {
            if (['role', 'user_role', 'admin_role', 'admin'].includes(key)) {
              // eslint-disable-next-line no-console
              console.log(`Filtering out potentially problematic metadata field: ${key}`);
              return acc;
            }
            (acc as any)[key] = (metadata as any)[key];
            return acc;
          }, {} as Record<string, unknown>);
          cleanedData.metadata = cleanedMetadata as any;
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
        const { error } = await supabase.from('tenants').delete().eq('id', id);
        if (error) throw error;
        return true;
      },
      'deleteTenant'
    );
  }
}

export const tenantApiService = TenantApiService.getInstance();

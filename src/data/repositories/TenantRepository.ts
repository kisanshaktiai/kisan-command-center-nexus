
import { supabase } from '@/integrations/supabase/client';
import { BaseService } from '@/services/BaseService';
import { CreateTenantDTO, UpdateTenantDTO, convertEnumToString } from '@/types/tenant';

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

  async getTenants(filters?: any) {
    const { data, error } = await supabase
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

    if (error) throw error;
    return data;
  }

  async getTenant(id: string) {
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
    return data;
  }

  async createTenant(tenantData: CreateTenantDTO) {
    // Ensure status, type, and subscription_plan are the correct string literals
    const dbData = {
      ...tenantData,
      status: tenantData.status, // Already correct type
      type: tenantData.type, // Already correct type
      subscription_plan: tenantData.subscription_plan // Already correct type
    };

    const { data, error } = await supabase
      .from('tenants')
      .insert(dbData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateTenant(id: string, tenantData: UpdateTenantDTO) {
    // Ensure status, type, and subscription_plan are the correct string literals if provided
    const dbData = {
      ...tenantData,
      ...(tenantData.status && { status: tenantData.status }),
      ...(tenantData.type && { type: tenantData.type }),
      ...(tenantData.subscription_plan && { subscription_plan: tenantData.subscription_plan })
    };

    const { data, error } = await supabase
      .from('tenants')
      .update(dbData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteTenant(id: string) {
    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }
}

export const tenantRepository = TenantRepository.getInstance();

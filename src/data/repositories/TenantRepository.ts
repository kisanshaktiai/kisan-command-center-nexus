
import { supabase } from '@/integrations/supabase/client';
import { BaseService } from '@/services/BaseService';
import { CreateTenantDTO, UpdateTenantDTO } from '@/types/tenant';

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
        tenant_features (*),
        tenant_branding (*)
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
    // Map enum values to database values
    let subscriptionPlan = tenantData.subscription_plan || 'Kisan_Basic';
    if (subscriptionPlan === 'Custom_Enterprise') {
      subscriptionPlan = 'custom'; // Map to database value
    }

    // Map tenant type to database value
    let tenantType = tenantData.type || 'ngo'; // Default to ngo instead of other
    if (tenantType === 'other') {
      tenantType = 'ngo'; // Map other to ngo for database compatibility
    }

    // Ensure we only pass valid database fields
    const dbData = {
      name: tenantData.name,
      slug: tenantData.slug,
      type: tenantType as any,
      status: tenantData.status || 'trial',
      subscription_plan: subscriptionPlan,
      owner_name: tenantData.owner_name,
      owner_email: tenantData.owner_email,
      owner_phone: tenantData.owner_phone,
      business_registration: tenantData.business_registration,
      business_address: tenantData.business_address,
      established_date: tenantData.established_date,
      subscription_start_date: tenantData.subscription_start_date,
      subscription_end_date: tenantData.subscription_end_date,
      trial_ends_at: tenantData.trial_ends_at,
      max_farmers: tenantData.max_farmers,
      max_dealers: tenantData.max_dealers,
      max_products: tenantData.max_products,
      max_storage_gb: tenantData.max_storage_gb,
      max_api_calls_per_day: tenantData.max_api_calls_per_day,
      subdomain: tenantData.subdomain,
      custom_domain: tenantData.custom_domain,
      metadata: tenantData.metadata || {}
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
    // Ensure we only pass valid database fields
    const dbData: any = {};
    
    if (tenantData.name !== undefined) dbData.name = tenantData.name;
    if (tenantData.slug !== undefined) dbData.slug = tenantData.slug;
    if (tenantData.type !== undefined) {
      let type = tenantData.type;
      if (type === 'other') {
        type = 'ngo'; // Map other to ngo for database compatibility
      }
      dbData.type = type;
    }
    if (tenantData.status !== undefined) dbData.status = tenantData.status;
    if (tenantData.subscription_plan !== undefined) {
      // Map enum values to database values
      let plan = tenantData.subscription_plan;
      if (plan === 'Custom_Enterprise') {
        plan = 'custom'; // Map to database value
      }
      dbData.subscription_plan = plan;
    }
    if (tenantData.owner_name !== undefined) dbData.owner_name = tenantData.owner_name;
    if (tenantData.owner_email !== undefined) dbData.owner_email = tenantData.owner_email;
    if (tenantData.owner_phone !== undefined) dbData.owner_phone = tenantData.owner_phone;
    if (tenantData.business_registration !== undefined) dbData.business_registration = tenantData.business_registration;
    if (tenantData.business_address !== undefined) dbData.business_address = tenantData.business_address;
    if (tenantData.established_date !== undefined) dbData.established_date = tenantData.established_date;
    if (tenantData.subscription_start_date !== undefined) dbData.subscription_start_date = tenantData.subscription_start_date;
    if (tenantData.subscription_end_date !== undefined) dbData.subscription_end_date = tenantData.subscription_end_date;
    if (tenantData.trial_ends_at !== undefined) dbData.trial_ends_at = tenantData.trial_ends_at;
    if (tenantData.suspended_at !== undefined) dbData.suspended_at = tenantData.suspended_at;
    if (tenantData.reactivated_at !== undefined) dbData.reactivated_at = tenantData.reactivated_at;
    if (tenantData.archived_at !== undefined) dbData.archived_at = tenantData.archived_at;
    if (tenantData.max_farmers !== undefined) dbData.max_farmers = tenantData.max_farmers;
    if (tenantData.max_dealers !== undefined) dbData.max_dealers = tenantData.max_dealers;
    if (tenantData.max_products !== undefined) dbData.max_products = tenantData.max_products;
    if (tenantData.max_storage_gb !== undefined) dbData.max_storage_gb = tenantData.max_storage_gb;
    if (tenantData.max_api_calls_per_day !== undefined) dbData.max_api_calls_per_day = tenantData.max_api_calls_per_day;
    if (tenantData.subdomain !== undefined) dbData.subdomain = tenantData.subdomain;
    if (tenantData.custom_domain !== undefined) dbData.custom_domain = tenantData.custom_domain;
    if (tenantData.metadata !== undefined) dbData.metadata = tenantData.metadata;

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

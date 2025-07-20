
import { supabase } from '@/integrations/supabase/client';
import { Tenant, TenantFormData, RpcResponse, SubscriptionPlan } from '@/types/tenant';

export class TenantService {
  static async fetchTenants(): Promise<Tenant[]> {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async createTenant(formData: TenantFormData): Promise<RpcResponse> {
    const { data, error } = await supabase.rpc('create_tenant_with_validation', {
      p_name: formData.name,
      p_slug: formData.slug,
      p_type: formData.type,
      p_status: formData.status,
      p_subscription_plan: formData.subscription_plan,
      p_owner_name: formData.owner_name || null,
      p_owner_email: formData.owner_email || null,
      p_owner_phone: formData.owner_phone || null,
      p_business_registration: formData.business_registration || null,
      p_business_address: formData.business_address || null,
      p_established_date: formData.established_date || null,
      p_subscription_start_date: formData.subscription_start_date || null,
      p_subscription_end_date: formData.subscription_end_date || null,
      p_trial_ends_at: formData.trial_ends_at || null,
      p_max_farmers: formData.max_farmers || null,
      p_max_dealers: formData.max_dealers || null,
      p_max_products: formData.max_products || null,
      p_max_storage_gb: formData.max_storage_gb || null,
      p_max_api_calls_per_day: formData.max_api_calls_per_day || null,
      p_subdomain: formData.subdomain || null,
      p_custom_domain: formData.custom_domain || null,
      p_metadata: formData.metadata || {}
    });

    if (error) throw error;
    return data as unknown as RpcResponse;
  }

  static async updateTenant(tenant: Tenant, formData: TenantFormData): Promise<Tenant> {
    const planLimits = this.getPlanLimits(formData.subscription_plan);
    
    const metadata = formData.metadata && typeof formData.metadata === 'object' 
      ? formData.metadata 
      : {};
    
    const businessAddress = formData.business_address && typeof formData.business_address === 'object'
      ? formData.business_address
      : formData.business_address
        ? { address: formData.business_address }
        : null;
    
    const updateData = {
      ...formData,
      max_farmers: formData.max_farmers || planLimits.farmers,
      max_dealers: formData.max_dealers || planLimits.dealers,
      max_products: formData.max_products || planLimits.products,
      max_storage_gb: formData.max_storage_gb || planLimits.storage,
      max_api_calls_per_day: formData.max_api_calls_per_day || planLimits.api_calls,
      metadata,
      business_address: businessAddress,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('tenants')
      .update(updateData as any)
      .eq('id', tenant.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteTenant(tenantId: string): Promise<void> {
    const { error } = await supabase
      .from('tenants')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', tenantId);

    if (error) throw error;
  }

  static getPlanLimits(plan: SubscriptionPlan) {
    const limits = {
      kisan: { farmers: 1000, dealers: 50, products: 100, storage: 10, api_calls: 10000 },
      shakti: { farmers: 5000, dealers: 200, products: 500, storage: 50, api_calls: 50000 },
      ai: { farmers: 20000, dealers: 1000, products: 2000, storage: 200, api_calls: 200000 },
    };
    return limits[plan] || limits.kisan;
  }

  static getStatusBadgeVariant(status: string | null) {
    switch (status) {
      case 'active': return 'default';
      case 'trial': return 'secondary';
      case 'suspended': return 'destructive';
      case 'cancelled': return 'outline';
      default: return 'secondary';
    }
  }

  static getPlanBadgeVariant(plan: SubscriptionPlan | null) {
    switch (plan) {
      case 'ai': return 'default';
      case 'shakti': return 'secondary';
      case 'kisan': return 'outline';
      default: return 'outline';
    }
  }

  static getPlanDisplayName(plan: SubscriptionPlan | null) {
    const displayNames = {
      'kisan': 'Kisan (Basic)',
      'shakti': 'Shakti (Growth)', 
      'ai': 'AI (Enterprise)'
    };
    return displayNames[plan || 'kisan'] || 'Kisan (Basic)';
  }
}

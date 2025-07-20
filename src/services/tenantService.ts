
import { supabase } from '@/integrations/supabase/client';
import { Tenant, TenantFormData, RpcResponse, SubscriptionPlan } from '@/types/tenant';

export class TenantService {
  // Convert database subscription plan to frontend type
  private static convertSubscriptionPlan(dbPlan: string | null): SubscriptionPlan {
    switch (dbPlan) {
      case 'Kisan_Basic':
        return 'Kisan_Basic';
      case 'Shakti_Growth':
        return 'Shakti_Growth';
      case 'AI_Enterprise':
        return 'AI_Enterprise';
      case 'custom':
        return 'custom';
      default:
        return 'Kisan_Basic';
    }
  }

  // Convert database tenant to frontend type
  private static convertDatabaseTenant(dbTenant: any): Tenant {
    return {
      ...dbTenant,
      subscription_plan: this.convertSubscriptionPlan(dbTenant.subscription_plan),
      status: dbTenant.status || 'trial',
    };
  }

  static async fetchTenants(): Promise<Tenant[]> {
    try {
      console.log('TenantService: Fetching tenants from database...');
      
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('TenantService: Error fetching tenants:', error);
        throw new Error(`Failed to fetch tenants: ${error.message}`);
      }
      
      console.log('TenantService: Raw tenants data:', data);
      
      // Convert database records to frontend types
      const convertedTenants = (data || []).map(this.convertDatabaseTenant);
      console.log('TenantService: Converted tenants:', convertedTenants);
      
      return convertedTenants;
    } catch (error) {
      console.error('TenantService: Exception in fetchTenants:', error);
      throw error;
    }
  }

  static async createTenant(formData: TenantFormData): Promise<RpcResponse> {
    try {
      console.log('TenantService: Creating tenant with data:', formData);
      
      // Validate required fields
      if (!formData.name?.trim()) {
        console.error('TenantService: Validation failed - name is required');
        return { success: false, error: 'Organization name is required' };
      }
      
      if (!formData.slug?.trim()) {
        console.error('TenantService: Validation failed - slug is required');
        return { success: false, error: 'Slug is required' };
      }
      
      if (!formData.type) {
        console.error('TenantService: Validation failed - type is required');
        return { success: false, error: 'Organization type is required' };
      }
      
      if (!formData.subscription_plan) {
        console.error('TenantService: Validation failed - subscription plan is required');
        return { success: false, error: 'Subscription plan is required' };
      }

      console.log('TenantService: Calling RPC function create_tenant_with_validation...');
      console.log('TenantService: RPC parameters:', {
        p_name: formData.name,
        p_slug: formData.slug,
        p_type: formData.type,
        p_status: formData.status || 'trial',
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
      
      // Try RPC function first
      const { data, error } = await supabase.rpc('create_tenant_with_validation', {
        p_name: formData.name,
        p_slug: formData.slug,
        p_type: formData.type,
        p_status: formData.status || 'trial',
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

      if (error) {
        console.error('TenantService: Database error creating tenant:', error);
        
        // Handle specific errors
        if (error.code === '42883') {
          console.log('TenantService: RPC function not found, falling back to direct insert');
          return await this.createTenantDirectly(formData);
        }
        
        // Handle specific RLS errors
        if (error.message?.includes('row-level security')) {
          return { 
            success: false, 
            error: 'Permission denied. You must be a super admin to create tenants.' 
          };
        }
        
        if (error.message?.includes('infinite recursion detected')) {
          return { 
            success: false, 
            error: 'Authentication error. Please try logging out and back in.' 
          };
        }
        
        return { 
          success: false, 
          error: `Database error: ${error.message}` 
        };
      }

      console.log('TenantService: RPC response data:', data);
      
      if (!data) {
        console.error('TenantService: No response from database function');
        return { 
          success: false, 
          error: 'No response from database function' 
        };
      }

      // Safely convert the response to RpcResponse type
      const rpcResponse = data as unknown as RpcResponse;
      console.log('TenantService: Parsed RPC response:', rpcResponse);
      
      // Validate the response structure
      if (typeof rpcResponse !== 'object' || rpcResponse === null || typeof rpcResponse.success !== 'boolean') {
        console.error('TenantService: Invalid RPC response structure:', data);
        return { 
          success: false, 
          error: 'Invalid response from database function' 
        };
      }

      if (rpcResponse.success) {
        console.log('TenantService: Tenant created successfully');
        return { 
          success: true, 
          message: rpcResponse.message || 'Tenant created successfully with branding and features',
          tenant_id: rpcResponse.data?.tenant_id || rpcResponse.tenant_id,
          data: rpcResponse.data
        };
      } else {
        console.error('TenantService: Tenant creation failed:', rpcResponse.error);
        return rpcResponse;
      }
    } catch (error: any) {
      console.error('TenantService: Exception in createTenant:', error);
      
      // Handle network/connection errors
      if (error.message?.includes('fetch')) {
        return { 
          success: false, 
          error: 'Network error. Please check your connection and try again.' 
        };
      }
      
      return { 
        success: false, 
        error: error.message || 'An unexpected error occurred while creating the tenant' 
      };
    }
  }

  // Fallback method for direct insertion
  static async createTenantDirectly(formData: TenantFormData): Promise<RpcResponse> {
    try {
      console.log('TenantService: Creating tenant directly via insert');
      
      const planLimits = this.getPlanLimits(formData.subscription_plan);
      
      const tenantData = {
        name: formData.name,
        slug: formData.slug,
        type: formData.type,
        status: formData.status || 'trial',
        subscription_plan: formData.subscription_plan,
        owner_name: formData.owner_name || null,
        owner_email: formData.owner_email || null,
        owner_phone: formData.owner_phone || null,
        business_registration: formData.business_registration || null,
        business_address: formData.business_address || null,
        established_date: formData.established_date || null,
        subscription_start_date: formData.subscription_start_date || new Date().toISOString(),
        subscription_end_date: formData.subscription_end_date || null,
        trial_ends_at: formData.trial_ends_at || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        max_farmers: formData.max_farmers || planLimits.farmers,
        max_dealers: formData.max_dealers || planLimits.dealers,
        max_products: formData.max_products || planLimits.products,
        max_storage_gb: formData.max_storage_gb || planLimits.storage,
        max_api_calls_per_day: formData.max_api_calls_per_day || planLimits.api_calls,
        subdomain: formData.subdomain || null,
        custom_domain: formData.custom_domain || null,
        metadata: formData.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('TenantService: Direct insert data:', tenantData);

      const { data, error } = await supabase
        .from('tenants')
        .insert(tenantData)
        .select()
        .single();

      if (error) {
        console.error('TenantService: Direct insert error:', error);
        return {
          success: false,
          error: `Failed to create tenant: ${error.message}`
        };
      }

      console.log('TenantService: Tenant created directly:', data);
      return {
        success: true,
        message: 'Tenant created successfully',
        tenant_id: data.id,
        data: { tenant_id: data.id }
      };
    } catch (error: any) {
      console.error('TenantService: Exception in createTenantDirectly:', error);
      return {
        success: false,
        error: error.message || 'Failed to create tenant directly'
      };
    }
  }

  static async updateTenant(tenant: Tenant, formData: TenantFormData): Promise<Tenant> {
    try {
      console.log('TenantService: Updating tenant with data:', formData);
      
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

      console.log('TenantService: Update data prepared:', updateData);

      const { data, error } = await supabase
        .from('tenants')
        .update(updateData)
        .eq('id', tenant.id)
        .select()
        .single();

      if (error) {
        console.error('TenantService: Database error updating tenant:', error);
        throw new Error(`Failed to update tenant: ${error.message}`);
      }
      
      console.log('TenantService: Tenant updated successfully:', data);
      
      // Convert database response to frontend type
      return this.convertDatabaseTenant(data);
    } catch (error) {
      console.error('TenantService: Exception in updateTenant:', error);
      throw error;
    }
  }

  static async deleteTenant(tenantId: string): Promise<void> {
    try {
      console.log('TenantService: Deleting tenant:', tenantId);
      
      const { error } = await supabase
        .from('tenants')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', tenantId);

      if (error) {
        console.error('TenantService: Database error deleting tenant:', error);
        throw new Error(`Failed to delete tenant: ${error.message}`);
      }
      
      console.log('TenantService: Tenant deleted successfully');
    } catch (error) {
      console.error('TenantService: Exception in deleteTenant:', error);
      throw error;
    }
  }

  static getPlanLimits(plan: SubscriptionPlan) {
    const limits = {
      Kisan_Basic: { farmers: 1000, dealers: 50, products: 100, storage: 10, api_calls: 10000 },
      Shakti_Growth: { farmers: 5000, dealers: 200, products: 500, storage: 50, api_calls: 50000 },
      AI_Enterprise: { farmers: 20000, dealers: 1000, products: 2000, storage: 200, api_calls: 200000 },
      custom: { farmers: 50000, dealers: 2000, products: 5000, storage: 500, api_calls: 500000 },
    };
    return limits[plan] || limits.Kisan_Basic;
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
      case 'AI_Enterprise': return 'default';
      case 'Shakti_Growth': return 'secondary';
      case 'Kisan_Basic': return 'outline';
      case 'custom': return 'destructive';
      default: return 'outline';
    }
  }

  static getPlanDisplayName(plan: SubscriptionPlan | null) {
    const displayNames = {
      'Kisan_Basic': 'Kisan – Starter',
      'Shakti_Growth': 'Shakti – Growth', 
      'AI_Enterprise': 'AI – Enterprise',
      'custom': 'Custom Plan'
    };
    return displayNames[plan || 'Kisan_Basic'] || 'Kisan – Starter';
  }
}

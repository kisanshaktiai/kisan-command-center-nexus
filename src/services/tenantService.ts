import { supabase } from '@/integrations/supabase/client';
import { Tenant, TenantFormData, RpcResponse, SubscriptionPlan } from '@/types/tenant';

// Database subscription plan enum type that matches the database
type DatabaseSubscriptionPlan = 'Kisan_Basic' | 'Shakti_Growth' | 'AI_Enterprise' | 'custom';

export class TenantService {
  // Map UI subscription plan names to database enum values
  private static mapUIToDatabasePlan(uiPlan: SubscriptionPlan): DatabaseSubscriptionPlan {
    // Direct mapping since UI and database now use the same enum values
    return uiPlan;
  }

  // Convert database subscription plan to frontend type
  private static convertSubscriptionPlan(dbPlan: string | null): SubscriptionPlan {
    const planMapping: Record<string, SubscriptionPlan> = {
      'Kisan_Basic': 'Kisan_Basic',
      'Shakti_Growth': 'Shakti_Growth',
      'AI_Enterprise': 'AI_Enterprise',
      'custom': 'custom'
    };
    
    return planMapping[dbPlan || ''] || 'Kisan_Basic';
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
      console.log('TenantService: Creating tenant with formData:', formData);
      
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

      // Map UI subscription plan to database enum (now they match directly)
      const dbSubscriptionPlan = this.mapUIToDatabasePlan(formData.subscription_plan);
      console.log('TenantService: Using subscription plan:', dbSubscriptionPlan);

      // Prepare parameters for RPC call
      const rpcParams = {
        p_name: formData.name,
        p_slug: formData.slug,
        p_type: formData.type,
        p_status: formData.status || 'trial',
        p_subscription_plan: dbSubscriptionPlan,
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
      };

      console.log('TenantService: Calling RPC function with params:', rpcParams);
      
      // Call the database function directly
      const { data, error } = await supabase.rpc('create_tenant_with_validation', rpcParams);

      if (error) {
        console.error('TenantService: Database error creating tenant:', error);
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

      // Type-safe parsing of the response
      if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        const response = data as any;
        
        // Validate that the response has the required structure
        if (typeof response.success === 'boolean') {
          console.log('TenantService: Parsed RPC response:', response);
          
          if (response.success) {
            console.log('TenantService: Tenant created successfully');
            return { 
              success: true, 
              message: response.message || 'Tenant created successfully',
              tenant_id: response.data?.tenant_id,
              data: response.data
            };
          } else {
            console.error('TenantService: Tenant creation failed:', response.error);
            return {
              success: false,
              error: response.error || 'Unknown error occurred'
            };
          }
        }
      }

      // If we get here, the response format is unexpected
      console.error('TenantService: Unexpected response format:', data);
      return { 
        success: false, 
        error: 'Unexpected response format from database function' 
      };
    } catch (error: any) {
      console.error('TenantService: Exception in createTenant:', error);
      return { 
        success: false, 
        error: error.message || 'An unexpected error occurred while creating the tenant' 
      };
    }
  }

  static async updateTenant(tenant: Tenant, formData: TenantFormData): Promise<Tenant> {
    try {
      console.log('TenantService: Updating tenant with data:', formData);
      
      const dbSubscriptionPlan = this.mapUIToDatabasePlan(formData.subscription_plan);
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
        subscription_plan: dbSubscriptionPlan,
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

import { supabase } from '@/integrations/supabase/client';
import { Tenant, TenantFormData, RpcResponse, SubscriptionPlan } from '@/types/tenant';
import { toast } from 'sonner';

// Database subscription plan enum type that matches the database
type DatabaseSubscriptionPlan = 'Kisan_Basic' | 'Shakti_Growth' | 'AI_Enterprise' | 'custom';

export class TenantService {
  // Map UI subscription plan names to database enum values
  private static mapUIToDatabasePlan(uiPlan: SubscriptionPlan): DatabaseSubscriptionPlan {
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

  // Convert database tenant to frontend type with enhanced data
  private static convertDatabaseTenant(dbTenant: any): Tenant {
    return {
      ...dbTenant,
      subscription_plan: TenantService.convertSubscriptionPlan(dbTenant.subscription_plan),
      status: dbTenant.status || 'trial',
      // Include branding and features data if available
      branding: dbTenant.tenant_branding?.[0] || null,
      features: dbTenant.tenant_features?.[0] || null,
    };
  }

  static async fetchTenants(): Promise<Tenant[]> {
    try {
      console.log('TenantService: Fetching tenants with comprehensive data...');
      
      // Fetch tenants with their branding and features data
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          *,
          tenant_branding (
            primary_color,
            secondary_color,
            accent_color,
            background_color,
            text_color,
            app_name,
            app_tagline,
            logo_url,
            font_family
          ),
          tenant_features (
            ai_chat,
            weather_forecast,
            marketplace,
            community_forum,
            satellite_imagery,
            soil_testing,
            drone_monitoring,
            iot_integration,
            ecommerce,
            payment_gateway,
            inventory_management,
            logistics_tracking,
            basic_analytics,
            advanced_analytics,
            predictive_analytics,
            custom_reports,
            api_access,
            webhook_support,
            third_party_integrations,
            white_label_mobile_app
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('TenantService: Error fetching tenants:', error);
        toast.error(`Failed to fetch tenants: ${error.message}`);
        throw new Error(`Failed to fetch tenants: ${error.message}`);
      }
      
      console.log('TenantService: Raw tenants data with relations:', data);
      
      // Convert database records to frontend types using static method
      const convertedTenants = (data || []).map(TenantService.convertDatabaseTenant);
      console.log('TenantService: Converted tenants with enhanced data:', convertedTenants);
      
      return convertedTenants;
    } catch (error) {
      console.error('TenantService: Exception in fetchTenants:', error);
      throw error;
    }
  }

  static async fetchTenantById(tenantId: string): Promise<Tenant | null> {
    try {
      console.log('TenantService: Fetching tenant by ID:', tenantId);
      
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          *,
          tenant_branding (
            primary_color,
            secondary_color,
            accent_color,
            background_color,
            text_color,
            app_name,
            app_tagline,
            logo_url,
            font_family
          ),
          tenant_features (
            ai_chat,
            weather_forecast,
            marketplace,
            community_forum,
            satellite_imagery,
            soil_testing,
            drone_monitoring,
            iot_integration,
            ecommerce,
            payment_gateway,
            inventory_management,
            logistics_tracking,
            basic_analytics,
            advanced_analytics,
            predictive_analytics,
            custom_reports,
            api_access,
            webhook_support,
            third_party_integrations,
            white_label_mobile_app
          )
        `)
        .eq('id', tenantId)
        .single();

      if (error) {
        console.error('TenantService: Error fetching tenant:', error);
        return null;
      }

      return TenantService.convertDatabaseTenant(data);
    } catch (error) {
      console.error('TenantService: Exception in fetchTenantById:', error);
      return null;
    }
  }

  static async createTenant(formData: TenantFormData): Promise<RpcResponse> {
    try {
      console.log('TenantService: Creating tenant with formData:', formData);
      
      // Validate required fields
      if (!formData.name?.trim()) {
        console.error('TenantService: Validation failed - name is required');
        const errorMsg = 'Organization name is required';
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }
      
      if (!formData.slug?.trim()) {
        console.error('TenantService: Validation failed - slug is required');
        const errorMsg = 'Slug is required';
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }
      
      if (!formData.type) {
        console.error('TenantService: Validation failed - type is required');
        const errorMsg = 'Organization type is required';
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }
      
      if (!formData.subscription_plan) {
        console.error('TenantService: Validation failed - subscription plan is required');
        const errorMsg = 'Subscription plan is required';
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }

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
      
      const { data, error } = await supabase.rpc('create_tenant_with_validation', rpcParams);

      if (error) {
        console.error('TenantService: Database error creating tenant:', error);
        const errorMsg = `Database error: ${error.message}`;
        toast.error(errorMsg);
        return { 
          success: false, 
          error: errorMsg
        };
      }

      console.log('TenantService: RPC response data:', data);
      
      if (!data) {
        console.error('TenantService: No response from database function');
        const errorMsg = 'No response from database function';
        toast.error(errorMsg);
        return { 
          success: false, 
          error: errorMsg
        };
      }

      if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        const response = data as any;
        
        if (typeof response.success === 'boolean') {
          console.log('TenantService: Parsed RPC response:', response);
          
          if (response.success) {
            console.log('TenantService: Tenant created successfully');
            toast.success(response.message || 'Tenant created successfully');
            return { 
              success: true, 
              message: response.message || 'Tenant created successfully',
              tenant_id: response.data?.tenant_id,
              data: response.data
            };
          } else {
            console.error('TenantService: Tenant creation failed:', response.error);
            toast.error(response.error || 'Unknown error occurred');
            return {
              success: false,
              error: response.error || 'Unknown error occurred'
            };
          }
        }
      }

      console.error('TenantService: Unexpected response format:', data);
      const errorMsg = 'Unexpected response format from database function';
      toast.error(errorMsg);
      return { 
        success: false, 
        error: errorMsg
      };
    } catch (error: any) {
      console.error('TenantService: Exception in createTenant:', error);
      let errorMessage = 'An unexpected error occurred while creating the tenant';
      
      if (error.message.includes('VALIDATION_ERROR')) {
        errorMessage = error.message.replace('VALIDATION_ERROR: ', '');
      } else if (error.message.includes('SLUG_ERROR')) {
        errorMessage = error.message.replace('SLUG_ERROR: ', '');
      } else if (error.message.includes('DATABASE_ERROR')) {
        errorMessage = error.message.replace('DATABASE_ERROR: ', '');
      } else if (error.message.includes('DUPLICATE_SLUG')) {
        errorMessage = 'A tenant with this slug already exists';
      }
      
      toast.error(errorMessage);
      return { 
        success: false, 
        error: errorMessage
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
        .select(`
          *,
          tenant_branding (
            primary_color,
            secondary_color,
            accent_color,
            background_color,
            text_color,
            app_name,
            app_tagline,
            logo_url,
            font_family
          ),
          tenant_features (
            ai_chat,
            weather_forecast,
            marketplace,
            community_forum,
            satellite_imagery,
            soil_testing,
            drone_monitoring,
            iot_integration,
            ecommerce,
            payment_gateway,
            inventory_management,
            logistics_tracking,
            basic_analytics,
            advanced_analytics,
            predictive_analytics,
            custom_reports,
            api_access,
            webhook_support,
            third_party_integrations,
            white_label_mobile_app
          )
        `)
        .single();

      if (error) {
        console.error('TenantService: Database error updating tenant:', error);
        toast.error(`Failed to update tenant: ${error.message}`);
        throw new Error(`Failed to update tenant: ${error.message}`);
      }
      
      console.log('TenantService: Tenant updated successfully:', data);
      toast.success('Tenant updated successfully');
      
      return TenantService.convertDatabaseTenant(data);
    } catch (error) {
      console.error('TenantService: Exception in updateTenant:', error);
      throw error;
    }
  }

  static async deleteTenant(tenantId: string): Promise<void> {
    try {
      console.log('TenantService: Soft deleting tenant:', tenantId);
      
      // Soft delete by setting deleted_at timestamp
      const { error } = await supabase
        .from('tenants')
        .update({ 
          deleted_at: new Date().toISOString(),
          status: 'cancelled',
          is_active: false 
        })
        .eq('id', tenantId);

      if (error) {
        console.error('TenantService: Database error deleting tenant:', error);
        toast.error(`Failed to delete tenant: ${error.message}`);
        throw new Error(`Failed to delete tenant: ${error.message}`);
      }
      
      console.log('TenantService: Tenant soft deleted successfully');
      toast.success('Tenant deleted successfully');
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

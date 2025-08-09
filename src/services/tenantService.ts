
import { supabase } from '@/integrations/supabase/client';
import { 
  Tenant, 
  CreateTenantDTO, 
  UpdateTenantDTO, 
  RpcResponse, 
  convertDatabaseTenant,
  convertEnumToString,
  TenantID
} from '@/types/tenant';
import { SubscriptionPlan, TenantType, TenantStatus } from '@/types/enums';

export class TenantService {
  private static instance: TenantService;

  static getInstance(): TenantService {
    if (!TenantService.instance) {
      TenantService.instance = new TenantService();
    }
    return TenantService.instance;
  }

  async getTenants(tenantId?: TenantID) {
    try {
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
          tenant_features (*),
          tenant_branding (*)
        `)
        .order('created_at', { ascending: false });

      // If tenantId is provided, filter by it (for tenant-specific queries)
      if (tenantId) {
        query = query.eq('id', tenantId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching tenants:', error);
        return { success: false, data: [], error: error.message };
      }

      const tenants = data?.map(convertDatabaseTenant) || [];
      
      return { success: true, data: tenants };
    } catch (error: any) {
      console.error('Error in getTenants:', error);
      return { success: false, data: [], error: error.message };
    }
  }

  async getTenant(id: string): Promise<{ success: boolean; data?: Tenant; error?: string }> {
    try {
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

      if (error) {
        console.error('Error fetching tenant:', error);
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: 'Tenant not found' };
      }

      return { success: true, data: convertDatabaseTenant(data) };
    } catch (error: any) {
      console.error('Error in getTenant:', error);
      return { success: false, error: error.message };
    }
  }

  async createTenant(tenantData: CreateTenantDTO): Promise<{ success: boolean; data?: Tenant; error?: string }> {
    try {
      // Convert data to proper database format
      const dbData = {
        ...tenantData,
        type: tenantData.type, // Already correct string literal
        status: tenantData.status, // Already correct string literal
        subscription_plan: tenantData.subscription_plan // Already correct string literal
      };

      const { data, error } = await supabase
        .from('tenants')
        .insert(dbData)
        .select(`
          *,
          tenant_subscriptions (*),
          tenant_features (*),
          tenant_branding (*)
        `)
        .single();

      if (error) {
        console.error('Error creating tenant:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: convertDatabaseTenant(data) };
    } catch (error: any) {
      console.error('Error in createTenant:', error);
      return { success: false, error: error.message };
    }
  }

  async updateTenant(id: string, tenantData: UpdateTenantDTO): Promise<{ success: boolean; data?: Tenant; error?: string }> {
    try {
      // Convert data to proper database format
      const dbData = {
        ...tenantData,
        ...(tenantData.type && { type: tenantData.type }),
        ...(tenantData.status && { status: tenantData.status }),
        ...(tenantData.subscription_plan && { subscription_plan: tenantData.subscription_plan })
      };

      const { data, error } = await supabase
        .from('tenants')
        .update(dbData)
        .eq('id', id)
        .select(`
          *,
          tenant_subscriptions (*),
          tenant_features (*),
          tenant_branding (*)
        `)
        .single();

      if (error) {
        console.error('Error updating tenant:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: convertDatabaseTenant(data) };
    } catch (error: any) {
      console.error('Error in updateTenant:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteTenant(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting tenant:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in deleteTenant:', error);
      return { success: false, error: error.message };
    }
  }
}

export const tenantService = TenantService.getInstance();

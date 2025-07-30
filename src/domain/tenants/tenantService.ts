
import { supabase } from '@/integrations/supabase/client';
import { TenantDTO, CreateTenantDTO, UpdateTenantDTO } from '@/data/types/tenant';

class TenantService {
  async getTenants(filters?: any): Promise<TenantDTO[]> {
    try {
      let query = supabase
        .from('tenants')
        .select('*');

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.subscription_plan) {
        query = query.eq('subscription_plan', filters.subscription_plan);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(this.mapToTenantDTO) || [];
    } catch (error) {
      console.error('Error fetching tenants:', error);
      throw error;
    }
  }

  async getTenant(tenantId: string): Promise<TenantDTO | null> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (error) throw error;

      return data ? this.mapToTenantDTO(data) : null;
    } catch (error) {
      console.error('Error fetching tenant:', error);
      throw error;
    }
  }

  async createTenant(tenantData: CreateTenantDTO): Promise<TenantDTO> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .insert([{
          name: tenantData.name,
          slug: tenantData.slug,
          subscription_plan: tenantData.subscription_plan,
          owner_email: tenantData.owner_email,
          owner_name: tenantData.owner_name,
          metadata: tenantData.metadata || {},
          status: 'trial'
        }])
        .select()
        .single();

      if (error) throw error;

      return this.mapToTenantDTO(data);
    } catch (error) {
      console.error('Error creating tenant:', error);
      throw error;
    }
  }

  async updateTenant(tenantId: string, updates: UpdateTenantDTO): Promise<TenantDTO> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .update(updates)
        .eq('id', tenantId)
        .select()
        .single();

      if (error) throw error;

      return this.mapToTenantDTO(data);
    } catch (error) {
      console.error('Error updating tenant:', error);
      throw error;
    }
  }

  private mapToTenantDTO(data: any): TenantDTO {
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      status: data.status,
      subscription_plan: data.subscription_plan,
      created_at: data.created_at,
      updated_at: data.updated_at,
      owner_email: data.owner_email,
      owner_name: data.owner_name
    };
  }
}

export const tenantService = new TenantService();

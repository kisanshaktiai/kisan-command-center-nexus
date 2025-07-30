
import { supabase } from '@/integrations/supabase/client';
import { TenantDTO, CreateTenantDTO, UpdateTenantDTO } from '@/data/types/tenant';
import type { Database } from '@/integrations/supabase/types';

// Use the actual database types
type DatabaseTenant = Database['public']['Tables']['tenants']['Row'];
type TenantInsert = Database['public']['Tables']['tenants']['Insert'];
type TenantUpdate = Database['public']['Tables']['tenants']['Update'];

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
      console.log('Domain Service: Creating tenant with data:', tenantData);
      
      // Validate required fields
      if (!tenantData.name?.trim()) {
        throw new Error('Organization name is required');
      }
      
      if (!tenantData.slug?.trim()) {
        throw new Error('Slug is required');
      }

      // Check slug availability first
      const { data: existingTenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', tenantData.slug)
        .single();

      if (existingTenant) {
        throw new Error('A tenant with this slug already exists');
      }

      // Map the CreateTenantDTO to the database insert type
      const insertData: TenantInsert = {
        name: tenantData.name,
        slug: tenantData.slug,
        type: tenantData.type as any,
        subscription_plan: tenantData.subscription_plan as any,
        owner_email: tenantData.owner_email,
        owner_name: tenantData.owner_name,
        metadata: tenantData.metadata || {},
        status: 'trial',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Domain Service: Inserting data:', insertData);

      const { data, error } = await supabase
        .from('tenants')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Domain Service: Database error:', error);
        throw error;
      }

      console.log('Domain Service: Tenant created successfully:', data);
      return this.mapToTenantDTO(data);
    } catch (error) {
      console.error('Domain Service: Error creating tenant:', error);
      throw error;
    }
  }

  async updateTenant(tenantId: string, updates: UpdateTenantDTO): Promise<TenantDTO> {
    try {
      // Map the UpdateTenantDTO to the database update type
      const updateData: TenantUpdate = {
        ...(updates.name && { name: updates.name }),
        ...(updates.status && { status: updates.status as any }),
        ...(updates.subscription_plan && { subscription_plan: updates.subscription_plan as any }),
        ...(updates.metadata && { metadata: updates.metadata }),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('tenants')
        .update(updateData)
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

  private mapToTenantDTO(data: DatabaseTenant): TenantDTO {
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

import { supabase } from '@/integrations/supabase/client';
import { TenantDTO, CreateTenantDTO, UpdateTenantDTO } from '@/data/types/tenant';
import { emailService } from '@/services/EmailService';
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
      console.log('Domain Service: Creating tenant with admin user setup:', tenantData);
      
      // Validate required fields
      if (!tenantData.name?.trim()) {
        throw new Error('Organization name is required');
      }
      
      if (!tenantData.slug?.trim()) {
        throw new Error('Slug is required');
      }

      if (!tenantData.owner_email?.trim()) {
        throw new Error('Admin email is required');
      }

      if (!tenantData.owner_name?.trim()) {
        throw new Error('Admin name is required');
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

      // Generate temporary password for admin user
      const tempPassword = this.generateTemporaryPassword();

      // Create admin user in auth.users first
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: tenantData.owner_email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: tenantData.owner_name,
          tenant_slug: tenantData.slug,
          role: 'tenant_admin'
        }
      });

      if (authError) {
        console.error('Domain Service: Error creating auth user:', authError);
        throw new Error(`Failed to create admin user: ${authError.message}`);
      }

      // Map the CreateTenantDTO to the database insert type
      const insertData: TenantInsert = {
        name: tenantData.name,
        slug: tenantData.slug,
        type: tenantData.type,
        subscription_plan: tenantData.subscription_plan,
        owner_email: tenantData.owner_email,
        owner_name: tenantData.owner_name,
        metadata: {
          ...tenantData.metadata,
          admin_user_id: authUser.user.id,
          created_via: 'manual_creation'
        },
        status: 'trial',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Domain Service: Inserting tenant data:', insertData);

      const { data, error } = await supabase
        .from('tenants')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Domain Service: Database error:', error);
        // Clean up auth user if tenant creation fails
        await supabase.auth.admin.deleteUser(authUser.user.id);
        throw error;
      }

      // Create user_tenants relationship
      const { error: relationError } = await supabase
        .from('user_tenants')
        .insert({
          user_id: authUser.user.id,
          tenant_id: data.id,
          role: 'tenant_owner',
          is_active: true,
          joined_at: new Date().toISOString()
        });

      if (relationError) {
        console.error('Domain Service: Error creating user-tenant relation:', relationError);
        // Don't fail the whole process, just log the error
      }

      // Send welcome email with login credentials
      try {
        const loginUrl = `${window.location.origin}/auth`;
        
        await emailService.sendTenantWelcomeEmail({
          tenantName: data.name,
          userName: tenantData.owner_name,
          email: tenantData.owner_email,
          password: tempPassword,
          loginUrl,
          tenantId: data.id,
          userId: authUser.user.id
        });
        
        console.log('Domain Service: Welcome email sent successfully');
      } catch (emailError) {
        console.error('Domain Service: Failed to send welcome email:', emailError);
        // Don't fail tenant creation if email fails, just log
      }

      console.log('Domain Service: Tenant created successfully with admin user:', data);
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
        ...(updates.status && { status: updates.status }),
        ...(updates.subscription_plan && { subscription_plan: updates.subscription_plan }),
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
      type: data.type as any || 'agri_company',
      status: data.status as any,
      subscription_plan: data.subscription_plan as any,
      created_at: data.created_at,
      updated_at: data.updated_at,
      owner_email: data.owner_email || undefined,
      owner_name: data.owner_name || undefined
    };
  }

  private generateTemporaryPassword(): string {
    // Generate a secure temporary password
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one of each type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  }
}

export const tenantService = new TenantService();

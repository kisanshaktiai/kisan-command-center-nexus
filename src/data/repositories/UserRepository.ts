
import { supabase } from '@/integrations/supabase/client';
import { BaseService } from '@/services/BaseService';
import { UserProfile } from '@/types/auth';

export class UserRepository extends BaseService {
  private static instance: UserRepository;

  private constructor() {
    super();
  }

  public static getInstance(): UserRepository {
    if (!UserRepository.instance) {
      UserRepository.instance = new UserRepository();
    }
    return UserRepository.instance;
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - user profile doesn't exist
        return null;
      }
      throw error;
    }
    
    return data;
  }

  async updateUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async createUserProfile(profileData: UserProfile): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        ...profileData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getUserTenants(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('user_tenants')
      .select(`
        tenant_id,
        role,
        is_active,
        tenants!user_tenants_tenant_id_fkey (*)
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  }

  async checkAdminStatus(userId: string): Promise<{
    isAdmin: boolean;
    isSuperAdmin: boolean;
    adminRole: string | null;
    isActive: boolean;
  }> {
    const { data, error } = await supabase
      .from('admin_users')
      .select('role, is_active')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No admin record found
        return {
          isAdmin: false,
          isSuperAdmin: false,
          adminRole: null,
          isActive: false
        };
      }
      throw error;
    }

    const isActive = data?.is_active || false;
    const role = data?.role || null;
    const isAdmin = isActive && ['super_admin', 'platform_admin', 'admin'].includes(role);
    const isSuperAdmin = isActive && role === 'super_admin';

    return {
      isAdmin,
      isSuperAdmin,
      adminRole: isActive ? role : null,
      isActive
    };
  }
}

export const userRepository = UserRepository.getInstance();


import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/lib/stores/authStore';
import { AuthState, TenantData } from '@/types/auth';
import { ServiceResult } from '@/services/BaseService';

class UnifiedAuthService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const { setLoading, setUser, setSession, setAuthState, setError } = useAuthStore.getState();
    
    try {
      setLoading(true);
      setError(null);

      // Get initial session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        setError('Failed to retrieve session');
        return;
      }

      if (session) {
        setSession(session);
        await this.loadUserProfile(session.user.id);
      }

      // Set up auth state listener
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        
        if (event === 'SIGNED_IN' && session) {
          setSession(session);
          await this.loadUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          useAuthStore.getState().reset();
        } else if (event === 'TOKEN_REFRESHED' && session) {
          setSession(session);
        }
      });

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize auth service:', error);
      setError('Authentication initialization failed');
    } finally {
      setLoading(false);
    }
  }

  private async loadUserProfile(userId: string): Promise<void> {
    try {
      // Check if user is an admin
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('role, is_active')
        .eq('id', userId)
        .single();

      const { setAuthState } = useAuthStore.getState();
      
      if (adminData?.is_active) {
        setAuthState({
          isAdmin: true,
          isSuperAdmin: adminData.role === 'super_admin',
          adminRole: adminData.role
        });
      } else {
        setAuthState({
          isAdmin: false,
          isSuperAdmin: false,
          adminRole: null
        });
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  }

  async signOut(): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      useAuthStore.getState().reset();
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sign out failed'
      };
    }
  }

  async signUp(email: string, password: string, tenantData: TenantData): Promise<ServiceResult<{ user: any; session: any }>> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: tenantData.fullName,
            organization_name: tenantData.organizationName,
            organization_type: tenantData.organizationType,
            phone: tenantData.phone
          }
        }
      });

      if (error) throw error;

      return {
        success: true,
        data: {
          user: data.user,
          session: data.session
        }
      };
    } catch (error) {
      console.error('Sign up error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sign up failed'
      };
    }
  }
}

export const unifiedAuthService = new UnifiedAuthService();

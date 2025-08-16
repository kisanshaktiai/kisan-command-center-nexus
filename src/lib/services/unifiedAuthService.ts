
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/lib/stores/authStore';
import { AuthState, TenantData } from '@/types/auth';
import { ServiceResult } from '@/services/BaseService';

interface AdminStatusResult {
  is_admin: boolean;
  role: string;
  is_active: boolean;
}

class UnifiedAuthService {
  private initialized = false;
  private initializing = false;

  async initialize(): Promise<void> {
    if (this.initialized || this.initializing) {
      console.log('UnifiedAuth: Skipping initialization - already initialized or in progress');
      return;
    }

    console.log('UnifiedAuth: Starting initialization...');
    this.initializing = true;

    const { setLoading, setUser, setSession, setAuthState, setError } = useAuthStore.getState();
    
    try {
      setLoading(true);
      setError(null);

      // Add timeout to prevent hanging
      const timeoutId = setTimeout(() => {
        console.error('UnifiedAuth: Initialization timeout after 10 seconds');
        setError('Authentication initialization timeout');
        setLoading(false);
        this.initializing = false;
      }, 10000);

      // Get initial session with error handling
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      clearTimeout(timeoutId);

      if (sessionError) {
        console.error('UnifiedAuth: Session error:', sessionError);
        setError('Failed to retrieve session');
        setLoading(false);
        this.initializing = false;
        return;
      }

      console.log('UnifiedAuth: Session retrieved:', session ? `User: ${session.user.id}` : 'No session');

      if (session) {
        setSession(session);
        await this.loadUserProfile(session.user.id);
      } else {
        // Reset auth state when no session
        useAuthStore.getState().reset();
      }

      // Set up auth state listener with debouncing
      let authStateTimeout: NodeJS.Timeout;
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('UnifiedAuth: Auth state change:', event, session?.user?.id || 'no user');
        
        // Debounce rapid auth state changes
        clearTimeout(authStateTimeout);
        authStateTimeout = setTimeout(async () => {
          try {
            if (event === 'SIGNED_IN' && session) {
              setSession(session);
              await this.loadUserProfile(session.user.id);
            } else if (event === 'SIGNED_OUT') {
              console.log('UnifiedAuth: User signed out, resetting state');
              setSession(null);
              useAuthStore.getState().reset();
            } else if (event === 'TOKEN_REFRESHED' && session) {
              console.log('UnifiedAuth: Token refreshed');
              setSession(session);
            }
          } catch (error) {
            console.error('UnifiedAuth: Error handling auth state change:', error);
            setError('Authentication state update failed');
          }
        }, 100); // 100ms debounce
      });

      this.initialized = true;
      console.log('UnifiedAuth: Initialization completed successfully');
    } catch (error) {
      console.error('UnifiedAuth: Failed to initialize:', error);
      setError('Authentication initialization failed');
    } finally {
      setLoading(false);
      this.initializing = false;
    }
  }

  private async checkAdminStatus(userId: string): Promise<AdminStatusResult> {
    try {
      console.log('UnifiedAuth: Checking admin status for user:', userId);
      
      const { data, error } = await supabase.rpc('check_user_admin_status', {
        user_uuid: userId
      });

      if (error) {
        console.error('UnifiedAuth: Error checking admin status:', error);
        return { is_admin: false, role: '', is_active: false };
      }

      if (data && data.length > 0) {
        const result = data[0];
        console.log('UnifiedAuth: Admin status result:', result);
        return {
          is_admin: result.is_admin || false,
          role: result.role || '',
          is_active: result.is_active || false
        };
      }

      return { is_admin: false, role: '', is_active: false };
    } catch (error) {
      console.error('UnifiedAuth: Exception checking admin status:', error);
      return { is_admin: false, role: '', is_active: false };
    }
  }

  private async loadUserProfile(userId: string): Promise<void> {
    try {
      console.log('UnifiedAuth: Loading user profile for:', userId);
      
      // Check admin status using the new secure function
      const adminStatus = await this.checkAdminStatus(userId);

      const { setAuthState } = useAuthStore.getState();
      
      console.log('UnifiedAuth: Setting admin status:', {
        isAdmin: adminStatus.is_admin && adminStatus.is_active,
        isSuperAdmin: adminStatus.is_admin && adminStatus.is_active && adminStatus.role === 'super_admin',
        adminRole: adminStatus.is_admin && adminStatus.is_active ? adminStatus.role : null
      });

      setAuthState({
        isAdmin: adminStatus.is_admin && adminStatus.is_active,
        isSuperAdmin: adminStatus.is_admin && adminStatus.is_active && adminStatus.role === 'super_admin',
        adminRole: adminStatus.is_admin && adminStatus.is_active ? adminStatus.role : null
      });
    } catch (error) {
      console.error('UnifiedAuth: Failed to load user profile:', error);
      // Set default non-admin state on profile load failure
      const { setAuthState } = useAuthStore.getState();
      setAuthState({
        isAdmin: false,
        isSuperAdmin: false,
        adminRole: null
      });
    }
  }

  async signOut(): Promise<ServiceResult<void>> {
    try {
      console.log('UnifiedAuth: Signing out user');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      useAuthStore.getState().reset();
      this.initialized = false; // Allow re-initialization after signout
      return { success: true };
    } catch (error) {
      console.error('UnifiedAuth: Sign out error:', error);
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
      console.error('UnifiedAuth: Sign up error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sign up failed'
      };
    }
  }

  // Add method to reset initialization state for debugging
  reset(): void {
    console.log('UnifiedAuth: Resetting initialization state');
    this.initialized = false;
    this.initializing = false;
  }
}

export const unifiedAuthService = new UnifiedAuthService();

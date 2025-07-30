
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { AuthState, TenantData } from '@/types/auth';
import { useAuthStore } from '@/lib/stores/authStore';

class UnifiedAuthService {
  private static instance: UnifiedAuthService;
  private adminStatusCache: { [userId: string]: { isAdmin: boolean; isSuperAdmin: boolean; adminRole: string | null; timestamp: number } } = {};
  private readonly ADMIN_CACHE_DURATION = 30000; // 30 seconds

  public static getInstance(): UnifiedAuthService {
    if (!UnifiedAuthService.instance) {
      UnifiedAuthService.instance = new UnifiedAuthService();
    }
    return UnifiedAuthService.instance;
  }

  // Initialize auth state listener
  initialize() {
    const { setSession, setAuthState, setLoading, setError } = useAuthStore.getState();

    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Unified Auth: Auth state change:', event);
      
      setLoading(true);
      
      try {
        if (session?.user) {
          const adminStatus = await this.getAdminStatus(session.user.id);
          
          setAuthState({
            user: session.user,
            session,
            isAuthenticated: true,
            isAdmin: adminStatus.isAdmin,
            isSuperAdmin: adminStatus.isSuperAdmin,
            adminRole: adminStatus.adminRole,
          });
        } else {
          setAuthState({
            user: null,
            session: null,
            isAuthenticated: false,
            isAdmin: false,
            isSuperAdmin: false,
            adminRole: null,
            profile: null,
          });
        }
      } catch (error) {
        console.error('Error updating auth state:', error);
        setError(error instanceof Error ? error.message : 'Authentication error');
      } finally {
        setLoading(false);
      }
    });

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
      } else {
        setLoading(false);
      }
    });
  }

  // Get admin status with caching
  private async getAdminStatus(userId: string): Promise<{ isAdmin: boolean; isSuperAdmin: boolean; adminRole: string | null }> {
    const now = Date.now();
    const cached = this.adminStatusCache[userId];
    
    // Return cached result if valid
    if (cached && (now - cached.timestamp) < this.ADMIN_CACHE_DURATION) {
      return {
        isAdmin: cached.isAdmin,
        isSuperAdmin: cached.isSuperAdmin,
        adminRole: cached.adminRole
      };
    }

    try {
      const { data: adminData, error } = await supabase
        .from('admin_users')
        .select('role, is_active')
        .eq('id', userId)
        .eq('is_active', true)
        .single();

      let result = {
        isAdmin: false,
        isSuperAdmin: false,
        adminRole: null as string | null
      };

      if (!error && adminData) {
        result = {
          isAdmin: true,
          isSuperAdmin: adminData.role === 'super_admin',
          adminRole: adminData.role
        };
      }

      // Cache the result
      this.adminStatusCache[userId] = {
        ...result,
        timestamp: now
      };

      return result;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return {
        isAdmin: false,
        isSuperAdmin: false,
        adminRole: null
      };
    }
  }

  // Sign in methods
  async signInUser(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    const { setError } = useAuthStore.getState();
    
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign in failed';
      setError(message);
      return { success: false, error: message };
    }
  }

  async signInAdmin(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.signInUser(email, password);
    
    if (result.success) {
      // Additional admin verification will happen in auth state change
      const { user } = useAuthStore.getState();
      if (user) {
        const adminStatus = await this.getAdminStatus(user.id);
        if (!adminStatus.isAdmin) {
          await this.signOut();
          return { success: false, error: 'Admin access required' };
        }
      }
    }
    
    return result;
  }

  // Sign out
  async signOut(): Promise<void> {
    const { reset } = useAuthStore.getState();
    
    try {
      await supabase.auth.signOut();
      this.adminStatusCache = {}; // Clear cache
      reset();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  // Bootstrap super admin
  async bootstrapSuperAdmin(email: string, password: string, fullName: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if bootstrap is already completed
      const { data: configData } = await supabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', 'bootstrap_completed')
        .single();

      if (configData?.config_value === 'true') {
        return { success: false, error: 'System is already initialized' };
      }

      // Call edge function for bootstrap
      const { data, error } = await supabase.functions.invoke('create-super-admin', {
        body: { email, password, fullName }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data?.error) {
        return { success: false, error: data.error };
      }

      // Sign in the newly created user
      return await this.signInAdmin(email, password);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Bootstrap failed' };
    }
  }

  // Clear admin cache (useful for testing)
  clearAdminCache(): void {
    this.adminStatusCache = {};
  }
}

export const unifiedAuthService = UnifiedAuthService.getInstance();

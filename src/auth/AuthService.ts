import { supabase } from '@/integrations/supabase/client';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { AuthState, TenantData } from '@/types/auth';

export interface AuthServiceResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

interface BootstrapStatusResponse {
  completed?: boolean;
}

/**
 * Unified Authentication Service
 * Single source of truth for all authentication operations
 */
export class AuthService {
  private static instance: AuthService;
  private initialized = false;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const { error } = await supabase.auth.getSession();
      if (error) {
        console.error('AuthService: Failed to get initial session:', error);
      }
      this.initialized = true;
      console.log('AuthService: Initialized successfully');
    } catch (error) {
      console.error('AuthService: Initialization failed:', error);
      throw error;
    }
  }

  async getCurrentSession(): Promise<Session | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    } catch (error) {
      console.error('AuthService: Failed to get current session:', error);
      return null;
    }
  }

  async refreshSession(): Promise<AuthServiceResult<Session>> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) return { success: false, error: error.message };
      return { success: true, data: data.session };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh session'
      };
    }
  }

  /**
   * Authenticate an existing administrator. This is the normal production login path.
   */
  async signInAdmin(email: string, password: string): Promise<AuthServiceResult<AuthState>> {
    try {
      console.log('AuthService: Attempting admin sign in for:', email);

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('AuthService: Sign in error:', error);
        return { success: false, error: error.message };
      }

      if (!data.user || !data.session) {
        return { success: false, error: 'Invalid credentials' };
      }

      const adminStatus = await this.checkAdminStatus(data.user.id);
      if (!adminStatus.isAdmin) {
        console.log('AuthService: User is not an active admin, signing out');
        await supabase.auth.signOut();
        return { success: false, error: 'Access denied: Admin privileges required' };
      }

      const authState: AuthState = {
        user: data.user,
        session: data.session,
        isAuthenticated: true,
        isAdmin: adminStatus.isAdmin,
        isSuperAdmin: adminStatus.isSuperAdmin,
        adminRole: adminStatus.adminRole,
        profile: null
      };

      return { success: true, data: authState };
    } catch (error) {
      console.error('AuthService: Unexpected error during sign in:', error);
      return {
        success: false,
        error: 'An unexpected error occurred during authentication'
      };
    }
  }

  /**
   * First-installation bootstrap. This must fail closed if bootstrap status
   * cannot be verified. It is not used by the normal admin login route.
   */
  async bootstrapSuperAdmin(email: string, password: string, fullName: string): Promise<AuthServiceResult<AuthState>> {
    try {
      console.log('AuthService: Starting bootstrap for:', email);

      const { data: bootstrapStatus, error: bootstrapStatusError } =
        await supabase.rpc('get_bootstrap_status');

      if (bootstrapStatusError) {
        console.error('AuthService: Cannot verify bootstrap status:', bootstrapStatusError);
        return { success: false, error: 'System initialization status could not be verified' };
      }

      const isBootstrapCompleted = bootstrapStatus &&
        typeof bootstrapStatus === 'object' &&
        'completed' in bootstrapStatus &&
        Boolean((bootstrapStatus as BootstrapStatusResponse).completed);

      if (isBootstrapCompleted) {
        return { success: false, error: 'System is already initialized' };
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: { full_name: fullName, registration_type: 'bootstrap' }
        }
      });

      if (authError) {
        console.error('AuthService: Auth user creation failed:', authError);
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'Failed to create user account' };
      }

      const { error: adminError } = await supabase
        .from('admin_users')
        .insert({
          id: authData.user.id,
          email,
          full_name: fullName,
          role: 'super_admin',
          is_active: true
        });

      if (adminError) {
        console.error('AuthService: Admin record creation failed:', adminError);
        return { success: false, error: 'Failed to create admin record' };
      }

      const { error: completeError } = await supabase.rpc('complete_bootstrap');
      if (completeError) {
        console.error('AuthService: Bootstrap completion failed:', completeError);
        return { success: false, error: 'System initialization could not be completed' };
      }

      const authState: AuthState = {
        user: authData.user,
        session: authData.session,
        isAuthenticated: !!authData.session,
        isAdmin: true,
        isSuperAdmin: true,
        adminRole: 'super_admin',
        profile: null
      };

      console.log('AuthService: Bootstrap completed successfully');
      return { success: true, data: authState };
    } catch (error) {
      console.error('AuthService: Bootstrap failed with error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bootstrap failed'
      };
    }
  }

  async signOut(): Promise<AuthServiceResult> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sign out failed'
      };
    }
  }

  /**
   * Bootstrap status is fail-closed. A status/RPC failure must never expose
   * first-admin registration in a production system.
   */
  async isBootstrapNeeded(): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('get_bootstrap_status');
      if (error) {
        console.error('AuthService: Bootstrap check error:', error);
        return false;
      }

      const isCompleted = data &&
        typeof data === 'object' &&
        'completed' in data &&
        Boolean((data as BootstrapStatusResponse).completed);

      return !isCompleted;
    } catch (error) {
      console.error('AuthService: Bootstrap check exception:', error);
      return false;
    }
  }

  private async checkAdminStatus(userId: string): Promise<{
    isAdmin: boolean;
    isSuperAdmin: boolean;
    adminRole: string | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('role, is_active')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('AuthService: Admin status check error:', error);
        return { isAdmin: false, isSuperAdmin: false, adminRole: null };
      }

      if (!data || !data.is_active) {
        return { isAdmin: false, isSuperAdmin: false, adminRole: null };
      }

      return {
        isAdmin: true,
        isSuperAdmin: data.role === 'super_admin',
        adminRole: data.role
      };
    } catch (error) {
      console.error('AuthService: Admin status check failed:', error);
      return { isAdmin: false, isSuperAdmin: false, adminRole: null };
    }
  }
}

export const authService = AuthService.getInstance();

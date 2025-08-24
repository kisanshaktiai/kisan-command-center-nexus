
import { supabase } from '@/integrations/supabase/client';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { AuthState, TenantData } from '@/types/auth';

export interface AuthServiceResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

interface BootstrapStatus {
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

  /**
   * Initialize the auth service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Get initial session
      const { data: { session }, error } = await supabase.auth.getSession();
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

  /**
   * Get current session
   */
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

  /**
   * Refresh session
   */
  async refreshSession(): Promise<AuthServiceResult<Session>> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data.session };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh session'
      };
    }
  }

  /**
   * Admin sign in with validation
   */
  async signInAdmin(email: string, password: string): Promise<AuthServiceResult<AuthState>> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user || !data.session) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Check admin status
      const adminStatus = await this.checkAdminStatus(data.user.id);
      
      if (!adminStatus.isAdmin) {
        // Sign out non-admin user
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
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Sign in failed' 
      };
    }
  }

  /**
   * Bootstrap super admin creation
   */
  async bootstrapSuperAdmin(email: string, password: string, fullName: string): Promise<AuthServiceResult<AuthState>> {
    try {
      // Check if bootstrap is needed
      const { data: bootstrapCheck } = await supabase.rpc('get_bootstrap_status');
      const bootstrapStatus = bootstrapCheck as BootstrapStatus;
      
      if (bootstrapStatus?.completed) {
        return { success: false, error: 'System is already initialized' };
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            full_name: fullName,
            registration_type: 'bootstrap'
          }
        }
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'Failed to create user account' };
      }

      // Create admin user record
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
        return { success: false, error: 'Failed to create admin record' };
      }

      // Complete bootstrap
      const { error: bootstrapError } = await supabase.rpc('complete_bootstrap');
      if (bootstrapError) {
        console.warn('Bootstrap completion warning:', bootstrapError);
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

      return { success: true, data: authState };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Bootstrap failed' 
      };
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<AuthServiceResult> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Sign out failed' 
      };
    }
  }

  /**
   * Check if bootstrap is needed
   */
  async isBootstrapNeeded(): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('get_bootstrap_status');
      if (error) {
        console.error('Bootstrap check error:', error);
        return true; // Default to showing bootstrap if check fails
      }
      const bootstrapStatus = data as BootstrapStatus;
      return !bootstrapStatus?.completed;
    } catch (error) {
      console.error('Bootstrap check exception:', error);
      return true;
    }
  }

  /**
   * Check admin status for a user
   */
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

      if (error || !data || !data.is_active) {
        return { isAdmin: false, isSuperAdmin: false, adminRole: null };
      }

      return {
        isAdmin: true,
        isSuperAdmin: data.role === 'super_admin',
        adminRole: data.role
      };
    } catch (error) {
      console.error('Admin status check failed:', error);
      return { isAdmin: false, isSuperAdmin: false, adminRole: null };
    }
  }
}

export const authService = AuthService.getInstance();

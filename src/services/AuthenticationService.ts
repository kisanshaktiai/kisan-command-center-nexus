
import { supabase } from '@/integrations/supabase/client';
import { AuthState, TenantData, AdminStatusResult } from '@/types/auth';

interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class AuthenticationService {
  private static instance: AuthenticationService;

  static getInstance(): AuthenticationService {
    if (!AuthenticationService.instance) {
      AuthenticationService.instance = new AuthenticationService();
    }
    return AuthenticationService.instance;
  }

  /**
   * Check admin status by querying the admin_users table directly
   */
  async checkAdminStatus(userId: string): Promise<AdminStatusResult> {
    try {
      console.log('AuthenticationService: Checking admin status for user:', userId);
      
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, role, is_active')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('AuthenticationService: Error checking admin status:', error);
        if (error.code === 'PGRST116') {
          return { is_admin: false, role: '', is_active: false };
        }
        return { is_admin: false, role: '', is_active: false };
      }

      if (data) {
        console.log('AuthenticationService: Admin status result:', data);
        return {
          is_admin: true,
          role: data.role || '',
          is_active: data.is_active || false
        };
      }

      return { is_admin: false, role: '', is_active: false };
    } catch (error) {
      console.error('AuthenticationService: Exception checking admin status:', error);
      return { is_admin: false, role: '', is_active: false };
    }
  }

  /**
   * Comprehensive bootstrap status check using new database function
   */
  async isBootstrapCompleted(): Promise<boolean> {
    try {
      console.log('AuthenticationService: Checking bootstrap status with new function...');
      
      const { data, error } = await supabase.rpc('get_bootstrap_status');
      
      if (error) {
        console.error('AuthenticationService: Error checking bootstrap status:', error);
        return false;
      }

      console.log('AuthenticationService: Bootstrap status response:', data);
      
      const isCompleted = data?.completed === true;
      console.log('AuthenticationService: Bootstrap completed:', isCompleted);
      
      return isCompleted;
    } catch (error) {
      console.error('AuthenticationService: Bootstrap check exception:', error);
      return false;
    }
  }

  /**
   * Get current authentication state
   */
  async getCurrentAuthState(): Promise<AuthState> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('AuthenticationService: Session error:', error);
        return this.getDefaultAuthState();
      }

      if (!session?.user) {
        return this.getDefaultAuthState();
      }

      const adminStatus = await this.checkAdminStatus(session.user.id);
      
      return {
        user: session.user,
        session,
        isAuthenticated: true,
        isAdmin: adminStatus.is_admin && adminStatus.is_active,
        isSuperAdmin: adminStatus.is_admin && adminStatus.is_active && adminStatus.role === 'super_admin',
        adminRole: adminStatus.is_admin && adminStatus.is_active ? adminStatus.role : null,
        profile: null
      };
    } catch (error) {
      console.error('AuthenticationService: Error getting auth state:', error);
      return this.getDefaultAuthState();
    }
  }

  /**
   * Sign in admin user with comprehensive validation
   */
  async signInAdmin(email: string, password: string): Promise<ServiceResult<AuthState>> {
    try {
      console.log('AuthenticationService: Admin sign in attempt for:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('AuthenticationService: Admin sign in error:', error);
        return { success: false, error: error.message };
      }

      if (!data.user || !data.session) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Check if user is actually an admin
      const adminStatus = await this.checkAdminStatus(data.user.id);
      
      if (!adminStatus.is_admin || !adminStatus.is_active) {
        // Sign out the user since they're not an admin
        await supabase.auth.signOut();
        return { success: false, error: 'Access denied: Admin privileges required' };
      }

      const authState: AuthState = {
        user: data.user,
        session: data.session,
        isAuthenticated: true,
        isAdmin: true,
        isSuperAdmin: adminStatus.role === 'super_admin',
        adminRole: adminStatus.role,
        profile: null
      };

      console.log('AuthenticationService: Admin sign in successful:', {
        userId: data.user.id,
        role: adminStatus.role,
        isSuperAdmin: adminStatus.role === 'super_admin'
      });

      return { success: true, data: authState };
    } catch (error) {
      console.error('AuthenticationService: Admin sign in exception:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Admin sign in failed' 
      };
    }
  }

  /**
   * Bootstrap super admin creation with enhanced validation
   */
  async bootstrapSuperAdmin(email: string, password: string, fullName: string): Promise<ServiceResult<AuthState>> {
    try {
      console.log('AuthenticationService: Starting bootstrap super admin creation for:', email);

      // Check bootstrap status first
      const bootstrapCompleted = await this.isBootstrapCompleted();
      
      if (bootstrapCompleted) {
        console.log('AuthenticationService: Bootstrap already completed');
        return { success: false, error: 'System is already initialized' };
      }

      console.log('AuthenticationService: Proceeding with bootstrap creation');

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            registration_type: 'bootstrap'
          }
        }
      });

      if (authError) {
        console.error('AuthenticationService: Bootstrap auth creation error:', authError);
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'Failed to create user account' };
      }

      console.log('AuthenticationService: Auth user created, creating admin record...');

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
        console.error('AuthenticationService: Bootstrap admin creation error:', adminError);
        return { success: false, error: 'Failed to create admin record' };
      }

      // Complete bootstrap using the new function
      const { data: bootstrapResult, error: bootstrapError } = await supabase.rpc('complete_bootstrap_safely');
      
      if (bootstrapError) {
        console.warn('AuthenticationService: Bootstrap completion warning:', bootstrapError);
      }

      console.log('AuthenticationService: Bootstrap completion result:', bootstrapResult);

      const authState: AuthState = {
        user: authData.user,
        session: authData.session,
        isAuthenticated: !!authData.session,
        isAdmin: true,
        isSuperAdmin: true,
        adminRole: 'super_admin',
        profile: null
      };

      console.log('AuthenticationService: Bootstrap super admin created successfully');

      return { success: true, data: authState };
    } catch (error) {
      console.error('AuthenticationService: Bootstrap exception:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Bootstrap failed' 
      };
    }
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<ServiceResult<void>> {
    try {
      console.log('AuthenticationService: Signing out user');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('AuthenticationService: Sign out error:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('AuthenticationService: Sign out exception:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Sign out failed' 
      };
    }
  }

  /**
   * Reset password
   */
  async resetPassword(email: string, tenantId?: string): Promise<ServiceResult<void>> {
    try {
      const redirectUrl = tenantId 
        ? `${window.location.origin}/auth/reset-password?tenant=${tenantId}`
        : `${window.location.origin}/auth/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Password reset failed' 
      };
    }
  }

  /**
   * Get default auth state
   */
  private getDefaultAuthState(): AuthState {
    return {
      user: null,
      session: null,
      isAuthenticated: false,
      isAdmin: false,
      isSuperAdmin: false,
      adminRole: null,
      profile: null
    };
  }
}

export const authenticationService = AuthenticationService.getInstance();

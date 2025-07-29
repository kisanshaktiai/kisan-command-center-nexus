import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AuthState, UserProfile, TenantData } from '@/types/auth';
import { BaseService, ServiceResult } from './BaseService';

/**
 * Authentication Service
 * Single source of truth for all authentication operations
 * Replaces UnifiedAuthService with improved security and consistency
 */
export class AuthenticationService extends BaseService {
  private static instance: AuthenticationService;
  private sessionValidationInterval: NodeJS.Timeout | null = null;
  private readonly SESSION_CHECK_INTERVAL = 30000; // 30 seconds

  private constructor() {
    super();
  }

  public static getInstance(): AuthenticationService {
    if (!AuthenticationService.instance) {
      AuthenticationService.instance = new AuthenticationService();
    }
    return AuthenticationService.instance;
  }

  /**
   * Get current auth state
   */
  async getCurrentAuthState(): Promise<AuthState> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session?.user) {
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

      const { isAdmin, isSuperAdmin, adminRole } = await this.checkAdminStatus(session.user.id);

      // Fetch user profile
      let profile: UserProfile | null = null;
      try {
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        profile = profileData;
      } catch (profileError) {
        console.log('No profile found for user:', session.user.id);
      }

      return {
        user: session.user,
        session,
        isAuthenticated: true,
        isAdmin,
        isSuperAdmin,
        adminRole,
        profile
      };
    } catch (error) {
      console.error('Error getting auth state:', error);
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

  /**
   * Admin Sign In - Enhanced with security logging
   */
  async signInAdmin(email: string, password: string): Promise<ServiceResult<AuthState>> {
    try {
      if (!email?.trim() || !password) {
        return { success: false, error: 'Email and password are required' };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        await this.logSecurityEvent('admin_login_failed', undefined, { email, reason: error.message });
        return { success: false, error: this.formatAuthError(error) };
      }

      if (!data.user) {
        return { success: false, error: 'Authentication failed' };
      }

      // Check admin status
      const { isAdmin, isSuperAdmin, adminRole } = await this.checkAdminStatus(data.user.id);

      if (!isAdmin) {
        await this.logSecurityEvent('admin_access_denied', data.user.id, { email, reason: 'Not an admin user' });
        await supabase.auth.signOut(); // Sign out non-admin users
        return { success: false, error: 'Access denied: Admin privileges required' };
      }

      await this.logSecurityEvent('admin_login_success', data.user.id, { email, role: adminRole });
      this.startSessionValidation();

      const authState: AuthState = {
        user: data.user,
        session: data.session,
        isAuthenticated: true,
        isAdmin,
        isSuperAdmin,
        adminRole,
        profile: null // Profile will be fetched separately if needed
      };

      return this.createResult(true, authState);

    } catch (error) {
      console.error('Admin sign in error:', error);
      return this.createResult(false, undefined, 'Authentication failed. Please try again.');
    }
  }

  /**
   * User Sign In
   */
  async signInUser(email: string, password: string): Promise<ServiceResult<AuthState>> {
    try {
      if (!email?.trim() || !password) {
        return { success: false, error: 'Email and password are required' };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        await this.logSecurityEvent('user_login_failed', undefined, { email, reason: error.message });
        return { success: false, error: this.formatAuthError(error) };
      }

      if (!data.user) {
        return { success: false, error: 'Authentication failed' };
      }

      await this.logSecurityEvent('user_login_success', data.user.id, { email });

      const authState: AuthState = {
        user: data.user,
        session: data.session,
        isAuthenticated: true,
        isAdmin: false,
        isSuperAdmin: false,
        adminRole: null,
        profile: null // Profile will be fetched separately if needed
      };

      return this.createResult(true, authState);

    } catch (error) {
      console.error('User sign in error:', error);
      return this.createResult(false, undefined, 'Authentication failed. Please try again.');
    }
  }

  /**
   * Bootstrap Super Admin - Uses edge function with service role
   */
  async bootstrapSuperAdmin(email: string, password: string, fullName: string): Promise<ServiceResult<AuthState>> {
    try {
      if (!email?.trim() || !password || !fullName?.trim()) {
        return { success: false, error: 'All fields are required' };
      }

      console.log('Bootstrap: Starting super admin creation process');

      // Check if bootstrap is already completed
      const isCompleted = await this.isBootstrapCompleted();
      if (isCompleted) {
        console.log('Bootstrap: System already initialized');
        return { success: false, error: 'System is already initialized' };
      }

      // Create registration entry first
      const { data: regData, error: regError } = await supabase
        .from('admin_registrations')
        .insert({
          email: email.trim(),
          full_name: fullName.trim(),
          role: 'super_admin',
          registration_type: 'bootstrap',
          invited_by: null
        })
        .select()
        .single();

      if (regError) {
        console.error('Bootstrap: Registration creation error:', regError);
        return { success: false, error: 'Failed to create registration record' };
      }

      console.log('Bootstrap: Registration created, calling edge function');

      // Call the edge function to create super admin with service role
      const { data: edgeResponse, error: edgeError } = await supabase.functions.invoke('create-super-admin', {
        body: {
          email: email.trim(),
          password,
          fullName: fullName.trim()
        }
      });

      if (edgeError) {
        console.error('Bootstrap: Edge function error:', edgeError);
        return { success: false, error: 'Failed to create super admin account' };
      }

      if (!edgeResponse || edgeResponse.error) {
        console.error('Bootstrap: Edge function returned error:', edgeResponse?.error);
        return { success: false, error: edgeResponse?.error || 'Failed to create super admin account' };
      }

      console.log('Bootstrap: Super admin created via edge function');

      // Now sign in the newly created user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (authError) {
        console.error('Bootstrap: Sign in error:', authError);
        return { success: false, error: 'Account created but sign in failed. Please try logging in manually.' };
      }

      if (!authData.user || !authData.session) {
        return { success: false, error: 'Sign in failed after account creation' };
      }

      console.log('Bootstrap: Sign in successful');

      // Get admin status
      const adminStatus = await this.checkUserAdminStatus(authData.user.id);

      const authState: AuthState = {
        user: authData.user,
        session: authData.session,
        isAuthenticated: true,
        isAdmin: adminStatus.isAdmin,
        isSuperAdmin: adminStatus.isSuperAdmin,
        adminRole: adminStatus.adminRole,
        profile: null
      };

      console.log('Bootstrap: Process completed successfully');
      return this.createResult(true, authState);

    } catch (error) {
      console.error('Bootstrap: Unexpected error:', error);
      return this.createResult(false, undefined, 'System initialization failed');
    }
  }

  /**
   * Sign Out with proper cleanup
   */
  async signOut(): Promise<ServiceResult<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await this.logSecurityEvent('user_logout', user.id);
      }

      this.stopSessionValidation();
      await supabase.auth.signOut();
      
      return this.createResult(true);

    } catch (error) {
      console.error('Sign out error:', error);
      return this.createResult(false, undefined, 'Sign out failed');
    }
  }

  /**
   * Check if bootstrap is completed with enhanced logic
   */
  async isBootstrapCompleted(): Promise<boolean> {
    try {
      console.log('AuthenticationService: Checking bootstrap status...');
      
      // First check system config flag
      const { data: configData, error: configError } = await supabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', 'bootstrap_completed')
        .maybeSingle();
      
      if (!configError && configData?.config_value === 'true') {
        console.log('AuthenticationService: Bootstrap flag found - completed');
        return true;
      }
      
      // If flag missing but admin users exist, consider bootstrap complete
      console.log('AuthenticationService: Bootstrap flag not found, checking admin users...');
      const { data: adminUsers, error: adminError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('is_active', true)
        .limit(1);
      
      if (adminError) {
        console.error('Error checking admin users:', adminError);
        return false;
      }
      
      const hasAdmins = adminUsers && adminUsers.length > 0;
      console.log('AuthenticationService: Active admin users found:', hasAdmins);
      
      // If admins exist but flag is missing, auto-fix the inconsistency
      if (hasAdmins) {
        console.log('AuthenticationService: Auto-fixing missing bootstrap flag...');
        await supabase
          .from('system_config')
          .upsert({ 
            config_key: 'bootstrap_completed',
            config_value: 'true',
            updated_at: new Date().toISOString()
          });
        return true;
      }
      
      console.log('AuthenticationService: Bootstrap not completed');
      return false;
    } catch (error) {
      console.error('Error checking bootstrap status:', error);
      return false;
    }
  }

  /**
   * Public method to check admin status (for external use)
   */
  async checkUserAdminStatus(userId: string): Promise<{
    isAdmin: boolean;
    isSuperAdmin: boolean;
    adminRole: string | null;
  }> {
    return this.checkAdminStatus(userId);
  }

  /**
   * Reset password functionality
   */
  async resetPassword(email: string, tenantId?: string): Promise<ServiceResult<void>> {
    try {
      if (!email?.trim()) {
        return { success: false, error: 'Email is required' };
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) {
        await this.logSecurityEvent('password_reset_failed', undefined, { email, reason: error.message });
        return { success: false, error: this.formatAuthError(error) };
      }

      await this.logSecurityEvent('password_reset_requested', undefined, { email });
      return this.createResult(true);

    } catch (error) {
      console.error('Password reset error:', error);
      return this.createResult(false, undefined, 'Password reset failed. Please try again.');
    }
  }

  /**
   * Update email
   */
  async updateEmail(newEmail: string): Promise<ServiceResult<void>> {
    try {
      if (!newEmail?.trim()) {
        return { success: false, error: 'Email is required' };
      }

      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });

      if (error) {
        return { success: false, error: this.formatAuthError(error) };
      }

      return this.createResult(true);

    } catch (error) {
      console.error('Email update error:', error);
      return this.createResult(false, undefined, 'Email update failed. Please try again.');
    }
  }

  /**
   * Update password
   */
  async updatePassword(newPassword: string): Promise<ServiceResult<void>> {
    try {
      if (!newPassword) {
        return { success: false, error: 'Password is required' };
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        return { success: false, error: this.formatAuthError(error) };
      }

      return this.createResult(true);

    } catch (error) {
      console.error('Password update error:', error);
      return this.createResult(false, undefined, 'Password update failed. Please try again.');
    }
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification(): Promise<ServiceResult<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        return { success: false, error: 'No user email found' };
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email
      });

      if (error) {
        return { success: false, error: this.formatAuthError(error) };
      }

      return this.createResult(true);

    } catch (error) {
      console.error('Resend verification error:', error);
      return this.createResult(false, undefined, 'Failed to resend verification email');
    }
  }

  // Private methods

  /**
   * Check admin status for a user
   */
  private async checkAdminStatus(userId: string): Promise<{
    isAdmin: boolean;
    isSuperAdmin: boolean;
    adminRole: string | null;
  }> {
    try {
      console.log('AuthenticationService: Checking admin status for user:', userId);
      
      const { data: adminData, error } = await supabase
        .from('admin_users')
        .select('role, is_active')
        .eq('id', userId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.log('AuthenticationService: No admin record found or error:', error.message);
        return {
          isAdmin: false,
          isSuperAdmin: false,
          adminRole: null
        };
      }

      if (adminData) {
        console.log('AuthenticationService: Admin data found:', adminData);
        return {
          isAdmin: true,
          isSuperAdmin: adminData.role === 'super_admin',
          adminRole: adminData.role
        };
      }

      return {
        isAdmin: false,
        isSuperAdmin: false,
        adminRole: null
      };
    } catch (error) {
      console.error('AuthenticationService: Error checking admin status:', error);
      return {
        isAdmin: false,
        isSuperAdmin: false,
        adminRole: null
      };
    }
  }

  /**
   * Session validation
   */
  private async validateCurrentSession(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        return false;
      }

      // Check if session is close to expiring (within 5 minutes)
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (expiresAt - now < fiveMinutes) {
        const { error: refreshError } = await supabase.auth.refreshSession();
        return !refreshError;
      }

      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }

  private startSessionValidation(): void {
    if (this.sessionValidationInterval) {
      clearInterval(this.sessionValidationInterval);
    }

    this.sessionValidationInterval = setInterval(async () => {
      const isValid = await this.validateCurrentSession();
      
      if (!isValid) {
        this.handleSessionExpiry();
      }
    }, this.SESSION_CHECK_INTERVAL);
  }

  private handleSessionExpiry(): void {
    this.stopSessionValidation();
    toast.error('Your session has expired. Please log in again.');
    supabase.auth.signOut().then(() => {
      window.location.href = '/auth';
    });
  }

  private stopSessionValidation(): void {
    if (this.sessionValidationInterval) {
      clearInterval(this.sessionValidationInterval);
      this.sessionValidationInterval = null;
    }
  }

  /**
   * Log security events
   */
  private async logSecurityEvent(
    eventType: string, 
    userId?: string, 
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      await supabase.rpc('log_security_event', {
        event_type: eventType,
        user_id: userId,
        metadata: { ...metadata, timestamp: new Date().toISOString() },
        ip_address: 'unknown',
        user_agent: navigator.userAgent
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Format auth errors for user display
   */
  private formatAuthError(error: AuthError): string {
    switch (error.message) {
      case 'Invalid login credentials':
        return 'Invalid email or password';
      case 'Email not confirmed':
        return 'Please check your email and confirm your account';
      case 'Too many requests':
        return 'Too many login attempts. Please try again later';
      default:
        return 'Authentication failed. Please try again';
    }
  }
}

export const authenticationService = AuthenticationService.getInstance();
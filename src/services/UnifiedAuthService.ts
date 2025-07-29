import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AuthState, UserProfile, TenantData } from '@/types/auth';
import { BaseService, ServiceResult } from './BaseService';

// Removed duplicate interfaces - using consolidated ones from types/auth.ts

/**
 * Unified Authentication Service
 * Single source of truth for all authentication operations
 */
export class UnifiedAuthService extends BaseService {
  private static instance: UnifiedAuthService;
  private sessionValidationInterval: NodeJS.Timeout | null = null;
  private readonly SESSION_CHECK_INTERVAL = 30000; // 30 seconds

  private constructor() {
    super();
  }

  public static getInstance(): UnifiedAuthService {
    if (!UnifiedAuthService.instance) {
      UnifiedAuthService.instance = new UnifiedAuthService();
    }
    return UnifiedAuthService.instance;
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
   * Admin Sign In
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
   * Bootstrap Super Admin
   */
  async bootstrapSuperAdmin(email: string, password: string, fullName: string): Promise<ServiceResult<AuthState>> {
    try {
      if (!email?.trim() || !password || !fullName?.trim()) {
        return { success: false, error: 'All fields are required' };
      }

      // Check if bootstrap is already completed
      const isCompleted = await this.isBootstrapCompleted();
      if (isCompleted) {
        return { success: false, error: 'System is already initialized' };
      }

      // Create registration entry
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
        console.error('Registration creation error:', regError);
        return { success: false, error: 'Failed to create registration' };
      }

      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName.trim(),
            registration_token: regData.registration_token
          }
        }
      });

      if (authError) {
        return { success: false, error: this.formatAuthError(authError) };
      }

      if (!authData.user) {
        return { success: false, error: 'User creation failed' };
      }

      // Create admin user record
      const { error: adminError } = await supabase
        .from('admin_users')
        .insert({
          id: authData.user.id,
          email: email.trim(),
          full_name: fullName.trim(),
          role: 'super_admin',
          is_active: true
        });

      if (adminError) {
        console.error('Admin user creation error:', adminError);
        return { success: false, error: 'Failed to create admin user' };
      }

      // Mark registration as completed
      await supabase
        .from('admin_registrations')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString() 
        })
        .eq('id', regData.id);

      // Mark bootstrap as completed
      await supabase
        .from('system_config')
        .upsert({ 
          config_key: 'bootstrap_completed',
          config_value: 'true',
          updated_at: new Date().toISOString()
        });

      const authState: AuthState = {
        user: authData.user,
        session: authData.session,
        isAuthenticated: true,
        isAdmin: true,
        isSuperAdmin: true,
        adminRole: 'super_admin',
        profile: null // Profile will be created after bootstrap
      };

      return this.createResult(true, authState);

    } catch (error) {
      console.error('Bootstrap error:', error);
      return this.createResult(false, undefined, 'System initialization failed');
    }
  }

  /**
   * Sign Out
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
   * Check if bootstrap is completed
   */
  async isBootstrapCompleted(): Promise<boolean> {
    try {
      console.log('UnifiedAuthService: Checking bootstrap status...');
      const { data, error } = await supabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', 'bootstrap_completed')
        .maybeSingle();
      
      if (error) {
        console.error('Error checking bootstrap status:', error);
        return false;
      }
      
      console.log('UnifiedAuthService: Bootstrap data:', data);
      const isCompleted = data?.config_value === 'true';
      console.log('UnifiedAuthService: Bootstrap completed:', isCompleted);
      return isCompleted;
    } catch (error) {
      console.error('Error checking bootstrap status:', error);
      return false;
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
      console.log('UnifiedAuthService: Checking admin status for user:', userId);
      
      const { data: adminData, error } = await supabase
        .from('admin_users')
        .select('role, is_active')
        .eq('id', userId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.log('UnifiedAuthService: No admin record found or error:', error.message);
        return {
          isAdmin: false,
          isSuperAdmin: false,
          adminRole: null
        };
      }

      if (adminData) {
        console.log('UnifiedAuthService: Admin data found:', adminData);
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
      console.error('UnifiedAuthService: Error checking admin status:', error);
      return {
        isAdmin: false,
        isSuperAdmin: false,
        adminRole: null
      };
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

export const unifiedAuthService = UnifiedAuthService.getInstance();
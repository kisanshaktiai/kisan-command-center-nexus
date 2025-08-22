
import { supabase } from '@/integrations/supabase/client';
import { User, AuthState, ServiceResult, AdminRegistrationData, SuperAdminSetupData, LoginCredentials } from '@/types';
import { BaseService } from './BaseService';

export class AuthService extends BaseService {
  private static instance: AuthService;

  static getInstance(): AuthService {
    if (!this.instance) {
      this.instance = new AuthService();
    }
    return this.instance;
  }

  /**
   * Get current authentication state
   */
  async getCurrentAuthState(): Promise<AuthState> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Auth state error:', error);
        return this.createEmptyAuthState();
      }

      if (!user) {
        return this.createEmptyAuthState();
      }

      // Check if user is admin
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('role, is_active')
        .eq('user_id', user.id)
        .single();

      const isAdmin = !!adminData?.is_active;
      const adminRole = adminData?.role || null;

      return {
        user,
        session: null,
        isAuthenticated: true,
        isAdmin,
        adminRole,
        isLoading: false,
        error: null
      };
    } catch (error) {
      console.error('Error getting auth state:', error);
      return this.createEmptyAuthState();
    }
  }

  private createEmptyAuthState(): AuthState {
    return {
      user: null,
      session: null,
      isAuthenticated: false,
      isAdmin: false,
      adminRole: null,
      isLoading: false,
      error: null
    };
  }

  /**
   * Check if system bootstrap is completed
   */
  async isBootstrapCompleted(): Promise<ServiceResult<boolean>> {
    try {
      const { data, error } = await supabase
        .from('admin_registrations')
        .select('id')
        .eq('registration_completed', true)
        .limit(1);

      if (error) {
        return this.handleError('Failed to check bootstrap status', error);
      }

      return this.handleSuccess(data.length > 0);
    } catch (error) {
      return this.handleError('Bootstrap check failed', error);
    }
  }

  /**
   * Bootstrap super admin account
   */
  async bootstrapSuperAdmin(data: SuperAdminSetupData): Promise<ServiceResult<User>> {
    try {
      // Create admin registration record first
      const { data: registrationData, error: regError } = await supabase
        .from('admin_registrations')
        .insert({
          email: data.email,
          full_name: data.full_name,
          registration_completed: false
        })
        .select()
        .single();

      if (regError) {
        return this.handleError('Failed to create admin registration', regError);
      }

      // Sign up the user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            role: 'super_admin'
          }
        }
      });

      if (authError) {
        return this.handleError('Failed to create user account', authError);
      }

      if (!authData.user) {
        return this.handleError('User creation failed - no user returned');
      }

      // Create admin user record
      const { error: adminError } = await supabase
        .from('admin_users')
        .insert({
          id: authData.user.id,
          email: data.email,
          full_name: data.full_name,
          role: 'super_admin',
          is_active: true
        });

      if (adminError) {
        return this.handleError('Failed to create admin user record', adminError);
      }

      // Mark registration as completed
      await supabase
        .from('admin_registrations')
        .update({ registration_completed: true })
        .eq('id', registrationData.id);

      return this.handleSuccess(authData.user);
    } catch (error) {
      return this.handleError('Bootstrap setup failed', error);
    }
  }

  /**
   * Sign in admin user
   */
  async signInAdmin(credentials: LoginCredentials): Promise<ServiceResult<AuthState>> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) {
        return this.handleError('Authentication failed', error);
      }

      if (!data.user) {
        return this.handleError('Authentication failed - no user returned');
      }

      // Verify admin status
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('role, is_active')
        .eq('user_id', data.user.id)
        .single();

      if (adminError || !adminData?.is_active) {
        await supabase.auth.signOut();
        return this.handleError('Access denied - invalid admin account');
      }

      const authState: AuthState = {
        user: data.user,
        session: data.session,
        isAuthenticated: true,
        isAdmin: true,
        adminRole: adminData.role,
        isLoading: false,
        error: null
      };

      return this.handleSuccess(authState);
    } catch (error) {
      return this.handleError('Sign in failed', error);
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return this.handleError('Sign out failed', error);
      }

      return this.handleSuccess(undefined);
    } catch (error) {
      return this.handleError('Sign out failed', error);
    }
  }

  /**
   * Validate invite token
   */
  async validateInviteToken(token: string): Promise<ServiceResult<AdminRegistrationData>> {
    try {
      const { data, error } = await supabase
        .from('admin_registrations')
        .select('*')
        .eq('invite_token', token)
        .eq('registration_completed', false)
        .single();

      if (error || !data) {
        return this.handleError('Invalid or expired invite token');
      }

      // Check if token is expired (24 hours)
      const tokenDate = new Date(data.created_at);
      const now = new Date();
      const hoursDiff = (now.getTime() - tokenDate.getTime()) / (1000 * 60 * 60);

      if (hoursDiff > 24) {
        return this.handleError('Invite token has expired');
      }

      return this.handleSuccess({
        email: data.email,
        full_name: data.full_name,
        token: data.invite_token
      });
    } catch (error) {
      return this.handleError('Token validation failed', error);
    }
  }

  /**
   * Register user via invite
   */
  async registerViaInvite(token: string, password: string): Promise<ServiceResult<User>> {
    try {
      // Validate token first
      const tokenResult = await this.validateInviteToken(token);
      if (!tokenResult.success) {
        return tokenResult as ServiceResult<User>;
      }

      const registration = tokenResult.data;

      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: registration.email,
        password,
        options: {
          data: {
            full_name: registration.full_name,
            role: 'admin'
          }
        }
      });

      if (authError || !authData.user) {
        return this.handleError('User registration failed', authError);
      }

      // Create admin user record
      const { error: adminError } = await supabase
        .from('admin_users')
        .insert({
          id: authData.user.id,
          email: registration.email,
          full_name: registration.full_name,
          role: 'admin',
          is_active: true
        });

      if (adminError) {
        return this.handleError('Failed to create admin record', adminError);
      }

      // Mark registration as completed
      await supabase
        .from('admin_registrations')
        .update({ registration_completed: true })
        .eq('invite_token', token);

      return this.handleSuccess(authData.user);
    } catch (error) {
      return this.handleError('Registration failed', error);
    }
  }
}

export const authService = AuthService.getInstance();

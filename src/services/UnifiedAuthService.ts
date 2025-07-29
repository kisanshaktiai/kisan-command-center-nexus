import { supabase } from '@/integrations/supabase/client';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { toast } from 'sonner';

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
  success: boolean;
}

export interface AdminAuthResponse extends AuthResponse {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  adminRole: string | null;
}

export interface RegistrationData {
  email: string;
  password: string;
  fullName: string;
  role?: string;
  registrationType?: 'bootstrap' | 'invite' | 'self';
  inviteToken?: string;
}

export class UnifiedAuthService {
  private static instance: UnifiedAuthService;

  public static getInstance(): UnifiedAuthService {
    if (!UnifiedAuthService.instance) {
      UnifiedAuthService.instance = new UnifiedAuthService();
    }
    return UnifiedAuthService.instance;
  }

  // Check if bootstrap is completed
  async isBootstrapCompleted(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', 'bootstrap_completed')
        .maybeSingle();
      
      if (error) throw error;
      return data?.config_value === 'true' || false;
    } catch (error) {
      console.error('Error checking bootstrap status:', error);
      return false;
    }
  }

  // Bootstrap super admin registration (first admin)
  async bootstrapSuperAdmin(data: RegistrationData): Promise<AdminAuthResponse> {
    try {
      // Check if bootstrap is already completed
      const isCompleted = await this.isBootstrapCompleted();
      if (isCompleted) {
        return {
          user: null,
          session: null,
          error: new Error('Bootstrap already completed') as AuthError,
          success: false,
          isAdmin: false,
          isSuperAdmin: false,
          adminRole: null
        };
      }

      // Create registration entry
      const { data: regData, error: regError } = await supabase
        .from('admin_registrations')
        .insert({
          email: data.email,
          full_name: data.fullName,
          role: 'super_admin',
          registration_type: 'bootstrap',
          invited_by: null
        })
        .select()
        .single();

      if (regError || !regData) {
        throw new Error('Failed to create registration');
      }

      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: data.fullName,
            registration_token: regData.registration_token
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Complete the registration by creating admin user
        const { error: adminError } = await supabase
          .from('admin_users')
          .insert({
            id: authData.user.id,
            email: data.email,
            full_name: data.fullName,
            role: 'super_admin',
            is_active: true
          });

        if (adminError) {
          throw new Error('Failed to create admin user');
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
          .update({ config_value: 'true' })
          .eq('config_key', 'bootstrap_completed');

        return {
          user: authData.user,
          session: authData.session,
          error: null,
          success: true,
          isAdmin: true,
          isSuperAdmin: true,
          adminRole: 'super_admin'
        };
      }

      throw new Error('User creation failed');
    } catch (error) {
      console.error('Bootstrap error:', error);
      return {
        user: null,
        session: null,
        error: error as AuthError,
        success: false,
        isAdmin: false,
        isSuperAdmin: false,
        adminRole: null
      };
    }
  }

  // Regular admin registration via invite
  async registerViaInvite(token: string, password: string): Promise<AdminAuthResponse> {
    try {
      // Validate token first
      const { data: validation, error: validationError } = await supabase
        .from('admin_registrations')
        .select('*')
        .eq('registration_token', token)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (validationError || !validation) {
        throw new Error('Invalid or expired invitation');
      }

      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: validation.email,
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: validation.full_name,
            registration_token: token
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Complete the registration by creating admin user
        const { error: adminError } = await supabase
          .from('admin_users')
          .insert({
            id: authData.user.id,
            email: validation.email,
            full_name: validation.full_name,
            role: validation.role,
            is_active: true
          });

        if (adminError) {
          throw new Error('Failed to create admin user');
        }

        // Mark registration as completed
        await supabase
          .from('admin_registrations')
          .update({ 
            status: 'completed', 
            completed_at: new Date().toISOString() 
          })
          .eq('registration_token', token);

        return {
          user: authData.user,
          session: authData.session,
          error: null,
          success: true,
          isAdmin: true,
          isSuperAdmin: validation.role === 'super_admin',
          adminRole: validation.role
        };
      }

      throw new Error('User creation failed');
    } catch (error) {
      console.error('Invite registration error:', error);
      return {
        user: null,
        session: null,
        error: error as AuthError,
        success: false,
        isAdmin: false,
        isSuperAdmin: false,
        adminRole: null
      };
    }
  }

  // Admin login
  async adminLogin(email: string, password: string): Promise<AdminAuthResponse> {
    try {
      // Sign in user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (authError) throw authError;

      if (authData.user) {
        // Check admin status
        const { data: adminData, error: adminError } = await supabase
          .from('admin_users')
          .select('role, is_active')
          .eq('id', authData.user.id)
          .eq('is_active', true)
          .single();

        if (adminError || !adminData) {
          // Not an admin, sign out
          await supabase.auth.signOut();
          throw new Error('Access denied: Admin privileges required');
        }

        return {
          user: authData.user,
          session: authData.session,
          error: null,
          success: true,
          isAdmin: true,
          isSuperAdmin: adminData.role === 'super_admin',
          adminRole: adminData.role
        };
      }

      throw new Error('Authentication failed');
    } catch (error) {
      console.error('Admin login error:', error);
      return {
        user: null,
        session: null,
        error: error as AuthError,
        success: false,
        isAdmin: false,
        isSuperAdmin: false,
        adminRole: null
      };
    }
  }

  // Create admin invite
  async createAdminInvite(email: string, fullName: string, role: string = 'admin'): Promise<{success: boolean, data?: any, error?: string}> {
    try {
      // Check if email already exists
      const { data: existingAdmin } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingAdmin) {
        return { success: false, error: 'Email already registered as admin' };
      }

      // Check if active registration exists
      const { data: existingReg } = await supabase
        .from('admin_registrations')
        .select('id')
        .eq('email', email)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (existingReg) {
        return { success: false, error: 'Active registration already exists for this email' };
      }

      const { data, error } = await supabase
        .from('admin_registrations')
        .insert({
          email,
          full_name: fullName,
          role,
          registration_type: 'invite',
          invited_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error || !data) {
        throw new Error('Failed to create invite');
      }

      return { success: true, data };
    } catch (error) {
      console.error('Create invite error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Validate invite token
  async validateInviteToken(token: string): Promise<{valid: boolean, data?: any, error?: string}> {
    try {
      const { data, error } = await supabase
        .from('admin_registrations')
        .select('email, full_name, role, expires_at, registration_type')
        .eq('registration_token', token)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        return { valid: false, error: 'Invalid or expired invitation' };
      }

      return { valid: true, data };
    } catch (error) {
      console.error('Token validation error:', error);
      return { valid: false, error: 'Token validation failed' };
    }
  }

  // Get current user admin status
  async getCurrentAdminStatus(): Promise<{isAdmin: boolean, isSuperAdmin: boolean, role: string | null}> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { isAdmin: false, isSuperAdmin: false, role: null };
      }

      const { data: adminData, error } = await supabase
        .from('admin_users')
        .select('role, is_active')
        .eq('id', user.id)
        .eq('is_active', true)
        .single();

      if (error || !adminData) {
        return { isAdmin: false, isSuperAdmin: false, role: null };
      }

      return {
        isAdmin: true,
        isSuperAdmin: adminData.role === 'super_admin',
        role: adminData.role
      };
    } catch (error) {
      console.error('Error checking admin status:', error);
      return { isAdmin: false, isSuperAdmin: false, role: null };
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}

export const unifiedAuthService = UnifiedAuthService.getInstance();

import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Ultra-minimal types to prevent any circular references
type AuthUser = User | null;
type AuthSession = Session | null;

interface MinimalAuthState {
  user: AuthUser;
  session: AuthSession;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  adminRole: string | null;
  profile: any;
}

interface MinimalResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

interface MinimalTenantData {
  organizationName: string;
  organizationType: string;
  tenantId?: string;
  fullName: string;
  phone: string;
}

export class AuthService {
  private authCallback: ((state: MinimalAuthState) => void) | null = null;

  async getCurrentAuthState(): Promise<MinimalAuthState> {
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

      // Check admin status
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('role, is_active')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .single();

      const isAdmin = Boolean(adminData);
      
      return {
        user: session.user,
        session,
        isAuthenticated: true,
        isAdmin,
        isSuperAdmin: isAdmin && adminData?.role === 'super_admin',
        adminRole: isAdmin ? adminData?.role || null : null,
        profile: null
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

  subscribeToAuthStateChanges(callback: (state: MinimalAuthState) => void): () => void {
    this.authCallback = callback;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async () => {
        const authState = await this.getCurrentAuthState();
        callback(authState);
      }
    );

    return () => {
      subscription.unsubscribe();
      this.authCallback = null;
    };
  }

  async signIn(email: string, password: string): Promise<MinimalResult<MinimalAuthState>> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user || !data.session) {
        return { success: false, error: 'Authentication failed' };
      }

      const authState = await this.getCurrentAuthState();
      return { success: true, data: authState };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sign in failed'
      };
    }
  }

  async signInUser(email: string, password: string): Promise<MinimalResult<MinimalAuthState>> {
    return this.signIn(email, password);
  }

  async signInAdmin(email: string, password: string): Promise<MinimalResult<MinimalAuthState>> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user || !data.session) {
        return { success: false, error: 'Authentication failed' };
      }

      // Check admin privileges
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('role, is_active')
        .eq('user_id', data.user.id)
        .eq('is_active', true)
        .single();

      if (!adminData) {
        return { success: false, error: 'Access denied: Administrator privileges required' };
      }

      const authState: MinimalAuthState = {
        user: data.user,
        session: data.session,
        isAuthenticated: true,
        isAdmin: true,
        isSuperAdmin: adminData.role === 'super_admin',
        adminRole: adminData.role,
        profile: null
      };

      return { success: true, data: authState };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Admin sign in failed'
      };
    }
  }

  async signUp(email: string, password: string, tenantData?: MinimalTenantData): Promise<MinimalResult<MinimalAuthState>> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: tenantData || {}
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'Registration failed' };
      }

      return {
        success: true,
        data: {
          user: data.user,
          session: data.session,
          isAuthenticated: Boolean(data.session),
          isAdmin: false,
          isSuperAdmin: false,
          adminRole: null,
          profile: null
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sign up failed'
      };
    }
  }

  async signOut(): Promise<MinimalResult<void>> {
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

  async getCurrentUser(): Promise<MinimalResult<AuthUser>> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, data: user };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get current user'
      };
    }
  }

  async getCurrentSession(): Promise<MinimalResult<AuthSession>> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, data: session };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get current session'
      };
    }
  }

  async resetPassword(email: string): Promise<MinimalResult<void>> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
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

  async updatePassword(newPassword: string): Promise<MinimalResult<User>> {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) {
        return { success: false, error: error.message };
      }
      if (!data.user) {
        return { success: false, error: 'Failed to update password' };
      }
      return { success: true, data: data.user };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Password update failed'
      };
    }
  }

  async updateEmail(newEmail: string): Promise<MinimalResult<User>> {
    try {
      const { data, error } = await supabase.auth.updateUser({
        email: newEmail
      });
      if (error) {
        return { success: false, error: error.message };
      }
      if (!data.user) {
        return { success: false, error: 'Failed to update email' };
      }
      return { success: true, data: data.user };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email update failed'
      };
    }
  }

  async refreshSession(): Promise<MinimalResult<AuthSession>> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, data: data.session };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Session refresh failed'
      };
    }
  }

  async verifyOTP(email: string, token: string, type: 'signup' | 'email'): Promise<MinimalResult<MinimalAuthState>> {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: type as any
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user || !data.session) {
        return { success: false, error: 'OTP verification failed' };
      }

      const authState = await this.getCurrentAuthState();
      return { success: true, data: authState };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OTP verification failed'
      };
    }
  }

  async resendOTP(email: string, type: 'signup'): Promise<MinimalResult<void>> {
    try {
      const { error } = await supabase.auth.resend({
        type,
        email
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OTP resend failed'
      };
    }
  }

  async checkAdminStatus(userId: string): Promise<MinimalResult<{ isAdmin: boolean; isSuperAdmin: boolean; role: string | null }>> {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('role, is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: true, data: { isAdmin: false, isSuperAdmin: false, role: null } };
        }
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: {
          isAdmin: true,
          isSuperAdmin: data.role === 'super_admin',
          role: data.role
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check admin status'
      };
    }
  }
}

export const authService = new AuthService();

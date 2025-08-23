import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Simple, primitive types only
type SimpleUser = User | null;
type SimpleSession = Session | null;

interface SimpleAuthState {
  user: SimpleUser;
  session: SimpleSession;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  adminRole: string | null;
  profile: any;
}

interface SimpleResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

interface SimpleTenantData {
  organizationName: string;
  organizationType: string;
  tenantId?: string;
  fullName: string;
  phone: string;
}

// Simple type for admin user data to avoid deep expansion
interface AdminUserData {
  role: string;
  is_active: boolean;
}

export class AuthService {
  private static instance: AuthService;
  private authCallback: ((state: SimpleAuthState) => void) | null = null;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async getCurrentAuthState(): Promise<SimpleAuthState> {
    try {
      const sessionResult = await supabase.auth.getSession();
      
      if (sessionResult.error || !sessionResult.data.session?.user) {
        return this.getEmptyAuthState();
      }

      const session = sessionResult.data.session;
      const user = session.user;

      // Check admin status with complete type bypass to avoid deep expansion
      const adminResult = (await supabase
        .from('admin_users')
        .select('role, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()) as any;

      const isAdmin = !adminResult.error && adminResult.data !== null;
      const adminData = adminResult.data as AdminUserData | null;
      
      return {
        user,
        session,
        isAuthenticated: true,
        isAdmin,
        isSuperAdmin: isAdmin && adminData?.role === 'super_admin',
        adminRole: isAdmin ? adminData?.role ?? null : null,
        profile: null
      };
    } catch (error) {
      console.error('Error getting auth state:', error);
      return this.getEmptyAuthState();
    }
  }

  subscribeToAuthStateChanges(callback: (state: SimpleAuthState) => void): () => void {
    this.authCallback = callback;

    const subscription = supabase.auth.onAuthStateChange(
      async () => {
        const authState = await this.getCurrentAuthState();
        callback(authState);
      }
    );

    return () => {
      subscription.data.subscription.unsubscribe();
      this.authCallback = null;
    };
  }

  async signIn(email: string, password: string): Promise<SimpleResult<SimpleAuthState>> {
    try {
      const result = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      if (!result.data.user || !result.data.session) {
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

  async signInUser(email: string, password: string): Promise<SimpleResult<SimpleAuthState>> {
    return this.signIn(email, password);
  }

  async signInAdmin(email: string, password: string): Promise<SimpleResult<SimpleAuthState>> {
    try {
      const result = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      if (!result.data.user || !result.data.session) {
        return { success: false, error: 'Authentication failed' };
      }

      // Check admin privileges with complete type bypass
      const adminResult = (await supabase
        .from('admin_users')
        .select('role, is_active')
        .eq('user_id', result.data.user.id)
        .eq('is_active', true)
        .maybeSingle()) as any;

      if (adminResult.error || !adminResult.data) {
        return { success: false, error: 'Access denied: Administrator privileges required' };
      }

      const adminData = adminResult.data as AdminUserData;

      const authState: SimpleAuthState = {
        user: result.data.user,
        session: result.data.session,
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

  async signUp(email: string, password: string, tenantData?: SimpleTenantData): Promise<SimpleResult<SimpleAuthState>> {
    try {
      const result = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: tenantData || {}
        }
      });

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      if (!result.data.user) {
        return { success: false, error: 'Registration failed' };
      }

      return {
        success: true,
        data: {
          user: result.data.user,
          session: result.data.session,
          isAuthenticated: Boolean(result.data.session),
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

  async signOut(): Promise<SimpleResult<void>> {
    try {
      const result = await supabase.auth.signOut();
      if (result.error) {
        return { success: false, error: result.error.message };
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sign out failed'
      };
    }
  }

  async getCurrentUser(): Promise<SimpleResult<SimpleUser>> {
    try {
      const result = await supabase.auth.getUser();
      if (result.error) {
        return { success: false, error: result.error.message };
      }
      return { success: true, data: result.data.user };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get current user'
      };
    }
  }

  async getCurrentSession(): Promise<SimpleResult<SimpleSession>> {
    try {
      const result = await supabase.auth.getSession();
      if (result.error) {
        return { success: false, error: result.error.message };
      }
      return { success: true, data: result.data.session };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get current session'
      };
    }
  }

  async resetPassword(email: string): Promise<SimpleResult<void>> {
    try {
      const result = await supabase.auth.resetPasswordForEmail(email);
      if (result.error) {
        return { success: false, error: result.error.message };
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Password reset failed'
      };
    }
  }

  async updatePassword(newPassword: string): Promise<SimpleResult<User>> {
    try {
      const result = await supabase.auth.updateUser({
        password: newPassword
      });
      if (result.error) {
        return { success: false, error: result.error.message };
      }
      if (!result.data.user) {
        return { success: false, error: 'Failed to update password' };
      }
      return { success: true, data: result.data.user };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Password update failed'
      };
    }
  }

  async updateEmail(newEmail: string): Promise<SimpleResult<User>> {
    try {
      const result = await supabase.auth.updateUser({
        email: newEmail
      });
      if (result.error) {
        return { success: false, error: result.error.message };
      }
      if (!result.data.user) {
        return { success: false, error: 'Failed to update email' };
      }
      return { success: true, data: result.data.user };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email update failed'
      };
    }
  }

  async refreshSession(): Promise<SimpleResult<SimpleSession>> {
    try {
      const result = await supabase.auth.refreshSession();
      if (result.error) {
        return { success: false, error: result.error.message };
      }
      return { success: true, data: result.data.session };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Session refresh failed'
      };
    }
  }

  async verifyOTP(email: string, token: string, type: 'signup' | 'email'): Promise<SimpleResult<SimpleAuthState>> {
    try {
      const result = await supabase.auth.verifyOtp({
        email,
        token,
        type: type as any
      });

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      if (!result.data.user || !result.data.session) {
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

  async resendOTP(email: string, type: 'signup'): Promise<SimpleResult<void>> {
    try {
      const result = await supabase.auth.resend({
        type,
        email
      });
      if (result.error) {
        return { success: false, error: result.error.message };
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OTP resend failed'
      };
    }
  }

  async checkAdminStatus(userId: string): Promise<SimpleResult<{ isAdmin: boolean; isSuperAdmin: boolean; role: string | null }>> {
    try {
      const result = (await supabase
        .from('admin_users')
        .select('role, is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle()) as any;

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      if (!result.data) {
        return { success: true, data: { isAdmin: false, isSuperAdmin: false, role: null } };
      }

      const adminData = result.data as AdminUserData;

      return {
        success: true,
        data: {
          isAdmin: true,
          isSuperAdmin: adminData.role === 'super_admin',
          role: adminData.role
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check admin status'
      };
    }
  }

  private getEmptyAuthState(): SimpleAuthState {
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

export const authService = AuthService.getInstance();

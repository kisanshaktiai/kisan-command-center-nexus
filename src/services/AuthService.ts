
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { 
  AdminRegistrationData, 
  SignInCredentials, 
  AdminInvite,
  UserProfile,
  AuthState,
  TenantData
} from '@/types/auth';

// Simple result types to avoid circular references
interface SimpleServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface SimpleAuthResult {
  success: boolean;
  data?: AuthState;
  error?: string;
}

export class AuthService {
  private authStateSubscription: ((authState: AuthState) => void) | null = null;

  async getCurrentAuthState(): Promise<AuthState> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        throw error;
      }

      if (!session?.user) {
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
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('role, is_active')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .single();

      const isAdmin = !adminError && adminData;
      
      return {
        user: session.user,
        session,
        isAuthenticated: true,
        isAdmin: !!isAdmin,
        isSuperAdmin: isAdmin && adminData.role === 'super_admin',
        adminRole: isAdmin ? adminData.role : null,
        profile: null
      };
    } catch (error) {
      console.error('Error getting current auth state:', error);
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

  subscribeToAuthStateChanges(callback: (authState: AuthState) => void): () => void {
    this.authStateSubscription = callback;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const authState = await this.getCurrentAuthState();
        callback(authState);
      }
    );

    return () => {
      subscription.unsubscribe();
      this.authStateSubscription = null;
    };
  }

  async signIn(email: string, password: string): Promise<SimpleAuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (!data.user || !data.session) {
        throw new Error('Authentication failed');
      }

      const authState = await this.getCurrentAuthState();
      return {
        success: true,
        data: authState
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sign in failed'
      };
    }
  }

  async signInUser(email: string, password: string): Promise<SimpleAuthResult> {
    return this.signIn(email, password);
  }

  async signInAdmin(email: string, password: string): Promise<SimpleAuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (!data.user || !data.session) {
        throw new Error('Authentication failed');
      }

      // Check if user has admin privileges
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('role, is_active')
        .eq('user_id', data.user.id)
        .eq('is_active', true)
        .single();

      if (adminError || !adminData) {
        throw new Error('Access denied: Administrator privileges required');
      }

      const authState: AuthState = {
        user: data.user,
        session: data.session,
        isAuthenticated: true,
        isAdmin: true,
        isSuperAdmin: adminData.role === 'super_admin',
        adminRole: adminData.role,
        profile: null
      };

      return {
        success: true,
        data: authState
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Admin sign in failed'
      };
    }
  }

  async signUp(email: string, password: string, tenantData?: TenantData): Promise<SimpleAuthResult> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: tenantData || {}
        }
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error('Registration failed');
      }

      return {
        success: true,
        data: {
          user: data.user,
          session: data.session,
          isAuthenticated: !!data.session,
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

  async signOut(): Promise<SimpleServiceResult<void>> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sign out failed'
      };
    }
  }

  async getCurrentUser(): Promise<SimpleServiceResult<User | null>> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        throw error;
      }
      return { success: true, data: user };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get current user'
      };
    }
  }

  async getCurrentSession(): Promise<SimpleServiceResult<Session | null>> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        throw error;
      }
      return { success: true, data: session };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get current session'
      };
    }
  }

  async resetPassword(email: string): Promise<SimpleServiceResult<void>> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        throw error;
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Password reset failed'
      };
    }
  }

  async updatePassword(newPassword: string): Promise<SimpleServiceResult<User>> {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) {
        throw error;
      }
      if (!data.user) {
        throw new Error('Failed to update password');
      }
      return { success: true, data: data.user };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Password update failed'
      };
    }
  }

  async updateEmail(newEmail: string): Promise<SimpleServiceResult<User>> {
    try {
      const { data, error } = await supabase.auth.updateUser({
        email: newEmail
      });
      if (error) {
        throw error;
      }
      if (!data.user) {
        throw new Error('Failed to update email');
      }
      return { success: true, data: data.user };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email update failed'
      };
    }
  }

  async refreshSession(): Promise<SimpleServiceResult<Session | null>> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        throw error;
      }
      return { success: true, data: data.session };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Session refresh failed'
      };
    }
  }

  async verifyOTP(email: string, token: string, type: 'signup' | 'email'): Promise<SimpleAuthResult> {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: type as any
      });

      if (error) {
        throw error;
      }

      if (!data.user || !data.session) {
        throw new Error('OTP verification failed');
      }

      const authState = await this.getCurrentAuthState();
      return {
        success: true,
        data: authState
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OTP verification failed'
      };
    }
  }

  async resendOTP(email: string, type: 'signup'): Promise<SimpleServiceResult<void>> {
    try {
      const { error } = await supabase.auth.resend({
        type,
        email
      });
      if (error) {
        throw error;
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OTP resend failed'
      };
    }
  }

  async getUserProfile(userId: string): Promise<SimpleServiceResult<UserProfile | null>> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: true, data: null };
        }
        throw error;
      }

      return { success: true, data: data as UserProfile };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user profile'
      };
    }
  }

  async createUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<SimpleServiceResult<UserProfile>> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          ...profileData
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return { success: true, data: data as UserProfile };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user profile'
      };
    }
  }

  async updateUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<SimpleServiceResult<UserProfile>> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(profileData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return { success: true, data: data as UserProfile };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user profile'
      };
    }
  }

  async checkAdminStatus(userId: string): Promise<SimpleServiceResult<{ isAdmin: boolean; isSuperAdmin: boolean; role: string | null }>> {
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
        throw error;
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

  async createAdminUser(userData: AdminRegistrationData & { password: string; role: string }): Promise<SimpleServiceResult<AdminRegistrationData>> {
    try {
      // Create the user account first
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true
      });

      if (authError || !authData.user) {
        throw authError || new Error('Failed to create user account');
      }

      // Create admin user record
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .insert({
          user_id: authData.user.id,
          email: userData.email,
          role: userData.role,
          is_active: true
        })
        .select()
        .single();

      if (adminError) {
        throw adminError;
      }

      return {
        success: true,
        data: {
          email: userData.email,
          full_name: userData.full_name,
          token: userData.token
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create admin user'
      };
    }
  }

  async inviteAdmin(inviteData: AdminInvite): Promise<SimpleServiceResult<AdminInvite>> {
    try {
      // Send invitation email
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(
        inviteData.email,
        {
          data: {
            role: inviteData.role,
            invited_by: inviteData.invited_by
          }
        }
      );

      if (error) {
        throw error;
      }

      return { success: true, data: inviteData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to invite admin'
      };
    }
  }
}

export const authService = new AuthService();

import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { BaseService } from './BaseService';
import { 
  AdminRegistrationData, 
  SignInCredentials, 
  AdminInvite,
  UserProfile,
  AuthState,
  TenantData
} from '@/types/auth';
import { ServiceResult } from '@/types/api';

// Simple auth result type to avoid circular references
interface SimpleAuthResult {
  success: boolean;
  data?: AuthState;
  error?: string;
}

export class AuthService extends BaseService {
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
    return this.executeOperation(async () => {
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
        user: data.user,
        session: data.session,
        isAuthenticated: !!data.session,
        isAdmin: false,
        isSuperAdmin: false,
        adminRole: null,
        profile: null
      };
    });
  }

  async signOut(): Promise<ServiceResult<void>> {
    return this.executeOperation(async () => {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    });
  }

  async getCurrentUser(): Promise<ServiceResult<User | null>> {
    return this.executeOperation(async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        throw error;
      }
      return user;
    });
  }

  async getCurrentSession(): Promise<ServiceResult<Session | null>> {
    return this.executeOperation(async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        throw error;
      }
      return session;
    });
  }

  async resetPassword(email: string): Promise<ServiceResult<void>> {
    return this.executeOperation(async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        throw error;
      }
    });
  }

  async updatePassword(newPassword: string): Promise<ServiceResult<User>> {
    return this.executeOperation(async () => {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) {
        throw error;
      }
      if (!data.user) {
        throw new Error('Failed to update password');
      }
      return data.user;
    });
  }

  async updateEmail(newEmail: string): Promise<ServiceResult<User>> {
    return this.executeOperation(async () => {
      const { data, error } = await supabase.auth.updateUser({
        email: newEmail
      });
      if (error) {
        throw error;
      }
      if (!data.user) {
        throw new Error('Failed to update email');
      }
      return data.user;
    });
  }

  async refreshSession(): Promise<ServiceResult<Session | null>> {
    return this.executeOperation(async () => {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        throw error;
      }
      return data.session;
    });
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

  async resendOTP(email: string, type: 'signup'): Promise<ServiceResult<void>> {
    return this.executeOperation(async () => {
      const { error } = await supabase.auth.resend({
        type,
        email
      });
      if (error) {
        throw error;
      }
    });
  }

  async getUserProfile(userId: string): Promise<ServiceResult<UserProfile | null>> {
    return this.executeOperation(async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No profile found
        }
        throw error;
      }

      return data as UserProfile;
    });
  }

  async createUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<ServiceResult<UserProfile>> {
    return this.executeOperation(async () => {
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

      return data as UserProfile;
    });
  }

  async updateUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<ServiceResult<UserProfile>> {
    return this.executeOperation(async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(profileData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as UserProfile;
    });
  }

  async checkAdminStatus(userId: string): Promise<ServiceResult<{ isAdmin: boolean; isSuperAdmin: boolean; role: string | null }>> {
    return this.executeOperation(async () => {
      const { data, error } = await supabase
        .from('admin_users')
        .select('role, is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { isAdmin: false, isSuperAdmin: false, role: null };
        }
        throw error;
      }

      return {
        isAdmin: true,
        isSuperAdmin: data.role === 'super_admin',
        role: data.role
      };
    });
  }

  async createAdminUser(userData: AdminRegistrationData & { password: string; role: string }): Promise<ServiceResult<AdminRegistrationData>> {
    return this.executeOperation(async () => {
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
        email: userData.email,
        full_name: userData.full_name,
        token: userData.token
      };
    });
  }

  async inviteAdmin(inviteData: AdminInvite): Promise<ServiceResult<AdminInvite>> {
    return this.executeOperation(async () => {
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

      return inviteData;
    });
  }
}

export const authService = new AuthService();

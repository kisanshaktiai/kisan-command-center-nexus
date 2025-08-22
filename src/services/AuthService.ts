
import { supabase } from '@/integrations/supabase/client';
import { BaseService, ServiceResult } from './BaseService';
import { AuthState, UserProfile, AdminStatusResult, BootstrapStatusResult, TenantData, BootstrapData } from '@/types/auth';
import { User, Session } from '@supabase/supabase-js';

export class AuthService extends BaseService {
  private static instance: AuthService;
  private authStateListeners: Array<(authState: AuthState) => void> = [];

  private constructor() {
    super();
    this.initializeAuthStateListener();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private initializeAuthStateListener() {
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthService: Auth state changed:', event);
      
      const authState: AuthState = {
        user: session?.user || null,
        session: session,
        isAuthenticated: !!session?.user,
        isAdmin: false,
        isSuperAdmin: false,
        adminRole: null,
        profile: null,
      };

      if (session?.user) {
        // Get admin status and profile
        const [adminResult, profileResult] = await Promise.all([
          this.checkAdminStatus(session.user.id),
          this.getUserProfile(session.user.id)
        ]);

        if (adminResult.success && adminResult.data) {
          authState.isAdmin = adminResult.data.is_admin;
          authState.adminRole = adminResult.data.role;
          authState.isSuperAdmin = adminResult.data.role === 'super_admin';
        }

        if (profileResult.success && profileResult.data) {
          authState.profile = profileResult.data;
        }
      }

      this.notifyAuthStateListeners(authState);
    });
  }

  async getCurrentAuthState(): Promise<AuthState> {
    return this.executeOperation(
      async () => {
        const { data: { session } } = await supabase.auth.getSession();
        
        const authState: AuthState = {
          user: session?.user || null,
          session: session,
          isAuthenticated: !!session?.user,
          isAdmin: false,
          isSuperAdmin: false,
          adminRole: null,
          profile: null,
        };

        if (session?.user) {
          const [adminResult, profileResult] = await Promise.all([
            this.checkAdminStatus(session.user.id),
            this.getUserProfile(session.user.id)
          ]);

          if (adminResult.success && adminResult.data) {
            authState.isAdmin = adminResult.data.is_admin;
            authState.adminRole = adminResult.data.role;
            authState.isSuperAdmin = adminResult.data.role === 'super_admin';
          }

          if (profileResult.success && profileResult.data) {
            authState.profile = profileResult.data;
          }
        }

        return authState;
      },
      'getCurrentAuthState'
    );
  }

  subscribeToAuthStateChanges(callback: (authState: AuthState) => void): () => void {
    this.authStateListeners.push(callback);
    
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  private notifyAuthStateListeners(authState: AuthState) {
    this.authStateListeners.forEach(listener => {
      try {
        listener(authState);
      } catch (error) {
        console.error('AuthService: Error in auth state listener:', error);
      }
    });
  }

  async signIn(email: string, password: string): Promise<ServiceResult<{ user: User; session: Session }>> {
    return this.executeOperation(
      async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        if (!data.user || !data.session) {
          throw new Error('Sign in failed');
        }

        return { user: data.user, session: data.session };
      },
      'signIn'
    );
  }

  async signUp(email: string, password: string, tenantData: TenantData): Promise<ServiceResult<{ user: User; session: Session }>> {
    return this.executeOperation(
      async () => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              tenant_data: tenantData
            }
          }
        });

        if (error) throw error;
        if (!data.user || !data.session) {
          throw new Error('Sign up failed');
        }

        return { user: data.user, session: data.session };
      },
      'signUp'
    );
  }

  async signOut(): Promise<ServiceResult<void>> {
    return this.executeOperation(
      async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
      'signOut'
    );
  }

  async checkAdminStatus(userId: string): Promise<ServiceResult<AdminStatusResult>> {
    return this.executeOperation(
      async () => {
        // Use a direct query instead of RPC for compatibility
        const { data, error } = await supabase
          .from('admin_users')
          .select('role, is_active')
          .eq('user_id', userId)
          .eq('is_active', true)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // No admin record found
            return {
              is_admin: false,
              role: '',
              is_active: false
            };
          }
          throw error;
        }

        return {
          is_admin: true,
          role: data.role,
          is_active: data.is_active
        };
      },
      'checkAdminStatus'
    );
  }

  async getUserProfile(userId: string): Promise<ServiceResult<UserProfile | null>> {
    return this.executeOperation(
      async () => {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            return null; // Profile doesn't exist
          }
          throw error;
        }

        return data;
      },
      'getUserProfile'
    );
  }

  async bootstrap(bootstrapData: BootstrapData): Promise<ServiceResult<void>> {
    return this.executeOperation(
      async () => {
        // Use a direct approach instead of RPC
        const { data, error } = await supabase.auth.signUp({
          email: bootstrapData.email,
          password: bootstrapData.password,
          options: {
            data: {
              full_name: bootstrapData.fullName,
              is_bootstrap: true
            }
          }
        });

        if (error) throw error;
        if (!data.user) throw new Error('Bootstrap failed');

        // Create admin user record
        const { error: adminError } = await supabase
          .from('admin_users')
          .insert({
            user_id: data.user.id,
            role: 'super_admin',
            is_active: true
          });

        if (adminError) throw adminError;
      },
      'bootstrap'
    );
  }

  async checkBootstrapStatus(): Promise<ServiceResult<BootstrapStatusResult>> {
    return this.executeOperation(
      async () => {
        // Check if any super admin exists
        const { data, error } = await supabase
          .from('admin_users')
          .select('id')
          .eq('role', 'super_admin')
          .eq('is_active', true)
          .limit(1);

        if (error) throw error;

        return {
          bootstrap_needed: !data || data.length === 0
        };
      },
      'checkBootstrapStatus'
    );
  }
}

export const authService = AuthService.getInstance();

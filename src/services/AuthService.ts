
import { supabase } from '@/integrations/supabase/client';
import { BaseService, ServiceResult } from './BaseService';
import { AuthState, TenantData, AdminStatus, BootstrapData } from '@/types/auth';
import { UserRepository } from '@/data/repositories/UserRepository';

export class AuthService extends BaseService {
  private static instance: AuthService;
  private userRepository: UserRepository;

  private constructor() {
    super();
    this.userRepository = new UserRepository();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async getCurrentAuthState(): Promise<AuthState> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user || !session) {
        return {
          user: null,
          session: null,
          isAuthenticated: false,
          isAdmin: false,
          isSuperAdmin: false,
          adminRole: null,
          profile: null,
        };
      }

      const adminStatus = await this.getAdminStatus();
      const profile = await this.userRepository.getUserProfile(user.id);

      return {
        user,
        session,
        isAuthenticated: true,
        isAdmin: adminStatus.isAdmin,
        isSuperAdmin: adminStatus.isSuperAdmin,
        adminRole: adminStatus.adminRole,
        profile: profile.success ? profile.data : null,
      };
    } catch (error) {
      console.error('AuthService: Failed to get current auth state:', error);
      return {
        user: null,
        session: null,
        isAuthenticated: false,
        isAdmin: false,
        isSuperAdmin: false,
        adminRole: null,
        profile: null,
      };
    }
  }

  async signIn(email: string, password: string): Promise<ServiceResult<AuthState>> {
    return this.executeOperation(
      async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        return this.getCurrentAuthState();
      },
      'signIn'
    );
  }

  async signUp(email: string, password: string, tenantData: TenantData): Promise<ServiceResult<any>> {
    return this.executeOperation(
      async () => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: tenantData.fullName,
              phone: tenantData.phone,
              tenant_data: tenantData,
            },
          },
        });

        if (error) throw error;

        return data;
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

  async getAdminStatus(): Promise<AdminStatus> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          isAdmin: false,
          isSuperAdmin: false,
          adminRole: null,
        };
      }

      const { data, error } = await supabase.rpc('get_admin_status');

      if (error) {
        console.error('AuthService: Failed to get admin status:', error);
        return {
          isAdmin: false,
          isSuperAdmin: false,
          adminRole: null,
        };
      }

      return {
        isAdmin: data?.is_admin || false,
        isSuperAdmin: data?.role === 'super_admin' || false,
        adminRole: data?.role || null,
      };
    } catch (error) {
      console.error('AuthService: Error getting admin status:', error);
      return {
        isAdmin: false,
        isSuperAdmin: false,
        adminRole: null,
      };
    }
  }

  async checkBootstrapStatus(): Promise<ServiceResult<boolean>> {
    return this.executeOperation(
      async () => {
        const { data, error } = await supabase.rpc('check_bootstrap_status');
        
        if (error) throw error;

        // Handle different possible response formats
        if (typeof data === 'boolean') {
          return data;
        }
        
        if (typeof data === 'object' && data !== null) {
          return (data as any).bootstrap_needed || false;
        }
        
        return false;
      },
      'checkBootstrapStatus'
    );
  }

  async performBootstrap(bootstrapData: BootstrapData): Promise<ServiceResult<any>> {
    return this.executeOperation(
      async () => {
        const { data, error } = await supabase.rpc('perform_bootstrap', {
          admin_email: bootstrapData.email,
          admin_password: bootstrapData.password,
          admin_full_name: bootstrapData.fullName,
        });

        if (error) throw error;

        return data;
      },
      'performBootstrap'
    );
  }

  subscribeToAuthStateChanges(callback: (authState: AuthState) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthService: Auth state changed:', event);
        const newAuthState = await this.getCurrentAuthState();
        callback(newAuthState);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }
}

export const authService = AuthService.getInstance();

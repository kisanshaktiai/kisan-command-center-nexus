
import { BaseService, ServiceResult } from './BaseService';
import { authRepository } from '@/data/repositories/AuthRepository';
import { userRepository } from '@/data/repositories/UserRepository';
import { supabase } from '@/integrations/supabase/client';
import { AuthState, TenantData, UserProfile } from '@/types/auth';
import { User, Session } from '@supabase/supabase-js';

export class AuthService extends BaseService {
  private static instance: AuthService;
  private authStateListeners: ((authState: AuthState) => void)[] = [];

  private constructor() {
    super();
    this.setupAuthStateListener();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private setupAuthStateListener(): void {
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthService: Auth state change:', event);
      
      if (event === 'SIGNED_IN' && session) {
        const authState = await this.buildAuthStateFromSession(session);
        this.notifyAuthStateListeners(authState);
      } else if (event === 'SIGNED_OUT') {
        this.notifyAuthStateListeners(this.getDefaultAuthState());
      } else if (event === 'TOKEN_REFRESHED' && session) {
        const authState = await this.buildAuthStateFromSession(session);
        this.notifyAuthStateListeners(authState);
      }
    });
  }

  async getCurrentAuthState(): Promise<AuthState> {
    try {
      const session = await authRepository.getCurrentSession();
      
      if (!session) {
        return this.getDefaultAuthState();
      }

      return await this.buildAuthStateFromSession(session);
    } catch (error) {
      console.error('AuthService: Error getting current auth state:', error);
      return this.getDefaultAuthState();
    }
  }

  async signIn(email: string, password: string): Promise<ServiceResult<AuthState>> {
    return this.executeOperation(
      async () => {
        const { user, session } = await authRepository.signIn(email, password);
        
        if (!user || !session) {
          throw new Error('Invalid credentials');
        }

        const authState = await this.buildAuthStateFromSession(session);
        return authState;
      },
      'signIn'
    );
  }

  async signOut(): Promise<ServiceResult<void>> {
    return this.executeOperation(
      async () => {
        await authRepository.signOut();
        this.notifyAuthStateListeners(this.getDefaultAuthState());
      },
      'signOut'
    );
  }

  async signUp(email: string, password: string, tenantData?: TenantData): Promise<ServiceResult<{ user: User; session: Session | null }>> {
    return this.executeOperation(
      async () => {
        const result = await authRepository.signUp(email, password, tenantData);
        return result;
      },
      'signUp'
    );
  }

  async resetPassword(email: string, tenantId?: string): Promise<ServiceResult<void>> {
    return this.executeOperation(
      async () => {
        const redirectUrl = `${window.location.origin}/reset-password`;
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl
        });

        if (error) throw error;
      },
      'resetPassword'
    );
  }

  async checkAdminStatus(userId: string): Promise<{
    isAdmin: boolean;
    isSuperAdmin: boolean;
    adminRole: string | null;
  }> {
    try {
      const adminStatus = await userRepository.checkAdminStatus(userId);
      return {
        isAdmin: adminStatus.isAdmin,
        isSuperAdmin: adminStatus.isSuperAdmin,
        adminRole: adminStatus.adminRole
      };
    } catch (error) {
      console.error('AuthService: Error checking admin status:', error);
      return {
        isAdmin: false,
        isSuperAdmin: false,
        adminRole: null
      };
    }
  }

  async bootstrapSuperAdmin(email: string, password: string, fullName: string): Promise<ServiceResult<AuthState>> {
    return this.executeOperation(
      async () => {
        // First check if bootstrap is needed
        const { data: bootstrapStatus } = await supabase.rpc('check_bootstrap_status');
        
        if (!bootstrapStatus?.requires_bootstrap) {
          throw new Error('Bootstrap is not required - super admin already exists');
        }

        // Sign up the user
        const { data: signUpResult, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              registration_type: 'bootstrap'
            }
          }
        });

        if (signUpError) throw signUpError;
        if (!signUpResult.user) throw new Error('Failed to create user');

        // Complete bootstrap process
        const { data: bootstrapResult, error: bootstrapError } = await supabase.rpc(
          'complete_bootstrap_for_user', 
          {
            user_id: signUpResult.user.id,
            user_email: email,
            user_name: fullName
          }
        );

        if (bootstrapError) throw bootstrapError;
        if (!bootstrapResult) throw new Error('Failed to complete bootstrap');

        // Sign in the newly created super admin
        const signInResult = await this.signIn(email, password);
        if (!signInResult.success || !signInResult.data) {
          throw new Error('Bootstrap completed but failed to sign in');
        }

        return signInResult.data;
      },
      'bootstrapSuperAdmin'
    );
  }

  subscribeToAuthStateChanges(callback: (authState: AuthState) => void): () => void {
    this.authStateListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  private async buildAuthStateFromSession(session: Session): Promise<AuthState> {
    const user = session.user;
    
    // Get user profile
    let profile: UserProfile | null = null;
    try {
      profile = await userRepository.getUserProfile(user.id);
    } catch (error) {
      console.warn('AuthService: Failed to load user profile:', error);
    }

    // Check admin status
    const adminStatus = await this.checkAdminStatus(user.id);

    return {
      user,
      session,
      isAuthenticated: true,
      isAdmin: adminStatus.isAdmin,
      isSuperAdmin: adminStatus.isSuperAdmin,
      adminRole: adminStatus.adminRole,
      profile
    };
  }

  private getDefaultAuthState(): AuthState {
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

  private notifyAuthStateListeners(authState: AuthState): void {
    this.authStateListeners.forEach(listener => {
      try {
        listener(authState);
      } catch (error) {
        console.error('AuthService: Error in auth state listener:', error);
      }
    });
  }
}

export const authService = AuthService.getInstance();

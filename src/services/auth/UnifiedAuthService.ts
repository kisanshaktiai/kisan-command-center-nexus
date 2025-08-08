
import { BaseService, ServiceResult } from '@/services/BaseService';
import { authRepository } from '@/data/repositories/AuthRepository';
import { User, Session } from '@supabase/supabase-js';
import { AuthState, TenantData } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';

export class UnifiedAuthService extends BaseService {
  private static instance: UnifiedAuthService;
  private initialized = false;
  private initializing = false;

  private constructor() {
    super();
  }

  public static getInstance(): UnifiedAuthService {
    if (!UnifiedAuthService.instance) {
      UnifiedAuthService.instance = new UnifiedAuthService();
    }
    return UnifiedAuthService.instance;
  }

  async initialize(): Promise<ServiceResult<void>> {
    if (this.initialized || this.initializing) {
      return { success: true };
    }

    this.initializing = true;

    try {
      const session = await authRepository.getCurrentSession();
      
      if (session) {
        await this.loadUserProfile(session.user.id);
      }

      // Set up auth state listener
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state change:', event);
        
        if (event === 'SIGNED_IN' && session) {
          await this.loadUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          this.clearAuthState();
        }
      });

      this.initialized = true;
      return { success: true };
    } catch (error) {
      return this.handleError(error, 'Failed to initialize authentication');
    } finally {
      this.initializing = false;
    }
  }

  async signIn(email: string, password: string): Promise<ServiceResult<AuthState>> {
    try {
      const { user, session } = await authRepository.signIn(email, password);
      
      if (!user || !session) {
        return { success: false, error: 'Invalid credentials' };
      }

      const authState = await this.buildAuthState(user, session);
      return { success: true, data: authState };
    } catch (error) {
      return this.handleError(error, 'Sign in failed');
    }
  }

  async signOut(): Promise<ServiceResult<void>> {
    try {
      await authRepository.signOut();
      this.clearAuthState();
      return { success: true };
    } catch (error) {
      return this.handleError(error, 'Sign out failed');
    }
  }

  async signUp(email: string, password: string, tenantData?: TenantData): Promise<ServiceResult<{ user: User; session: Session | null }>> {
    try {
      const { user, session } = await authRepository.signUp(email, password, tenantData);
      
      if (!user) {
        return { success: false, error: 'Registration failed' };
      }

      return { success: true, data: { user, session } };
    } catch (error) {
      return this.handleError(error, 'Registration failed');
    }
  }

  async getCurrentAuthState(): Promise<AuthState> {
    try {
      const session = await authRepository.getCurrentSession();
      
      if (!session) {
        return this.getDefaultAuthState();
      }

      return await this.buildAuthState(session.user, session);
    } catch (error) {
      console.error('Error getting auth state:', error);
      return this.getDefaultAuthState();
    }
  }

  async checkUserRole(userId: string): Promise<{ isAdmin: boolean; isSuperAdmin: boolean; adminRole: string | null }> {
    try {
      const adminUser = await authRepository.getAdminUser(userId);
      
      if (!adminUser || !adminUser.is_active) {
        return { isAdmin: false, isSuperAdmin: false, adminRole: null };
      }

      return {
        isAdmin: true,
        isSuperAdmin: adminUser.role === 'super_admin',
        adminRole: adminUser.role
      };
    } catch (error) {
      console.error('Error checking user role:', error);
      return { isAdmin: false, isSuperAdmin: false, adminRole: null };
    }
  }

  private async loadUserProfile(userId: string): Promise<void> {
    try {
      const roleInfo = await this.checkUserRole(userId);
      // Role info would be stored in global state management here
      console.log('User role info:', roleInfo);
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  }

  private async buildAuthState(user: User, session: Session): Promise<AuthState> {
    const roleInfo = await this.checkUserRole(user.id);
    const profile = await authRepository.getUserProfile(user.id).catch(() => null);

    return {
      user,
      session,
      isAuthenticated: true,
      isAdmin: roleInfo.isAdmin,
      isSuperAdmin: roleInfo.isSuperAdmin,
      adminRole: roleInfo.adminRole,
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

  private clearAuthState(): void {
    // Clear global auth state here
    console.log('Auth state cleared');
  }

  private handleError(error: unknown, fallbackMessage: string): ServiceResult<never> {
    const message = error instanceof Error ? error.message : fallbackMessage;
    console.error('UnifiedAuthService error:', error);
    return { success: false, error: message };
  }
}

export const unifiedAuthService = UnifiedAuthService.getInstance();

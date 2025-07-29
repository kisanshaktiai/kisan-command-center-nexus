import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { authService } from './AuthService';
import { unifiedAuthService } from './UnifiedAuthService';
import { securityService } from './SecurityService';
import { toast } from 'sonner';

// Types for authentication operations
export interface TenantData {
  organizationName: string;
  organizationType: string;
  tenantId?: string;
  fullName: string;
  phone: string;
}

export interface AuthResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  adminRole: string | null;
  profile: any;
}

/**
 * Centralized Authentication Service
 * Handles all authentication business logic, keeping UI components clean
 */
export class AuthenticationService {
  private static instance: AuthenticationService;

  public static getInstance(): AuthenticationService {
    if (!AuthenticationService.instance) {
      AuthenticationService.instance = new AuthenticationService();
    }
    return AuthenticationService.instance;
  }

  /**
   * User Registration with Tenant Data
   */
  async registerUser(
    email: string, 
    password: string, 
    tenantData: TenantData
  ): Promise<AuthResult<{ user: User; session: Session }>> {
    try {
      // Validate input data
      const validation = this.validateRegistrationData(email, password, tenantData);
      if (!validation.success) {
        return { success: false, error: validation.error };
      }

      // Call supabase auth directly for user registration
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback${tenantData.tenantId ? `?tenant=${tenantData.tenantId}` : ''}`,
          data: {
            organization_name: tenantData.organizationName,
            organization_type: tenantData.organizationType,
            tenant_id: tenantData.tenantId,
            full_name: tenantData.fullName,
            phone: tenantData.phone
          }
        }
      });
      
      if (error) {
        return { 
          success: false, 
          error: this.formatAuthError(error) 
        };
      }

      return {
        success: true,
        data: { user: data.user!, session: data.session! }
      };

    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        error: 'Registration failed. Please try again.' 
      };
    }
  }

  /**
   * User Sign In
   */
  async signInUser(email: string, password: string): Promise<AuthResult<AuthState>> {
    try {
      const validation = this.validateSignInData(email, password);
      if (!validation.success) {
        return { success: false, error: validation.error };
      }

      const result = await authService.authenticateUser(email, password);
      
      if (result.error) {
        return { 
          success: false, 
          error: this.formatAuthError(result.error) 
        };
      }

      return {
        success: true,
        data: {
          user: result.user!,
          session: result.session!,
          isAdmin: false,
          isSuperAdmin: false,
          adminRole: null,
          profile: null
        }
      };

    } catch (error) {
      console.error('Sign in error:', error);
      return { 
        success: false, 
        error: 'Sign in failed. Please check your credentials.' 
      };
    }
  }

  /**
   * Admin Sign In
   */
  async signInAdmin(email: string, password: string): Promise<AuthResult<AuthState>> {
    try {
      const validation = this.validateSignInData(email, password);
      if (!validation.success) {
        return { success: false, error: validation.error };
      }

      const result = await authService.authenticateAdmin(email, password);
      
      if (result.error) {
        return { 
          success: false, 
          error: this.formatAuthError(result.error) 
        };
      }

      return {
        success: true,
        data: {
          user: result.user!,
          session: result.session!,
          isAdmin: result.isAdmin,
          isSuperAdmin: result.isSuperAdmin,
          adminRole: result.adminRole,
          profile: null
        }
      };

    } catch (error) {
      console.error('Admin sign in error:', error);
      return { 
        success: false, 
        error: 'Admin authentication failed. Please check your credentials.' 
      };
    }
  }

  /**
   * Bootstrap Super Admin Creation
   */
  async bootstrapSuperAdmin(
    email: string, 
    password: string, 
    fullName: string
  ): Promise<AuthResult<AuthState>> {
    try {
      const validation = this.validateBootstrapData(email, password, fullName);
      if (!validation.success) {
        return { success: false, error: validation.error };
      }

      const result = await unifiedAuthService.bootstrapSuperAdmin({
        email,
        password,
        fullName,
        role: 'super_admin',
        registrationType: 'bootstrap'
      });

      if (!result.success) {
        return { 
          success: false, 
          error: result.error?.message || 'Bootstrap failed' 
        };
      }

      return {
        success: true,
        data: {
          user: result.user!,
          session: result.session!,
          isAdmin: result.isAdmin,
          isSuperAdmin: result.isSuperAdmin,
          adminRole: result.adminRole,
          profile: null
        }
      };

    } catch (error) {
      console.error('Bootstrap error:', error);
      return { 
        success: false, 
        error: 'System initialization failed. Please try again.' 
      };
    }
  }

  /**
   * Check Admin Status for Current User
   */
  async checkAdminStatus(userId: string): Promise<AuthResult<{
    isAdmin: boolean;
    isSuperAdmin: boolean;
    adminRole: string | null;
  }>> {
    try {
      const [isAdmin, isSuperAdmin, adminRole] = await Promise.all([
        securityService.isCurrentUserAdmin(),
        securityService.isCurrentUserSuperAdmin(),
        securityService.getCurrentAdminRole()
      ]);

      return {
        success: true,
        data: { isAdmin, isSuperAdmin, adminRole }
      };

    } catch (error) {
      console.error('Admin status check error:', error);
      return { 
        success: false, 
        error: 'Failed to verify admin status' 
      };
    }
  }

  /**
   * Sign Out User
   */
  async signOut(): Promise<AuthResult<void>> {
    try {
      await authService.logout();
      toast.success('Successfully signed out');
      return { success: true };

    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Error during sign out');
      return { 
        success: false, 
        error: 'Sign out failed' 
      };
    }
  }

  /**
   * Password Reset
   */
  async resetPassword(email: string, tenantId?: string): Promise<AuthResult<void>> {
    try {
      const validation = this.validateEmail(email);
      if (!validation.success) {
        return { success: false, error: validation.error };
      }

      // Implementation would call appropriate service
      // This is a placeholder for the actual implementation
      return { success: true };

    } catch (error) {
      console.error('Password reset error:', error);
      return { 
        success: false, 
        error: 'Password reset failed. Please try again.' 
      };
    }
  }

  // Validation methods
  private validateRegistrationData(
    email: string, 
    password: string, 
    tenantData: TenantData
  ): AuthResult<void> {
    if (!email || !password || !tenantData.fullName) {
      return { success: false, error: 'Please fill in all required fields' };
    }

    const emailValidation = this.validateEmail(email);
    if (!emailValidation.success) return emailValidation;

    const passwordValidation = this.validatePassword(password);
    if (!passwordValidation.success) return passwordValidation;

    return { success: true };
  }

  private validateSignInData(email: string, password: string): AuthResult<void> {
    if (!email || !password) {
      return { success: false, error: 'Please enter both email and password' };
    }

    const emailValidation = this.validateEmail(email);
    if (!emailValidation.success) return emailValidation;

    return { success: true };
  }

  private validateBootstrapData(
    email: string, 
    password: string, 
    fullName: string
  ): AuthResult<void> {
    if (!email || !password || !fullName) {
      return { success: false, error: 'Please fill in all required fields' };
    }

    const emailValidation = this.validateEmail(email);
    if (!emailValidation.success) return emailValidation;

    const passwordValidation = this.validatePassword(password);
    if (!passwordValidation.success) return passwordValidation;

    return { success: true };
  }

  private validateEmail(email: string): AuthResult<void> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: 'Please enter a valid email address' };
    }
    return { success: true };
  }

  private validatePassword(password: string): AuthResult<void> {
    if (password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long' };
    }
    return { success: true };
  }

  // Error formatting
  private formatAuthError(error: AuthError): string {
    switch (error.message) {
      case 'Invalid login credentials':
        return 'Invalid email or password. Please check your credentials.';
      case 'Email not confirmed':
        return 'Please verify your email address before signing in.';
      case 'Too many requests':
        return 'Too many login attempts. Please wait a moment before trying again.';
      default:
        return error.message || 'An authentication error occurred';
    }
  }
}

export const authenticationService = AuthenticationService.getInstance();
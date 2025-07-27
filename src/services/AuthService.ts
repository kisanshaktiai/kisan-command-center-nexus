
import { supabase } from '@/integrations/supabase/client';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { securityService } from './SecurityService';
import { toast } from 'sonner';

interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

interface AdminAuthResponse extends AuthResponse {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  adminRole: string | null;
}

export class AuthService {
  private static instance: AuthService;
  private sessionValidationInterval: NodeJS.Timeout | null = null;
  private readonly SESSION_CHECK_INTERVAL = 30000; // 30 seconds

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Enhanced admin authentication with proper validation
  async authenticateAdmin(email: string, password: string): Promise<AdminAuthResponse> {
    try {
      // Step 1: Authenticate user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (authError) {
        await this.logFailedLoginAttempt(email, authError.message);
        return {
          user: null,
          session: null,
          error: authError,
          isAdmin: false,
          isSuperAdmin: false,
          adminRole: null
        };
      }

      if (!authData.user) {
        const error = new Error('Authentication failed - no user returned') as AuthError;
        return {
          user: null,
          session: null,
          error,
          isAdmin: false,
          isSuperAdmin: false,
          adminRole: null
        };
      }

      // Step 2: Validate admin status
      const [isAdmin, isSuperAdmin, adminRole] = await Promise.all([
        securityService.isCurrentUserAdmin(),
        securityService.isCurrentUserSuperAdmin(),
        securityService.getCurrentAdminRole()
      ]);

      if (!isAdmin) {
        await this.logUnauthorizedAccess(authData.user.id, email);
        await supabase.auth.signOut(); // Sign out non-admin users
        
        const error = new Error('Access denied: Admin privileges required') as AuthError;
        return {
          user: null,
          session: null,
          error,
          isAdmin: false,
          isSuperAdmin: false,
          adminRole: null
        };
      }

      // Step 3: Log successful admin login
      await securityService.logSecurityEvent({
        event_type: 'admin_login_success',
        user_id: authData.user.id,
        metadata: {
          email,
          role: adminRole,
          timestamp: new Date().toISOString()
        }
      });

      // Step 4: Start session validation
      this.startSessionValidation();

      return {
        user: authData.user,
        session: authData.session,
        error: null,
        isAdmin,
        isSuperAdmin,
        adminRole
      };

    } catch (error) {
      console.error('Admin authentication error:', error);
      const authError = error as AuthError;
      
      return {
        user: null,
        session: null,
        error: authError,
        isAdmin: false,
        isSuperAdmin: false,
        adminRole: null
      };
    }
  }

  // Regular user authentication
  async authenticateUser(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        await this.logFailedLoginAttempt(email, error.message);
        return { user: null, session: null, error };
      }

      if (data.user) {
        await securityService.logSecurityEvent({
          event_type: 'user_login_success',
          user_id: data.user.id,
          metadata: {
            email,
            timestamp: new Date().toISOString()
          }
        });
      }

      return { user: data.user, session: data.session, error: null };

    } catch (error) {
      console.error('User authentication error:', error);
      return { user: null, session: null, error: error as AuthError };
    }
  }

  // Enhanced session validation
  private async validateCurrentSession(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.warn('Session validation failed:', error?.message);
        return false;
      }

      // Check if session is close to expiring (within 5 minutes)
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (expiresAt - now < fiveMinutes) {
        console.log('Session expiring soon, refreshing...');
        const { error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('Session refresh failed:', refreshError);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }

  // Start continuous session validation
  private startSessionValidation(): void {
    if (this.sessionValidationInterval) {
      clearInterval(this.sessionValidationInterval);
    }

    this.sessionValidationInterval = setInterval(async () => {
      const isValid = await this.validateCurrentSession();
      
      if (!isValid) {
        this.handleSessionExpiry();
      }
    }, this.SESSION_CHECK_INTERVAL);
  }

  // Handle session expiry
  private handleSessionExpiry(): void {
    console.log('Session expired, signing out...');
    this.stopSessionValidation();
    
    toast.error('Your session has expired. Please log in again.');
    
    // Force sign out and redirect
    supabase.auth.signOut().then(() => {
      window.location.href = '/auth';
    });
  }

  // Stop session validation
  private stopSessionValidation(): void {
    if (this.sessionValidationInterval) {
      clearInterval(this.sessionValidationInterval);
      this.sessionValidationInterval = null;
    }
  }

  // Enhanced logout with proper cleanup
  async logout(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await securityService.logSecurityEvent({
          event_type: 'user_logout',
          user_id: user.id,
          metadata: {
            timestamp: new Date().toISOString()
          }
        });
      }

      this.stopSessionValidation();
      await supabase.auth.signOut();
      
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // Log failed login attempts
  private async logFailedLoginAttempt(email: string, reason: string): Promise<void> {
    try {
      await securityService.logSecurityEvent({
        event_type: 'login_failed',
        metadata: {
          email,
          reason,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to log login attempt:', error);
    }
  }

  // Log unauthorized access attempts
  private async logUnauthorizedAccess(userId: string, email: string): Promise<void> {
    try {
      await securityService.logSecurityEvent({
        event_type: 'admin_access_denied',
        user_id: userId,
        metadata: {
          email,
          reason: 'User does not have admin privileges',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to log unauthorized access:', error);
    }
  }

  // Clean up on instance destruction
  destroy(): void {
    this.stopSessionValidation();
  }
}

export const authService = AuthService.getInstance();

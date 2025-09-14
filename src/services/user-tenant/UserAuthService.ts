
import { supabase } from '@/integrations/supabase/client';

export interface UserAuthStatus {
  authExists: boolean;
  userId?: string;
  issues: string[];
}

/**
 * Handles user authentication checks for tenant operations
 */
export class UserAuthService {
  /**
   * Check if user exists in auth.users table
   */
  static async checkUserAuth(email: string): Promise<UserAuthStatus> {
    try {
      console.log('UserAuthService: Checking auth for email:', email);

      if (!email || !email.trim()) {
        return {
          authExists: false,
          issues: ['Email is required']
        };
      }

      const { data: authUserResponse, error: authError } = await supabase.functions.invoke('get-user-by-email', {
        body: { user_email: email.trim() }
      });

      if (authError) {
        console.error('UserAuthService: Error checking auth user:', authError);
        return {
          authExists: false,
          issues: [`Error checking authentication: ${authError.message}`]
        };
      }

      const authUser = authUserResponse && Array.isArray(authUserResponse) && authUserResponse.length > 0 ? authUserResponse[0] : null;
      console.log('UserAuthService: Auth user result:', authUser);

      if (!authUser) {
        return {
          authExists: false,
          issues: ['User not found in authentication system']
        };
      }

      return {
        authExists: true,
        userId: authUser.id,
        issues: []
      };
    } catch (error) {
      console.error('UserAuthService: Error checking user auth:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        authExists: false,
        issues: [`Error checking status: ${errorMessage}`]
      };
    }
  }
}

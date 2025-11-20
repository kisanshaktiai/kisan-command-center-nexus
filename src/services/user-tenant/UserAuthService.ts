import { supabase } from '@/integrations/supabase/client';

export interface UserAuthStatus {
  authExists: boolean;
  userId?: string;
  issues: string[];
}

interface RetryOptions {
  maxRetries: number;
  delayMs: number;
  backoffMultiplier: number;
}

/**
 * Retry utility for edge function calls to handle deployment delays
 */
async function invokeWithRetry(
  functionName: string,
  payload: any,
  options: RetryOptions = { maxRetries: 3, delayMs: 1000, backoffMultiplier: 2 }
): Promise<{ data: any; error: any }> {
  const { maxRetries, delayMs, backoffMultiplier } = options;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload
      });
      
      // If function not found or not deployed yet, retry
      if (error && error.message?.includes('not found')) {
        if (attempt < maxRetries) {
          console.warn(`[Retry ${attempt}/${maxRetries}] Function ${functionName} not ready, waiting...`);
          await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(backoffMultiplier, attempt - 1)));
          continue;
        }
      }
      
      return { data, error };
    } catch (err: any) {
      if (attempt === maxRetries) {
        return { data: null, error: err };
      }
      console.warn(`[Retry ${attempt}/${maxRetries}] Call failed, retrying...`, err.message);
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(backoffMultiplier, attempt - 1)));
    }
  }
  
  return { data: null, error: new Error('Max retries exceeded') };
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

      const { data: authUserResponse, error: authError } = await invokeWithRetry(
        'user-management',
        { 
          operation: 'get',
          user_email: email.trim() 
        },
        { maxRetries: 3, delayMs: 2000, backoffMultiplier: 1.5 }
      );

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

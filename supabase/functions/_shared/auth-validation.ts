
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

interface AuthValidationResult {
  isValid: boolean;
  userId?: string;
  isSuperAdmin?: boolean;
  error?: string;
}

interface TenantAccessResult {
  hasAccess: boolean;
  role?: string;
  error?: string;
}

export class AuthValidator {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async validateAuth(authHeader?: string): Promise<AuthValidationResult> {
    if (!authHeader) {
      return { isValid: false, error: 'No authorization header' };
    }

    const token = authHeader.replace('Bearer ', '');
    
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser(token);
      
      if (error || !user) {
        return { isValid: false, error: 'Invalid token' };
      }

      // Check if user is super admin
      const { data: adminUser } = await this.supabase
        .from('admin_users')
        .select('role, is_active')
        .eq('id', user.id)
        .single();

      const isSuperAdmin = adminUser?.is_active && adminUser?.role === 'super_admin';

      return {
        isValid: true,
        userId: user.id,
        isSuperAdmin: !!isSuperAdmin,
      };
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Authentication failed' 
      };
    }
  }

  async validateTenantAccess(userId: string, tenantId: string, isSuperAdmin = false): Promise<TenantAccessResult> {
    if (isSuperAdmin) {
      return { hasAccess: true, role: 'super_admin' };
    }

    try {
      const { data: userTenant, error } = await this.supabase
        .from('user_tenants')
        .select('role, is_active')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .single();

      if (error || !userTenant) {
        return { hasAccess: false, error: 'No access to tenant' };
      }

      return {
        hasAccess: true,
        role: userTenant.role,
      };
    } catch (error) {
      return {
        hasAccess: false,
        error: error instanceof Error ? error.message : 'Access validation failed',
      };
    }
  }

  async ensureTenantExists(tenantId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('tenants')
        .select('id')
        .eq('id', tenantId)
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  }
}

export function createAuthValidator(): AuthValidator {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }

  return new AuthValidator(supabaseUrl, supabaseKey);
}

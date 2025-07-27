
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SecurityEvent {
  event_type: string;
  user_id?: string;
  tenant_id?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

export interface TenantValidationResult {
  isValid: boolean;
  tenantId?: string;
  error?: string;
}

export class SecurityService {
  private static instance: SecurityService;

  public static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  // Log security events for audit trail
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      const { error } = await supabase.rpc('log_security_event', {
        event_type: event.event_type,
        user_id: event.user_id,
        tenant_id: event.tenant_id,
        metadata: event.metadata || {},
        ip_address: event.ip_address || 'unknown',
        user_agent: event.user_agent || navigator.userAgent
      });
      
      if (error) {
        console.error('Failed to log security event:', error);
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  // Validate user has access to specific tenant
  async validateTenantAccess(tenantId: string, userId?: string): Promise<TenantValidationResult> {
    try {
      const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id;
      
      if (!currentUserId) {
        await this.logSecurityEvent({
          event_type: 'tenant_access_denied',
          tenant_id: tenantId,
          metadata: { reason: 'No authenticated user' }
        });
        return { isValid: false, error: 'Authentication required' };
      }

      // Check if user is super admin using the new function
      const { data: isAdmin, error: adminError } = await supabase
        .rpc('is_current_user_super_admin');

      if (!adminError && isAdmin) {
        return { isValid: true, tenantId };
      }

      // Check user-tenant association
      const { data: userTenant, error } = await supabase
        .from('user_tenants')
        .select('tenant_id, role, is_active')
        .eq('user_id', currentUserId)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .single();

      if (error || !userTenant) {
        await this.logSecurityEvent({
          event_type: 'tenant_access_denied',
          user_id: currentUserId,
          tenant_id: tenantId,
          metadata: { reason: 'No tenant access', error: error?.message }
        });
        return { isValid: false, error: 'Access denied to tenant' };
      }

      return { isValid: true, tenantId };
    } catch (error) {
      await this.logSecurityEvent({
        event_type: 'tenant_validation_error',
        tenant_id: tenantId,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
      return { isValid: false, error: 'Validation failed' };
    }
  }

  // Check if user has specific role using new functions
  async validateUserRole(requiredRole: string, tenantId?: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Check admin roles using the new security definer function
      const { data: currentRole, error: roleError } = await supabase
        .rpc('get_current_admin_role');

      if (!roleError && currentRole) {
        const roleHierarchy = ['super_admin', 'platform_admin', 'admin'];
        const userRoleIndex = roleHierarchy.indexOf(currentRole as string);
        const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
        if (userRoleIndex !== -1 && requiredRoleIndex !== -1) {
          return userRoleIndex <= requiredRoleIndex;
        }
      }

      // Check tenant-specific roles if tenant provided
      if (tenantId) {
        const { data: userTenant, error } = await supabase
          .from('user_tenants')
          .select('role, is_active')
          .eq('user_id', user.id)
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .single();

        return !error && userTenant?.role === requiredRole;
      }

      return false;
    } catch (error) {
      await this.logSecurityEvent({
        event_type: 'role_validation_error',
        tenant_id: tenantId,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
      return false;
    }
  }

  // Validate API access with tenant context
  async validateApiAccess(tenantId?: string, requiredRole?: string): Promise<{
    isValid: boolean;
    user?: any;
    tenantId?: string;
    error?: string;
  }> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return { isValid: false, error: 'Authentication required' };
      }

      // If tenant validation required
      if (tenantId) {
        const tenantValidation = await this.validateTenantAccess(tenantId, user.id);
        if (!tenantValidation.isValid) {
          return { isValid: false, error: tenantValidation.error };
        }
      }

      // If role validation required
      if (requiredRole) {
        const hasRole = await this.validateUserRole(requiredRole, tenantId);
        if (!hasRole) {
          await this.logSecurityEvent({
            event_type: 'insufficient_permissions',
            user_id: user.id,
            tenant_id: tenantId,
            metadata: { required_role: requiredRole }
          });
          return { isValid: false, error: 'Insufficient permissions' };
        }
      }

      return { isValid: true, user, tenantId };
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Validation failed' 
      };
    }
  }

  // Check if current user is super admin
  async isCurrentUserSuperAdmin(): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('is_current_user_super_admin');
      return !error && data === true;
    } catch (error) {
      console.error('Error checking super admin status:', error);
      return false;
    }
  }

  // Check if current user is any type of admin
  async isCurrentUserAdmin(): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('is_current_user_admin');
      return !error && data === true;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  // Get current admin role
  async getCurrentAdminRole(): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('get_current_admin_role');
      return !error && data ? data : null;
    } catch (error) {
      console.error('Error getting admin role:', error);
      return null;
    }
  }

  // Track admin session
  async trackAdminSession(sessionData: Record<string, any> = {}): Promise<void> {
    try {
      const { error } = await supabase.rpc('track_admin_session', {
        session_data: sessionData
      });
      
      if (error) {
        console.error('Failed to track admin session:', error);
      }
    } catch (error) {
      console.error('Failed to track admin session:', error);
    }
  }

  // Monitor for suspicious activities
  async detectSuspiciousActivity(userId: string, activity: string): Promise<void> {
    try {
      // Simple rate limiting check - using direct query to avoid type issues
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      // Use a more generic approach to avoid TypeScript issues
      const { count, error } = await supabase
        .from('security_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('event_type', activity)
        .gte('created_at', fiveMinutesAgo.toISOString());

      if (error) {
        console.error('Failed to check suspicious activity:', error);
        return;
      }

      // Alert if more than 10 similar events in 5 minutes
      if (count && count > 10) {
        await this.logSecurityEvent({
          event_type: 'suspicious_activity_detected',
          user_id: userId,
          metadata: {
            activity,
            count: count,
            timeframe: '5_minutes'
          }
        });

        toast.error('Suspicious activity detected. Account may be temporarily restricted.');
      }
    } catch (error) {
      console.error('Error in suspicious activity detection:', error);
    }
  }
}

export const securityService = SecurityService.getInstance();

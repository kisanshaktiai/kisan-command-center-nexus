
import { supabase } from '@/integrations/supabase/client';
import { securityService } from './SecurityService';
import { toast } from 'sonner';

export interface SecureTenantQuery {
  tenantId: string;
  userId?: string;
  validateAccess?: boolean;
}

export class EnhancedMultiTenantService {
  private static instance: EnhancedMultiTenantService;

  public static getInstance(): EnhancedMultiTenantService {
    if (!EnhancedMultiTenantService.instance) {
      EnhancedMultiTenantService.instance = new EnhancedMultiTenantService();
    }
    return EnhancedMultiTenantService.instance;
  }

  // Secure query wrapper with tenant validation
  async secureQuery<T>(
    query: SecureTenantQuery,
    operation: (tenantId: string) => Promise<T>
  ): Promise<T> {
    try {
      // Validate tenant access if required
      if (query.validateAccess !== false) {
        const validation = await securityService.validateTenantAccess(
          query.tenantId,
          query.userId
        );

        if (!validation.isValid) {
          throw new Error(validation.error || 'Tenant access denied');
        }
      }

      // Log the secure operation
      await securityService.logSecurityEvent({
        event_type: 'secure_tenant_query',
        tenant_id: query.tenantId,
        user_id: query.userId,
        metadata: {
          timestamp: new Date().toISOString()
        }
      });

      // Execute the operation
      return await operation(query.tenantId);
    } catch (error) {
      // Log security incident
      await securityService.logSecurityEvent({
        event_type: 'secure_query_failed',
        tenant_id: query.tenantId,
        user_id: query.userId,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      });

      throw error;
    }
  }

  // Get tenant-scoped Supabase client with enhanced security
  getTenantScopedClient(tenantId: string) {
    return {
      // Provide access to the original client for non-tenant-scoped operations
      client: supabase,
      
      // Tenant-scoped query operations
      from: (tableName: string) => {
        return {
          // Secure select with tenant validation
          select: async (columns?: string) => {
            const validation = await securityService.validateTenantAccess(tenantId);
            if (!validation.isValid) {
              throw new Error('Tenant access denied for select operation');
            }

            try {
              const query = supabase.from(tableName as any).select(columns);
              return query.eq('tenant_id', tenantId);
            } catch {
              // If tenant_id doesn't exist on this table, return without filter
              return supabase.from(tableName as any).select(columns);
            }
          },
          
          // Secure insert with tenant injection
          insert: async (values: any) => {
            const validation = await securityService.validateTenantAccess(tenantId);
            if (!validation.isValid) {
              throw new Error('Tenant access denied for insert operation');
            }

            // Add tenant_id to insert if it's an object
            if (typeof values === 'object' && !Array.isArray(values)) {
              return supabase.from(tableName as any).insert({ ...values, tenant_id: tenantId });
            } else if (Array.isArray(values)) {
              return supabase.from(tableName as any).insert(values.map(v => ({ ...v, tenant_id: tenantId })));
            }
            return supabase.from(tableName as any).insert(values);
          },
          
          // Secure update with tenant boundary
          update: async (values: any) => {
            const validation = await securityService.validateTenantAccess(tenantId);
            if (!validation.isValid) {
              throw new Error('Tenant access denied for update operation');
            }

            return supabase.from(tableName as any).update(values).eq('tenant_id', tenantId);
          },
          
          // Secure delete with tenant boundary
          delete: async () => {
            const validation = await securityService.validateTenantAccess(tenantId);
            if (!validation.isValid) {
              throw new Error('Tenant access denied for delete operation');
            }

            return supabase.from(tableName as any).delete().eq('tenant_id', tenantId);
          },
        };
      },
      
      getTenantId: () => tenantId,
    };
  }

  // Validate and switch tenant context securely
  async switchTenantContext(newTenantId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Authentication required');
      }

      // Validate access to new tenant
      const validation = await securityService.validateTenantAccess(newTenantId, user.id);
      if (!validation.isValid) {
        await securityService.logSecurityEvent({
          event_type: 'tenant_switch_denied',
          user_id: user.id,
          tenant_id: newTenantId,
          metadata: { reason: validation.error }
        });
        throw new Error(validation.error || 'Cannot switch to tenant');
      }

      // Log successful tenant switch
      await securityService.logSecurityEvent({
        event_type: 'tenant_switch_success',
        user_id: user.id,
        tenant_id: newTenantId,
        metadata: { timestamp: new Date().toISOString() }
      });

      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to switch tenant');
      return false;
    }
  }

  // Audit tenant data access
  async auditTenantAccess(tenantId: string, operation: string, tableNames: string[]): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await securityService.logSecurityEvent({
        event_type: 'tenant_data_access',
        user_id: user?.id,
        tenant_id: tenantId,
        metadata: {
          operation,
          tables: tableNames,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to audit tenant access:', error);
    }
  }
}

export const enhancedMultiTenantService = EnhancedMultiTenantService.getInstance();


import { supabase } from '@/integrations/supabase/client';
import { BaseService, ServiceResult } from '@/services/BaseService';

export interface GenericOperationRequest {
  operation: 'create' | 'read' | 'update' | 'delete' | 'list' | 'validate' | 'audit';
  table: string;
  data?: any;
  id?: string;
  filters?: Record<string, any>;
  options?: {
    select?: string;
    orderBy?: { column: string; ascending: boolean };
    limit?: number;
    tenant_id?: string;
    audit_action?: string;
    validation_rules?: string[];
  };
}

export interface ValidationResult {
  isValid: boolean;
  results: { field: string; valid: boolean; message?: string }[];
}

/**
 * Generic Operations Service - Provides reusable CRUD operations
 * Uses the generic-operations edge function for secure, multi-tenant operations
 */
export class GenericOperationsService extends BaseService {
  private static instance: GenericOperationsService;

  private constructor() {
    super();
  }

  public static getInstance(): GenericOperationsService {
    if (!GenericOperationsService.instance) {
      GenericOperationsService.instance = new GenericOperationsService();
    }
    return GenericOperationsService.instance;
  }

  /**
   * Create a new record
   */
  async create<T = any>(
    table: string, 
    data: Partial<T>, 
    options?: { tenant_id?: string }
  ): Promise<ServiceResult<T>> {
    return this.executeOperation(
      async () => {
        const { data: result, error } = await supabase.functions.invoke('generic-operations', {
          body: {
            operation: 'create',
            table,
            data,
            options
          }
        });

        if (error) throw new Error(error.message);
        if (!result?.success) throw new Error(result?.error || 'Create operation failed');

        return result.data;
      },
      'create'
    );
  }

  /**
   * Read a single record by ID
   */
  async read<T = any>(
    table: string, 
    id: string, 
    options?: { select?: string; tenant_id?: string }
  ): Promise<ServiceResult<T>> {
    return this.executeOperation(
      async () => {
        const { data: result, error } = await supabase.functions.invoke('generic-operations', {
          body: {
            operation: 'read',
            table,
            id,
            options
          }
        });

        if (error) throw new Error(error.message);
        if (!result?.success) throw new Error(result?.error || 'Read operation failed');

        return result.data;
      },
      'read'
    );
  }

  /**
   * Update a record by ID
   */
  async update<T = any>(
    table: string, 
    id: string, 
    data: Partial<T>, 
    options?: { tenant_id?: string }
  ): Promise<ServiceResult<T>> {
    return this.executeOperation(
      async () => {
        const { data: result, error } = await supabase.functions.invoke('generic-operations', {
          body: {
            operation: 'update',
            table,
            id,
            data,
            options
          }
        });

        if (error) throw new Error(error.message);
        if (!result?.success) throw new Error(result?.error || 'Update operation failed');

        return result.data;
      },
      'update'
    );
  }

  /**
   * Delete a record by ID (soft delete when possible)
   */
  async delete(
    table: string, 
    id: string, 
    options?: { tenant_id?: string }
  ): Promise<ServiceResult<boolean>> {
    return this.executeOperation(
      async () => {
        const { data: result, error } = await supabase.functions.invoke('generic-operations', {
          body: {
            operation: 'delete',
            table,
            id,
            options
          }
        });

        if (error) throw new Error(error.message);
        if (!result?.success) throw new Error(result?.error || 'Delete operation failed');

        return true;
      },
      'delete'
    );
  }

  /**
   * List records with optional filters
   */
  async list<T = any>(
    table: string, 
    filters?: Record<string, any>, 
    options?: {
      select?: string;
      orderBy?: { column: string; ascending: boolean };
      limit?: number;
      tenant_id?: string;
    }
  ): Promise<ServiceResult<T[]>> {
    return this.executeOperation(
      async () => {
        const { data: result, error } = await supabase.functions.invoke('generic-operations', {
          body: {
            operation: 'list',
            table,
            filters,
            options
          }
        });

        if (error) throw new Error(error.message);
        if (!result?.success) throw new Error(result?.error || 'List operation failed');

        return result.data || [];
      },
      'list'
    );
  }

  /**
   * Validate data against rules
   */
  async validate(
    table: string, 
    data: any, 
    validationRules: string[]
  ): Promise<ServiceResult<ValidationResult>> {
    return this.executeOperation(
      async () => {
        const { data: result, error } = await supabase.functions.invoke('generic-operations', {
          body: {
            operation: 'validate',
            table,
            data,
            options: { validation_rules: validationRules }
          }
        });

        if (error) throw new Error(error.message);
        if (!result?.success) throw new Error(result?.error || 'Validation failed');

        return result.data;
      },
      'validate'
    );
  }

  /**
   * Get audit trail for a record
   */
  async getAuditTrail(
    table: string, 
    id: string
  ): Promise<ServiceResult<any[]>> {
    return this.executeOperation(
      async () => {
        const { data: result, error } = await supabase.functions.invoke('generic-operations', {
          body: {
            operation: 'audit',
            table,
            id
          }
        });

        if (error) throw new Error(error.message);
        if (!result?.success) throw new Error(result?.error || 'Audit trail retrieval failed');

        return result.data || [];
      },
      'audit'
    );
  }
}

// Export singleton instance
export const genericOperationsService = GenericOperationsService.getInstance();

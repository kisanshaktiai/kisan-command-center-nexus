
import { BaseService, ServiceResult } from '@/services/BaseService';
import { tenantApiService } from '@/services/api/TenantApiService';
import { CreateTenantDTO, UpdateTenantDTO, TenantFilters, Tenant } from '@/types/tenant';
import { supabase } from '@/integrations/supabase/client';

export class TenantManagementService extends BaseService {
  private static instance: TenantManagementService;

  private constructor() {
    super();
  }

  public static getInstance(): TenantManagementService {
    if (!TenantManagementService.instance) {
      TenantManagementService.instance = new TenantManagementService();
    }
    return TenantManagementService.instance;
  }

  async getAllTenants(filters?: TenantFilters): Promise<ServiceResult<Tenant[]>> {
    return tenantApiService.getTenants(filters);
  }

  async getTenantById(id: string): Promise<ServiceResult<Tenant>> {
    return tenantApiService.getTenantById(id);
  }

  async createTenant(data: CreateTenantDTO): Promise<ServiceResult<Tenant>> {
    // Validate tenant data before creation
    const validationResult = await this.validateTenantData(data);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error,
        data: null
      } as ServiceResult<Tenant>;
    }

    return tenantApiService.createTenant(data);
  }

  async updateTenant(id: string, data: UpdateTenantDTO): Promise<ServiceResult<Tenant>> {
    return tenantApiService.updateTenant(id, data);
  }

  async suspendTenant(id: string, reason?: string): Promise<ServiceResult<boolean>> {
    return this.executeOperation(
      async () => {
        const { data, error } = await supabase.rpc('suspend_tenant', {
          p_tenant_id: id,
          p_reason: reason || 'Suspended by admin'
        });

        if (error) {
          throw new Error(error.message);
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Failed to suspend tenant');
        }

        return true;
      },
      'suspendTenant'
    );
  }

  async reactivateTenant(id: string): Promise<ServiceResult<boolean>> {
    return this.executeOperation(
      async () => {
        const { data, error } = await supabase.rpc('reactivate_tenant', {
          p_tenant_id: id
        });

        if (error) {
          throw new Error(error.message);
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Failed to reactivate tenant');
        }

        return true;
      },
      'reactivateTenant'
    );
  }

  // Archive tenant after 30 days of suspension
  async archiveTenant(id: string, archiveLocation: string, encryptionKeyId: string): Promise<ServiceResult<boolean>> {
    return this.executeOperation(
      async () => {
        const { data, error } = await supabase.rpc('archive_tenant_data', {
          p_tenant_id: id,
          p_archive_location: archiveLocation,
          p_encryption_key_id: encryptionKeyId
        });

        if (error) {
          throw new Error(error.message);
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Failed to archive tenant');
        }

        return true;
      },
      'archiveTenant'
    );
  }

  // Legacy delete method - now redirects to suspend
  async deleteTenant(id: string): Promise<ServiceResult<boolean>> {
    // Instead of hard delete, suspend the tenant
    return this.suspendTenant(id, 'Deleted by admin - converted to suspension');
  }

  async validateTenantData(data: Partial<CreateTenantDTO>): Promise<ServiceResult<boolean>> {
    return this.executeOperation(
      async () => {
        const errors: string[] = [];

        if (!data.name?.trim()) {
          errors.push('Tenant name is required');
        }

        if (!data.slug?.trim()) {
          errors.push('Tenant slug is required');
        }

        if (!data.owner_email?.trim()) {
          errors.push('Owner email is required');
        }

        if (!data.owner_name?.trim()) {
          errors.push('Owner name is required');
        }

        // Validate email format
        if (data.owner_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.owner_email)) {
          errors.push('Invalid email format');
        }

        if (errors.length > 0) {
          throw new Error(errors.join(', '));
        }

        return true;
      },
      'validateTenantData'
    );
  }
}

export const tenantManagementService = TenantManagementService.getInstance();

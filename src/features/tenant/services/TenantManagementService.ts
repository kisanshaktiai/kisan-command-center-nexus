
import { BaseService, ServiceResult } from '@/services/BaseService';
import { tenantDomainService } from '@/domain/tenants/TenantDomainService';
import { CreateTenantDTO, UpdateTenantDTO, TenantFilters, Tenant } from '@/types/tenant';
import { supabase } from '@/integrations/supabase/client';

// Type for RPC response
interface RPCResponse {
  success: boolean;
  error?: string;
  message?: string;
  tenant_id?: string;
  archive_job_id?: string;
}

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
    return tenantDomainService.getAllTenants(filters);
  }

  async getTenantById(id: string): Promise<ServiceResult<Tenant>> {
    return tenantDomainService.getTenantById(id);
  }

  async createTenant(data: CreateTenantDTO): Promise<ServiceResult<Tenant>> {
    return tenantDomainService.createTenant(data);
  }

  async updateTenant(id: string, data: UpdateTenantDTO): Promise<ServiceResult<Tenant>> {
    return tenantDomainService.updateTenant(id, data);
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

        const result = data as unknown as RPCResponse;
        if (!result?.success) {
          throw new Error(result?.error || 'Failed to suspend tenant');
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

        const result = data as unknown as RPCResponse;
        if (!result?.success) {
          throw new Error(result?.error || 'Failed to reactivate tenant');
        }

        return true;
      },
      'reactivateTenant'
    );
  }

  // Legacy delete method - now redirects to suspend
  async deleteTenant(id: string): Promise<ServiceResult<boolean>> {
    return this.suspendTenant(id, 'Deleted by admin - converted to suspension');
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

        const result = data as unknown as RPCResponse;
        if (!result?.success) {
          throw new Error(result?.error || 'Failed to archive tenant');
        }

        return true;
      },
      'archiveTenant'
    );
  }
}

export const tenantManagementService = TenantManagementService.getInstance();

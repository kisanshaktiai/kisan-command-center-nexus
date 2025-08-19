
import { BaseService, ServiceResult } from '@/services/BaseService';
import { tenantApiService } from '@/services/api/TenantApiService';
import { CreateTenantDTO, UpdateTenantDTO, Tenant, TenantFilters } from '@/types/tenant';

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

  async getTenants(filters?: TenantFilters): Promise<ServiceResult<Tenant[]>> {
    return this.executeOperation(
      () => tenantApiService.getTenants(filters),
      'getTenants'
    );
  }

  async getTenantById(id: string): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      () => tenantApiService.getTenant(id),
      'getTenantById'
    );
  }

  async createTenant(data: CreateTenantDTO): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      () => tenantApiService.createTenant(data),
      'createTenant'
    );
  }

  async updateTenant(id: string, data: UpdateTenantDTO): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      () => tenantApiService.updateTenant(id, data),
      'updateTenant'
    );
  }

  async suspendTenant(id: string, reason?: string): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      () => tenantApiService.updateTenant(id, { 
        status: 'suspended',
        suspended_at: new Date().toISOString(),
        metadata: { suspension_reason: reason }
      }),
      'suspendTenant'
    );
  }

  async reactivateTenant(id: string): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      () => tenantApiService.updateTenant(id, { 
        status: 'active',
        reactivated_at: new Date().toISOString(),
        suspended_at: undefined
      }),
      'reactivateTenant'
    );
  }

  async deleteTenant(id: string): Promise<ServiceResult<boolean>> {
    return this.executeOperation(
      () => tenantApiService.deleteTenant(id),
      'deleteTenant'
    );
  }
}

export const tenantManagementService = TenantManagementService.getInstance();

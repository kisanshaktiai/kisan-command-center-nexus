
import { BaseService, ServiceResult } from '@/services/BaseService';
import { tenantApiService } from '@/services/api/TenantApiService';
import { CreateTenantDTO, UpdateTenantDTO, Tenant, TenantFilters } from '@/types/tenant';
import { ApiResponse } from '@/types/api';

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

  private extractApiData<T>(result: ServiceResult<ApiResponse<T>>): ServiceResult<T> {
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const apiResponse = result.data as ApiResponse<T>;
    if (apiResponse.success && apiResponse.data) {
      return { success: true, data: apiResponse.data };
    }

    return { success: false, error: apiResponse.error || 'API request failed' };
  }

  async getTenants(filters?: TenantFilters): Promise<ServiceResult<Tenant[]>> {
    const result = await this.executeOperation(
      () => tenantApiService.getTenants(filters),
      'getTenants'
    );
    
    return this.extractApiData(result as ServiceResult<ApiResponse<Tenant[]>>);
  }

  async getTenantById(id: string): Promise<ServiceResult<Tenant>> {
    const result = await this.executeOperation(
      () => tenantApiService.getTenant(id),
      'getTenantById'
    );
    
    return this.extractApiData(result as ServiceResult<ApiResponse<Tenant>>);
  }

  async createTenant(data: CreateTenantDTO): Promise<ServiceResult<Tenant>> {
    const result = await this.executeOperation(
      () => tenantApiService.createTenant(data),
      'createTenant'
    );
    
    return this.extractApiData(result as ServiceResult<ApiResponse<Tenant>>);
  }

  async updateTenant(id: string, data: UpdateTenantDTO): Promise<ServiceResult<Tenant>> {
    const result = await this.executeOperation(
      () => tenantApiService.updateTenant(id, data),
      'updateTenant'
    );
    
    return this.extractApiData(result as ServiceResult<ApiResponse<Tenant>>);
  }

  async suspendTenant(id: string, reason?: string): Promise<ServiceResult<Tenant>> {
    const result = await this.executeOperation(
      () => tenantApiService.updateTenant(id, { 
        status: 'suspended',
        suspended_at: new Date().toISOString(),
        metadata: { suspension_reason: reason }
      }),
      'suspendTenant'
    );
    
    return this.extractApiData(result as ServiceResult<ApiResponse<Tenant>>);
  }

  async reactivateTenant(id: string): Promise<ServiceResult<Tenant>> {
    const result = await this.executeOperation(
      () => tenantApiService.updateTenant(id, { 
        status: 'active',
        reactivated_at: new Date().toISOString(),
        suspended_at: undefined
      }),
      'reactivateTenant'
    );
    
    return this.extractApiData(result as ServiceResult<ApiResponse<Tenant>>);
  }

  async deleteTenant(id: string): Promise<ServiceResult<boolean>> {
    const result = await this.executeOperation(
      () => tenantApiService.deleteTenant(id),
      'deleteTenant'
    );
    
    return this.extractApiData(result as ServiceResult<ApiResponse<boolean>>);
  }
}

export const tenantManagementService = TenantManagementService.getInstance();


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
    const result = await this.executeOperation(
      () => tenantApiService.getTenants(filters),
      'getTenants'
    );
    
    // Extract data from ApiResponse if needed
    if (result.success && result.data && typeof result.data === 'object' && 'data' in result.data) {
      return { 
        success: true, 
        data: (result.data as any).data as Tenant[]
      };
    }
    
    return result as ServiceResult<Tenant[]>;
  }

  async getTenantById(id: string): Promise<ServiceResult<Tenant>> {
    const result = await this.executeOperation(
      () => tenantApiService.getTenant(id),
      'getTenantById'
    );
    
    // Extract data from ApiResponse if needed
    if (result.success && result.data && typeof result.data === 'object' && 'data' in result.data) {
      return { 
        success: true, 
        data: (result.data as any).data as Tenant
      };
    }
    
    return result as ServiceResult<Tenant>;
  }

  async createTenant(data: CreateTenantDTO): Promise<ServiceResult<Tenant>> {
    const result = await this.executeOperation(
      () => tenantApiService.createTenant(data),
      'createTenant'
    );
    
    // Extract data from ApiResponse if needed
    if (result.success && result.data && typeof result.data === 'object' && 'data' in result.data) {
      return { 
        success: true, 
        data: (result.data as any).data as Tenant
      };
    }
    
    return result as ServiceResult<Tenant>;
  }

  async updateTenant(id: string, data: UpdateTenantDTO): Promise<ServiceResult<Tenant>> {
    const result = await this.executeOperation(
      () => tenantApiService.updateTenant(id, data),
      'updateTenant'
    );
    
    // Extract data from ApiResponse if needed
    if (result.success && result.data && typeof result.data === 'object' && 'data' in result.data) {
      return { 
        success: true, 
        data: (result.data as any).data as Tenant
      };
    }
    
    return result as ServiceResult<Tenant>;
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
    
    // Extract data from ApiResponse if needed
    if (result.success && result.data && typeof result.data === 'object' && 'data' in result.data) {
      return { 
        success: true, 
        data: (result.data as any).data as Tenant
      };
    }
    
    return result as ServiceResult<Tenant>;
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
    
    // Extract data from ApiResponse if needed
    if (result.success && result.data && typeof result.data === 'object' && 'data' in result.data) {
      return { 
        success: true, 
        data: (result.data as any).data as Tenant
      };
    }
    
    return result as ServiceResult<Tenant>;
  }

  async deleteTenant(id: string): Promise<ServiceResult<boolean>> {
    const result = await this.executeOperation(
      () => tenantApiService.deleteTenant(id),
      'deleteTenant'
    );
    
    // Extract data from ApiResponse if needed
    if (result.success && result.data && typeof result.data === 'object' && 'data' in result.data) {
      return { 
        success: true, 
        data: (result.data as any).data as boolean
      };
    }
    
    return result as ServiceResult<boolean>;
  }
}

export const tenantManagementService = TenantManagementService.getInstance();

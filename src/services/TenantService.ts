
import { supabase } from '@/integrations/supabase/client';
import { BaseService, ServiceResult } from './BaseService';
import { CreateTenantDTO, UpdateTenantDTO, Tenant, TenantFilters } from '@/types/tenant';
import { TenantRepository } from '@/data/repositories/TenantRepository';

export class TenantService extends BaseService {
  private static instance: TenantService;
  private tenantRepository: TenantRepository;

  private constructor() {
    super();
    this.tenantRepository = new TenantRepository();
  }

  public static getInstance(): TenantService {
    if (!TenantService.instance) {
      TenantService.instance = new TenantService();
    }
    return TenantService.instance;
  }

  async getTenants(filters?: TenantFilters): Promise<ServiceResult<Tenant[]>> {
    return this.executeOperation(
      async () => this.tenantRepository.getTenants(filters),
      'getTenants'
    );
  }

  async getTenant(id: string): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      async () => this.tenantRepository.getTenant(id),
      'getTenant'
    );
  }

  async createTenant(data: CreateTenantDTO): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      async () => this.tenantRepository.createTenant(data),
      'createTenant'
    );
  }

  async updateTenant(id: string, data: UpdateTenantDTO): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      async () => this.tenantRepository.updateTenant(id, data),
      'updateTenant'
    );
  }

  async deleteTenant(id: string): Promise<ServiceResult<boolean>> {
    return this.executeOperation(
      async () => this.tenantRepository.deleteTenant(id),
      'deleteTenant'
    );
  }

  async suspendTenant(id: string, reason?: string): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      async () => {
        const updateData: UpdateTenantDTO = {
          status: 'suspended',
          suspended_at: new Date().toISOString(),
          metadata: { suspension_reason: reason }
        };
        return this.tenantRepository.updateTenant(id, updateData);
      },
      'suspendTenant'
    );
  }

  async reactivateTenant(id: string): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      async () => {
        const updateData: UpdateTenantDTO = {
          status: 'active',
          reactivated_at: new Date().toISOString(),
          suspended_at: undefined
        };
        return this.tenantRepository.updateTenant(id, updateData);
      },
      'reactivateTenant'
    );
  }

  // Utility methods for UI components
  getStatusBadgeVariant(status: string) {
    switch (status) {
      case 'active':
        return 'default';
      case 'suspended':
        return 'destructive';
      case 'trial':
        return 'secondary';
      case 'archived':
        return 'outline';
      default:
        return 'outline';
    }
  }

  getPlanBadgeVariant(plan: string) {
    switch (plan) {
      case 'enterprise':
        return 'default';
      case 'professional':
        return 'secondary';
      case 'basic':
        return 'outline';
      default:
        return 'outline';
    }
  }

  getPlanDisplayName(plan: string) {
    switch (plan) {
      case 'basic':
        return 'Basic';
      case 'professional':
        return 'Professional';
      case 'enterprise':
        return 'Enterprise';
      default:
        return 'Unknown';
    }
  }
}

export const tenantService = TenantService.getInstance();


import { tenantRepository } from '@/data/repositories/TenantRepository';
import { BaseService, ServiceResult } from '@/services/BaseService';
import { CreateTenantDTO, UpdateTenantDTO, Tenant, TenantFilters, convertDatabaseTenant, TenantStatus, SubscriptionPlan } from '@/types/tenant';

export class TenantService extends BaseService {
  private static instance: TenantService;

  private constructor() {
    super();
  }

  public static getInstance(): TenantService {
    if (!TenantService.instance) {
      TenantService.instance = new TenantService();
    }
    return TenantService.instance;
  }

  async getTenants(filters?: TenantFilters): Promise<ServiceResult<Tenant[]>> {
    return this.executeOperation(
      async () => {
        const rawData = await tenantRepository.getTenants(filters);
        return rawData.map(convertDatabaseTenant);
      },
      'getTenants'
    );
  }

  async getTenant(id: string): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      async () => {
        const rawData = await tenantRepository.getTenant(id);
        return convertDatabaseTenant(rawData);
      },
      'getTenant'
    );
  }

  async createTenant(data: CreateTenantDTO): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      async () => {
        const rawData = await tenantRepository.createTenant(data);
        return convertDatabaseTenant(rawData);
      },
      'createTenant'
    );
  }

  async updateTenant(id: string, data: UpdateTenantDTO): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      async () => {
        const rawData = await tenantRepository.updateTenant(id, data);
        return convertDatabaseTenant(rawData);
      },
      'updateTenant'
    );
  }

  async deleteTenant(id: string): Promise<ServiceResult<boolean>> {
    return this.executeOperation(
      async () => tenantRepository.deleteTenant(id),
      'deleteTenant'
    );
  }

  // Utility methods for UI components
  getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status) {
      case TenantStatus.ACTIVE:
        return 'default';
      case TenantStatus.TRIAL:
        return 'secondary';
      case TenantStatus.SUSPENDED:
      case TenantStatus.EXPIRED:
        return 'destructive';
      case TenantStatus.PENDING_APPROVAL:
        return 'outline';
      default:
        return 'outline';
    }
  }

  getPlanBadgeVariant(plan: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (plan) {
      case SubscriptionPlan.AI_ENTERPRISE:
      case SubscriptionPlan.CUSTOM_ENTERPRISE:
        return 'default';
      case SubscriptionPlan.SHAKTI_GROWTH:
        return 'secondary';
      case SubscriptionPlan.KISAN_BASIC:
        return 'outline';
      default:
        return 'outline';
    }
  }

  getPlanDisplayName(plan: string): string {
    switch (plan) {
      case SubscriptionPlan.KISAN_BASIC:
        return 'Kisan Basic';
      case SubscriptionPlan.SHAKTI_GROWTH:
        return 'Shakti Growth';
      case SubscriptionPlan.AI_ENTERPRISE:
        return 'AI Enterprise';
      case SubscriptionPlan.CUSTOM_ENTERPRISE:
        return 'Custom Enterprise';
      default:
        return plan;
    }
  }
}

export const tenantService = TenantService.getInstance();


import { enhancedApiFactory } from './EnhancedApiFactory';
import { Tenant, TenantFilters, CreateTenantDTO, UpdateTenantDTO } from '@/types/tenant';

class TenantApiService {
  private static instance: TenantApiService;

  private constructor() {}

  public static getInstance(): TenantApiService {
    if (!TenantApiService.instance) {
      TenantApiService.instance = new TenantApiService();
    }
    return TenantApiService.instance;
  }

  async getTenants(filters?: TenantFilters) {
    const params: Record<string, string> = {};
    
    if (filters?.search) {
      params.search = filters.search;
    }
    
    // Handle type filter - check if it's not 'all' or has length > 0
    if (filters?.type && filters.type !== 'all' && filters.type.length > 0) {
      params.type = filters.type;
    }
    
    // Handle status filter - check if it's not 'all' or has length > 0
    if (filters?.status && filters.status !== 'all' && filters.status.length > 0) {
      params.status = filters.status;
    }
    
    // Handle subscription_plan filter - check if it's not 'all' or has length > 0
    if (filters?.subscription_plan && filters.subscription_plan !== 'all' && filters.subscription_plan.length > 0) {
      params.subscription_plan = filters.subscription_plan;
    }

    return enhancedApiFactory.get<Tenant[]>('tenants', undefined, { params });
  }

  async getTenant(id: string) {
    return enhancedApiFactory.get<Tenant>(`tenants/${id}`);
  }

  async createTenant(data: CreateTenantDTO) {
    return enhancedApiFactory.post<Tenant>('tenants', data);
  }

  async updateTenant(id: string, data: UpdateTenantDTO) {
    return enhancedApiFactory.put<Tenant>(`tenants/${id}`, data, undefined);
  }

  async deleteTenant(id: string) {
    return enhancedApiFactory.delete<boolean>(`tenants/${id}`, undefined);
  }
}

export const tenantApiService = TenantApiService.getInstance();

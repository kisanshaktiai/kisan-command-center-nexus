
import { enhancedApiFactory } from './EnhancedApiFactory';
import { Tenant, TenantFilters, CreateTenantDTO, UpdateTenantDTO } from '@/types/tenant';
import { TenantType, TenantStatus, SubscriptionPlan } from '@/types/enums';
import { convertEnumToString } from '@/types/tenant';

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
    
    if (filters?.type && filters.type !== 'all') {
      params.type = convertEnumToString(filters.type);
    }
    
    if (filters?.status && filters.status !== 'all') {
      params.status = convertEnumToString(filters.status);
    }
    
    if (filters?.subscription_plan && filters.subscription_plan !== 'all') {
      params.subscription_plan = convertEnumToString(filters.subscription_plan);
    }

    return enhancedApiFactory.get<Tenant[]>('tenants', params);
  }

  async getTenant(id: string) {
    return enhancedApiFactory.get<Tenant>(`tenants/${id}`);
  }

  async createTenant(data: CreateTenantDTO) {
    return enhancedApiFactory.post<Tenant>('tenants', data);
  }

  async updateTenant(id: string, data: UpdateTenantDTO) {
    return enhancedApiFactory.put<Tenant>(`tenants/${id}`, data);
  }

  async deleteTenant(id: string) {
    return enhancedApiFactory.delete<boolean>(`tenants/${id}`);
  }
}

export const tenantApiService = TenantApiService.getInstance();


import { enhancedApiFactory } from './EnhancedApiFactory';
import { CreateTenantDTO, UpdateTenantDTO, Tenant } from '@/types/tenant';

export class TenantApiService {
  private static instance: TenantApiService;

  private constructor() {}

  public static getInstance(): TenantApiService {
    if (!TenantApiService.instance) {
      TenantApiService.instance = new TenantApiService();
    }
    return TenantApiService.instance;
  }

  async getTenants(filters?: Record<string, any>) {
    console.log('TenantApiService: Getting tenants with filters:', filters);
    
    try {
      const result = await enhancedApiFactory.get<Tenant[]>('tenants', undefined, filters);
      console.log('TenantApiService: Successfully fetched tenants:', result);
      return result;
    } catch (error) {
      console.error('TenantApiService: Error fetching tenants:', error);
      throw error;
    }
  }

  async getTenant(id: string) {
    console.log('TenantApiService: Getting tenant with ID:', id);
    
    try {
      const result = await enhancedApiFactory.get<Tenant>(`tenants/${id}`, undefined);
      console.log('TenantApiService: Successfully fetched tenant:', result);
      return result;
    } catch (error) {
      console.error('TenantApiService: Error fetching tenant:', error);
      throw error;
    }
  }

  async createTenant(data: CreateTenantDTO) {
    console.log('TenantApiService: Creating tenant with data:', data);
    
    try {
      const result = await enhancedApiFactory.post<Tenant>('tenants', undefined, data);
      console.log('TenantApiService: Successfully created tenant:', result);
      return result;
    } catch (error) {
      console.error('TenantApiService: Error creating tenant:', error);
      throw error;
    }
  }

  async updateTenant(id: string, data: UpdateTenantDTO) {
    console.log('TenantApiService: Updating tenant with ID:', id, 'Data:', data);
    
    try {
      const result = await enhancedApiFactory.put<Tenant>(`tenants/${id}`, undefined, data);
      console.log('TenantApiService: Successfully updated tenant:', result);
      return result;
    } catch (error) {
      console.error('TenantApiService: Error updating tenant:', error);
      throw error;
    }
  }

  async deleteTenant(id: string) {
    console.log('TenantApiService: Deleting tenant with ID:', id);
    
    try {
      const result = await enhancedApiFactory.delete<boolean>(`tenants/${id}`, undefined);
      console.log('TenantApiService: Successfully deleted tenant:', result);
      return result;
    } catch (error) {
      console.error('TenantApiService: Error deleting tenant:', error);
      throw error;
    }
  }
}

export const tenantApiService = TenantApiService.getInstance();

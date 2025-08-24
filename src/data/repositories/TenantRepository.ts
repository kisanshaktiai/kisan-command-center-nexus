
import { BaseTenantRepository } from './BaseTenantRepository';
import { ServiceResult } from '@/services/BaseService';
import { CreateTenantDTO, UpdateTenantDTO } from '@/types/tenant';

export class TenantRepository extends BaseTenantRepository {
  private static instance: TenantRepository;

  private constructor() {
    super('tenants');
  }

  public static getInstance(): TenantRepository {
    if (!TenantRepository.instance) {
      TenantRepository.instance = new TenantRepository();
    }
    return TenantRepository.instance;
  }

  async getTenants(filters?: any): Promise<ServiceResult<any[]>> {
    return this.executeQuery(() => 
      this.buildSelectQuery(`
        *,
        tenant_subscriptions (
          id,
          subscription_plan,
          status,
          current_period_start,
          current_period_end
        ),
        tenant_features (*)
      `).order('created_at', { ascending: false })
    );
  }

  async getTenant(id: string): Promise<ServiceResult<any>> {
    return this.executeQuery(() => 
      this.buildSelectQuery(`
        *,
        tenant_subscriptions (*),
        tenant_features (*),
        tenant_branding (*)
      `).eq('id', id).single()
    );
  }

  async createTenant(tenantData: CreateTenantDTO): Promise<ServiceResult<any>> {
    return this.executeQuery(() => 
      this.buildInsertQuery(tenantData).single()
    );
  }

  async updateTenant(id: string, tenantData: UpdateTenantDTO): Promise<ServiceResult<any>> {
    return this.executeQuery(() => 
      this.buildUpdateQuery(id, tenantData).single()
    );
  }

  async deleteTenant(id: string): Promise<ServiceResult<boolean>> {
    return this.executeOperation(async () => {
      const { error } = await this.buildDeleteQuery(id);
      if (error) throw error;
      return true;
    }, 'deleteTenant');
  }
}

export const tenantRepository = TenantRepository.getInstance();

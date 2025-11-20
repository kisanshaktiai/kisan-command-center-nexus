import { BaseTenantRepository } from './BaseTenantRepository';
import { ServiceResult } from '@/services/BaseService';
import { CreateTenantDTO, UpdateTenantDTO } from '@/types/tenant';
import { supabase } from '@/integrations/supabase/client';
import { whiteLabelSyncService } from '@/services/WhiteLabelSyncService';

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
    return this.executeOperation(async () => {
      // Get current authenticated user - this is required
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Authentication required to create tenant');
      }
      
      // Prepare tenant data with authenticated user's ID
      const finalTenantData = { 
        ...tenantData, 
        created_by: user.id 
      };
      
      const { data, error } = await this.buildInsertQuery(finalTenantData).single();
      if (error) throw error;
      if (!data) throw new Error('No data returned from tenant creation');

      // Type assertion after validation
      const createdTenant = data as any;

      // Create white_label_config (source of truth for branding)
      const brandingData = {
        subdomain: tenantData.subdomain,
        custom_domain: tenantData.custom_domain,
        company_name: tenantData.name,
        ...(tenantData.metadata as any)?.branding
      };

      await whiteLabelSyncService.createWhiteLabelConfig(createdTenant.id, brandingData);
      
      return createdTenant;
    }, 'createTenant');
  }

  async updateTenant(id: string, tenantData: UpdateTenantDTO): Promise<ServiceResult<any>> {
    return this.executeOperation(async () => {
      // Get current authenticated user for audit trail
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      // Prepare update data with audit information
      const finalUpdateData = { 
        ...tenantData,
        updated_at: new Date().toISOString()
      };
      
      // Add updated_by if we have an authenticated user
      if (!userError && user) {
        finalUpdateData.metadata = {
          ...finalUpdateData.metadata,
          updated_by: user.id,
          last_updated: new Date().toISOString()
        };
      }
      
      const { data, error } = await this.buildUpdateQuery(id, finalUpdateData).single();
      if (error) throw error;

      // Sync changes to white_label_configs (source of truth)
      await whiteLabelSyncService.syncFromTenant(id, finalUpdateData);
      
      return data;
    }, 'updateTenant');
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

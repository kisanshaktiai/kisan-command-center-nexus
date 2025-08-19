
import { 
  Tenant, 
  TenantBranding, 
  TenantFeatures,
  TenantID,
  createTenantID
} from '@/types/tenant';
import { TenantType, TenantStatus, SubscriptionPlan } from '@/types/enums';
import { supabase } from '@/integrations/supabase/client';

export interface TenantContext {
  tenantId: TenantID | null;
  tenant: Tenant | null;
  branding: TenantBranding | null;
  features: TenantFeatures | null;
  isLoading: boolean;
  error: string | null;
}

class TenantContextService {
  private currentContext: TenantContext = {
    tenantId: null,
    tenant: null,
    branding: null,
    features: null,
    isLoading: false,
    error: null,
  };

  private subscribers: Set<(context: TenantContext) => void> = new Set();
  private tenantCache = new Map<string, Tenant>();

  getCurrentContext(): TenantContext {
    return this.currentContext;
  }

  subscribe(callback: (context: TenantContext) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback(this.currentContext));
  }

  private updateContext(updates: Partial<TenantContext>) {
    this.currentContext = { ...this.currentContext, ...updates };
    this.notifySubscribers();
  }

  async setTenantById(tenantId: string | null): Promise<boolean> {
    if (!tenantId) {
      this.clearContext();
      return true;
    }

    const brandedTenantId = createTenantID(tenantId);
    
    // Check cache first
    if (this.tenantCache.has(tenantId)) {
      const cachedTenant = this.tenantCache.get(tenantId)!;
      this.updateContext({
        tenantId: brandedTenantId,
        tenant: cachedTenant,
        isLoading: false,
        error: null,
      });
      return true;
    }

    this.updateContext({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          *,
          tenant_branding (*),
          tenant_features (*)
        `)
        .eq('id', tenantId)
        .single();

      if (error) throw error;

      // Safely parse business_address
      let businessAddress: Record<string, any> = {};
      if (data.business_address) {
        if (typeof data.business_address === 'string') {
          try {
            businessAddress = JSON.parse(data.business_address);
          } catch {
            businessAddress = {};
          }
        } else if (typeof data.business_address === 'object') {
          businessAddress = data.business_address as Record<string, any>;
        }
      }

      const tenant: Tenant = {
        ...data,
        id: createTenantID(data.id),
        type: data.type as TenantType,
        status: data.status as TenantStatus,
        subscription_plan: data.subscription_plan as SubscriptionPlan,
        business_address: businessAddress,
        metadata: (data.metadata as Record<string, any>) || {},
        branding: data.tenant_branding?.[0] || null,
        features: data.tenant_features?.[0] || null,
      };

      // Cache the tenant
      this.tenantCache.set(tenantId, tenant);

      this.updateContext({
        tenantId: brandedTenantId,
        tenant,
        branding: tenant.branding,
        features: tenant.features,
        isLoading: false,
        error: null,
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load tenant';
      this.updateContext({
        isLoading: false,
        error: errorMessage,
      });
      return false;
    }
  }

  clearContext() {
    this.updateContext({
      tenantId: null,
      tenant: null,
      branding: null,
      features: null,
      isLoading: false,
      error: null,
    });
  }

  invalidateCache(tenantId: string) {
    this.tenantCache.delete(tenantId);
  }
}

export const tenantContextService = new TenantContextService();

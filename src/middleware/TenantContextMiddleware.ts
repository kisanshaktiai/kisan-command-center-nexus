import { supabase } from '@/integrations/supabase/client';
import { Tenant } from '@/types/tenant';
import { TenantType, TenantStatus, SubscriptionPlan } from '@/types/enums';

export interface TenantContext {
  tenantId: string | null;
  tenant: Tenant | null;
  isLoading: boolean;
  error: string | null;
}

export class TenantContextService {
  private static instance: TenantContextService;
  private context: TenantContext = {
    tenantId: null,
    tenant: null,
    isLoading: false,
    error: null
  };
  private cache = new Map<string, { tenant: Tenant; timestamp: number }>();
  private subscribers = new Set<(context: TenantContext) => void>();

  public static getInstance(): TenantContextService {
    if (!TenantContextService.instance) {
      TenantContextService.instance = new TenantContextService();
    }
    return TenantContextService.instance;
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback(this.context));
  }

  public subscribe(callback: (context: TenantContext) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  public getCurrentContext(): TenantContext {
    return this.context;
  }

  public async setTenantById(tenantId: string | null): Promise<void> {
    if (!tenantId) {
      this.context = {
        tenantId: null,
        tenant: null,
        isLoading: false,
        error: null
      };
      this.notifySubscribers();
      return;
    }

    // Check cache first
    const cached = this.cache.get(tenantId);
    const cacheExpiry = 5 * 60 * 1000; // 5 minutes
    if (cached && Date.now() - cached.timestamp < cacheExpiry) {
      this.context = {
        tenantId,
        tenant: cached.tenant,
        isLoading: false,
        error: null
      };
      this.notifySubscribers();
      return;
    }

    this.context = { ...this.context, isLoading: true, error: null };
    this.notifySubscribers();

    try {
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (error) throw error;

      // Transform database tenant to typed Tenant
      const typedTenant: Tenant = {
        ...tenant,
        type: tenant.type as TenantType,
        status: tenant.status as TenantStatus,
        subscription_plan: tenant.subscription_plan as SubscriptionPlan,
        metadata: (tenant.metadata as Record<string, any>) || {}
      };

      // Update cache
      this.cache.set(tenantId, { tenant: typedTenant, timestamp: Date.now() });

      this.context = {
        tenantId,
        tenant: typedTenant,
        isLoading: false,
        error: null
      };
    } catch (error) {
      console.error('Error fetching tenant:', error);
      this.context = {
        tenantId,
        tenant: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch tenant'
      };
    }

    this.notifySubscribers();
  }

  public clearContext(): void {
    this.context = {
      tenantId: null,
      tenant: null,
      isLoading: false,
      error: null
    };
    this.notifySubscribers();
  }

  public invalidateCache(tenantId?: string): void {
    if (tenantId) {
      this.cache.delete(tenantId);
    } else {
      this.cache.clear();
    }
  }
}

export const tenantContextService = TenantContextService.getInstance();


import { supabase } from '@/integrations/supabase/client';
import { Tenant } from '@/types/tenant';
import { toast } from 'sonner';

export interface TenantContext {
  tenant: Tenant | null;
  tenantId: string | null;
  isLoading: boolean;
  error: string | null;
}

class TenantContextService {
  private static instance: TenantContextService;
  private currentContext: TenantContext = {
    tenant: null,
    tenantId: null,
    isLoading: false,
    error: null
  };
  
  private listeners: Set<(context: TenantContext) => void> = new Set();
  private cache: Map<string, { tenant: Tenant; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  public static getInstance(): TenantContextService {
    if (!TenantContextService.instance) {
      TenantContextService.instance = new TenantContextService();
    }
    return TenantContextService.instance;
  }

  public subscribe(listener: (context: TenantContext) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentContext));
  }

  public getCurrentContext(): TenantContext {
    return { ...this.currentContext };
  }

  public async setTenantById(tenantId: string | null): Promise<void> {
    if (!tenantId) {
      this.currentContext = {
        tenant: null,
        tenantId: null,
        isLoading: false,
        error: null
      };
      this.notifyListeners();
      return;
    }

    this.currentContext.isLoading = true;
    this.currentContext.error = null;
    this.notifyListeners();

    try {
      // Check cache first
      const cached = this.cache.get(tenantId);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        this.currentContext = {
          tenant: cached.tenant,
          tenantId,
          isLoading: false,
          error: null
        };
        this.notifyListeners();
        return;
      }

      // Fetch from database
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          *,
          tenant_branding (*),
          tenant_features (*)
        `)
        .eq('id', tenantId)
        .single();

      if (error) {
        throw error;
      }

      const tenant: Tenant = {
        ...data,
        branding: data.tenant_branding?.[0] || null,
        features: data.tenant_features?.[0] || null
      };

      // Update cache
      this.cache.set(tenantId, { tenant, timestamp: Date.now() });

      this.currentContext = {
        tenant,
        tenantId,
        isLoading: false,
        error: null
      };
    } catch (error) {
      console.error('Error loading tenant context:', error);
      this.currentContext = {
        tenant: null,
        tenantId,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load tenant'
      };
      toast.error('Failed to load tenant context');
    }

    this.notifyListeners();
  }

  public clearContext(): void {
    this.currentContext = {
      tenant: null,
      tenantId: null,
      isLoading: false,
      error: null
    };
    this.notifyListeners();
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

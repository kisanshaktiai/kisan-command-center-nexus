
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TenantFeatures {
  ai_chat: boolean;
  weather_forecast: boolean;
  marketplace: boolean;
  community_forum: boolean;
  satellite_imagery: boolean;
  soil_testing: boolean;
  drone_monitoring: boolean;
  iot_integration: boolean;
  ecommerce: boolean;
  payment_gateway: boolean;
  inventory_management: boolean;
  logistics_tracking: boolean;
  basic_analytics: boolean;
  advanced_analytics: boolean;
  predictive_analytics: boolean;
  custom_reports: boolean;
  api_access: boolean;
  webhook_support: boolean;
  third_party_integrations: boolean;
  white_label_mobile_app: boolean;
}

export interface TenantLimits {
  farmers: number;
  dealers: number;
  products: number;
  storage_gb: number;
  api_calls_per_day: number;
}

export interface TenantBranding {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  app_name: string;
  logo_url?: string;
}

export interface EnhancedTenant {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  subscription_plan: string;
  features: TenantFeatures;
  limits: TenantLimits;
  branding: TenantBranding;
  created_at: string;
  updated_at: string;
}

interface EnhancedTenantContextValue {
  currentTenant: EnhancedTenant | null;
  availableTenants: EnhancedTenant[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  switchTenant: (tenantId: string) => Promise<void>;
  refreshTenant: () => Promise<void>;
  isFeatureEnabled: (feature: keyof TenantFeatures) => boolean;
  checkLimit: (limitType: keyof TenantLimits, currentUsage: number) => { withinLimit: boolean; percentage: number };
  
  // Branding
  applyTenantBranding: () => void;
  resetBranding: () => void;
}

const EnhancedTenantContext = createContext<EnhancedTenantContextValue | undefined>(undefined);

export const EnhancedTenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const [currentTenant, setCurrentTenant] = useState<EnhancedTenant | null>(null);
  const [availableTenants, setAvailableTenants] = useState<EnhancedTenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cache for tenant data
  const tenantCache = new Map<string, { tenant: EnhancedTenant; timestamp: number }>();
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  const fetchTenantDetails = useCallback(async (tenantId: string): Promise<EnhancedTenant | null> => {
    try {
      // Check cache first
      const cached = tenantCache.get(tenantId);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.tenant;
      }

      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select(`
          *,
          tenant_features (*),
          tenant_branding (*)
        `)
        .eq('id', tenantId)
        .single();

      if (tenantError) throw tenantError;

      const enhancedTenant: EnhancedTenant = {
        id: tenantData.id,
        name: tenantData.name,
        slug: tenantData.slug,
        type: tenantData.type,
        status: tenantData.status,
        subscription_plan: tenantData.subscription_plan,
        created_at: tenantData.created_at,
        updated_at: tenantData.updated_at,
        features: {
          ai_chat: tenantData.tenant_features?.[0]?.ai_chat || false,
          weather_forecast: tenantData.tenant_features?.[0]?.weather_forecast || false,
          marketplace: tenantData.tenant_features?.[0]?.marketplace || false,
          community_forum: tenantData.tenant_features?.[0]?.community_forum || false,
          satellite_imagery: tenantData.tenant_features?.[0]?.satellite_imagery || false,
          soil_testing: tenantData.tenant_features?.[0]?.soil_testing || false,
          drone_monitoring: tenantData.tenant_features?.[0]?.drone_monitoring || false,
          iot_integration: tenantData.tenant_features?.[0]?.iot_integration || false,
          ecommerce: tenantData.tenant_features?.[0]?.ecommerce || false,
          payment_gateway: tenantData.tenant_features?.[0]?.payment_gateway || false,
          inventory_management: tenantData.tenant_features?.[0]?.inventory_management || false,
          logistics_tracking: tenantData.tenant_features?.[0]?.logistics_tracking || false,
          basic_analytics: tenantData.tenant_features?.[0]?.basic_analytics || false,
          advanced_analytics: tenantData.tenant_features?.[0]?.advanced_analytics || false,
          predictive_analytics: tenantData.tenant_features?.[0]?.predictive_analytics || false,
          custom_reports: tenantData.tenant_features?.[0]?.custom_reports || false,
          api_access: tenantData.tenant_features?.[0]?.api_access || false,
          webhook_support: tenantData.tenant_features?.[0]?.webhook_support || false,
          third_party_integrations: tenantData.tenant_features?.[0]?.third_party_integrations || false,
          white_label_mobile_app: tenantData.tenant_features?.[0]?.white_label_mobile_app || false,
        },
        limits: {
          farmers: tenantData.max_farmers || 1000,
          dealers: tenantData.max_dealers || 50,
          products: tenantData.max_products || 100,
          storage_gb: tenantData.max_storage_gb || 10,
          api_calls_per_day: tenantData.max_api_calls_per_day || 10000,
        },
        branding: {
          primary_color: tenantData.tenant_branding?.[0]?.primary_color || '#10B981',
          secondary_color: tenantData.tenant_branding?.[0]?.secondary_color || '#065F46',
          accent_color: tenantData.tenant_branding?.[0]?.accent_color || '#F59E0B',
          app_name: tenantData.tenant_branding?.[0]?.app_name || tenantData.name,
          logo_url: tenantData.tenant_branding?.[0]?.logo_url,
        },
      };

      // Cache the result
      tenantCache.set(tenantId, { tenant: enhancedTenant, timestamp: Date.now() });
      return enhancedTenant;
    } catch (error) {
      console.error('Error fetching tenant details:', error);
      return null;
    }
  }, []);

  const loadAvailableTenants = useCallback(async () => {
    if (!user) return;

    try {
      setError(null);
      
      let query = supabase.from('tenants').select('id, name, slug, status');
      
      if (isSuperAdmin) {
        // Super admins can see all tenants
      } else if (isAdmin) {
        // Regular admins can see tenants they have access to
        query = query.in('id', 
          supabase
            .from('user_tenants')
            .select('tenant_id')
            .eq('user_id', user.id)
            .eq('is_active', true)
        );
      } else {
        // Regular users see their assigned tenants
        query = query.in('id',
          supabase
            .from('user_tenants')
            .select('tenant_id')
            .eq('user_id', user.id)
            .eq('is_active', true)
        );
      }

      const { data: tenantsData, error: tenantsError } = await query.order('name');
      if (tenantsError) throw tenantsError;

      // Load full details for each tenant
      const tenantPromises = tenantsData?.map(t => fetchTenantDetails(t.id)) || [];
      const tenantDetails = await Promise.all(tenantPromises);
      const validTenants = tenantDetails.filter(Boolean) as EnhancedTenant[];
      
      setAvailableTenants(validTenants);
      
      // Set current tenant if not set
      if (!currentTenant && validTenants.length > 0) {
        const defaultTenant = validTenants[0];
        setCurrentTenant(defaultTenant);
        localStorage.setItem('currentTenantId', defaultTenant.id);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load tenants');
      console.error('Error loading available tenants:', error);
    }
  }, [user, isAdmin, isSuperAdmin, fetchTenantDetails, currentTenant]);

  const switchTenant = useCallback(async (tenantId: string) => {
    try {
      setIsLoading(true);
      const tenant = await fetchTenantDetails(tenantId);
      if (tenant) {
        setCurrentTenant(tenant);
        localStorage.setItem('currentTenantId', tenantId);
        toast.success(`Switched to ${tenant.name}`);
      } else {
        toast.error('Failed to switch tenant');
      }
    } catch (error) {
      console.error('Error switching tenant:', error);
      toast.error('Failed to switch tenant');
    } finally {
      setIsLoading(false);
    }
  }, [fetchTenantDetails]);

  const refreshTenant = useCallback(async () => {
    if (!currentTenant) return;
    
    try {
      // Clear cache for current tenant
      tenantCache.delete(currentTenant.id);
      const refreshedTenant = await fetchTenantDetails(currentTenant.id);
      if (refreshedTenant) {
        setCurrentTenant(refreshedTenant);
      }
    } catch (error) {
      console.error('Error refreshing tenant:', error);
      toast.error('Failed to refresh tenant data');
    }
  }, [currentTenant, fetchTenantDetails]);

  const isFeatureEnabled = useCallback((feature: keyof TenantFeatures): boolean => {
    return currentTenant?.features[feature] || false;
  }, [currentTenant]);

  const checkLimit = useCallback((limitType: keyof TenantLimits, currentUsage: number) => {
    const limit = currentTenant?.limits[limitType] || 0;
    const withinLimit = currentUsage < limit;
    const percentage = limit > 0 ? (currentUsage / limit) * 100 : 0;
    
    return { withinLimit, percentage: Math.round(percentage) };
  }, [currentTenant]);

  const applyTenantBranding = useCallback(() => {
    if (!currentTenant) return;
    
    const root = document.documentElement;
    const { branding } = currentTenant;
    
    root.style.setProperty('--tenant-primary', branding.primary_color);
    root.style.setProperty('--tenant-secondary', branding.secondary_color);
    root.style.setProperty('--tenant-accent', branding.accent_color);
    
    if (branding.app_name) {
      document.title = branding.app_name;
    }
  }, [currentTenant]);

  const resetBranding = useCallback(() => {
    const root = document.documentElement;
    root.style.removeProperty('--tenant-primary');
    root.style.removeProperty('--tenant-secondary');
    root.style.removeProperty('--tenant-accent');
    document.title = 'Kisan Platform';
  }, []);

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      
      // Try to restore from localStorage
      const savedTenantId = localStorage.getItem('currentTenantId');
      if (savedTenantId) {
        const tenant = await fetchTenantDetails(savedTenantId);
        if (tenant) {
          setCurrentTenant(tenant);
        }
      }
      
      await loadAvailableTenants();
      setIsLoading(false);
    };

    if (user) {
      initialize();
    } else {
      setCurrentTenant(null);
      setAvailableTenants([]);
      setIsLoading(false);
    }
  }, [user, loadAvailableTenants, fetchTenantDetails]);

  // Apply branding when tenant changes
  useEffect(() => {
    if (currentTenant) {
      applyTenantBranding();
    } else {
      resetBranding();
    }
  }, [currentTenant, applyTenantBranding, resetBranding]);

  const contextValue: EnhancedTenantContextValue = {
    currentTenant,
    availableTenants,
    isLoading,
    error,
    switchTenant,
    refreshTenant,
    isFeatureEnabled,
    checkLimit,
    applyTenantBranding,
    resetBranding,
  };

  return (
    <EnhancedTenantContext.Provider value={contextValue}>
      {children}
    </EnhancedTenantContext.Provider>
  );
};

export const useEnhancedTenant = () => {
  const context = useContext(EnhancedTenantContext);
  if (context === undefined) {
    throw new Error('useEnhancedTenant must be used within an EnhancedTenantProvider');
  }
  return context;
};

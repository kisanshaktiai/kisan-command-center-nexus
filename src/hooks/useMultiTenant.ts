import { useState, useEffect, useContext, createContext, ReactNode, useCallback } from 'react';
import { MultiTenantService } from '@/services/multiTenantService';
import { supabase } from '@/integrations/supabase/client';

interface TenantContext {
  // Core Identity
  tenant_id: string;
  tenant_slug: string;
  tenant_type: 'default' | 'premium' | 'enterprise' | 'custom';
  status: 'trial' | 'active' | 'suspended' | 'expired';
  
  // Domain Configuration
  domains: {
    subdomain?: string;
    custom_domain?: string;
    portal_urls: {
      marketing: string;
      management: string;
      api: string;
    };
  };
  
  // Branding
  branding: {
    // Colors
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    background_color: string;
    text_color: string;
    
    // Assets
    app_name: string;
    logo_url?: string;
    favicon_url?: string;
    splash_screen_url?: string;
    
    // Content
    tagline?: string;
    description?: string;
    
    // Theme
    theme_mode: 'light' | 'dark' | 'auto';
    font_family?: string;
  };
  
  // Features with granular permissions
  features: {
    // Core Features
    ai_chat: boolean;
    weather_forecast: boolean;
    marketplace: boolean;
    community_forum: boolean;
    
    // Premium Features
    satellite_imagery: boolean;
    soil_testing: boolean;
    drone_monitoring: boolean;
    iot_integration: boolean;
    
    // Business Features
    ecommerce: boolean;
    payment_gateway: boolean;
    inventory_management: boolean;
    logistics_tracking: boolean;
    
    // Analytics Features
    basic_analytics: boolean;
    advanced_analytics: boolean;
    predictive_analytics: boolean;
    custom_reports: boolean;
    
    // Integration Features
    api_access: boolean;
    webhook_support: boolean;
    third_party_integrations: boolean;
    white_label_mobile_app: boolean;
  };
  
  // Limits with usage tracking
  limits: {
    farmers: { max: number; used: number };
    dealers: { max: number; used: number };
    products: { max: number; used: number };
    storage_gb: { max: number; used: number };
    api_calls_per_day: { max: number; used: number };
    monthly_sms: { max: number; used: number };
    concurrent_users: { max: number; used: number };
  };
  
  // Subscription Info
  subscription: {
    plan_name: string;
    billing_interval: 'monthly' | 'quarterly' | 'annually';
    current_period_end: Date;
    trial_ends_at?: Date;
    payment_status: 'paid' | 'pending' | 'overdue';
  };
  
  // Security Settings
  security: {
    allowed_origins: string[];
    ip_whitelist?: string[];
    enforce_mfa: boolean;
    session_timeout_minutes: number;
    api_rate_limit: number;
  };
  
  // Metadata
  metadata: {
    created_at: Date;
    updated_at: Date;
    last_accessed: Date;
    owner_email: string;
    support_tier: 'basic' | 'priority' | 'dedicated';
  };
}

interface MultiTenantContextType {
  // State
  tenant: TenantContext | null;
  isLoading: boolean;
  error: string | null;
  portalType: 'marketing' | 'admin' | 'partner' | 'manage' | 'tenant' | null;
  
  // Feature Checks
  isFeatureEnabled: (feature: keyof TenantContext['features']) => boolean;
  checkLimit: (limitType: keyof TenantContext['limits'], increment?: number) => Promise<boolean>;
  getLimitUsage: (limitType: keyof TenantContext['limits']) => { used: number; max: number; percentage: number };
  
  // Actions
  refreshTenant: () => Promise<void>;
  updateBranding: (branding: Partial<TenantContext['branding']>) => Promise<void>;
  trackUsage: (metric: string, value: number) => Promise<void>;
  
  // Security
  validateOrigin: (origin: string) => boolean;
  checkSubscriptionStatus: () => boolean;
  getPortalUrl: (portal: 'marketing' | 'management' | 'api') => string;
}

const MultiTenantContext = createContext<MultiTenantContextType | undefined>(undefined);

// Cache for tenant data
const tenantCache = new Map<string, { data: TenantContext; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const MultiTenantProvider = ({ children }: { children: ReactNode }) => {
  const [tenant, setTenant] = useState<TenantContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portalType, setPortalType] = useState<MultiTenantContextType['portalType']>(null);
  
  // Detect portal type from URL
  const detectPortalType = useCallback(() => {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    if (hostname.includes('admin.')) {
      return 'admin';
    } else if (hostname.includes('partner.')) {
      return 'partner';
    } else if (hostname.includes('manage.') || pathname.startsWith('/manage')) {
      return 'manage';
    } else if (hostname === 'kisans.com' || hostname === 'www.kisans.com') {
      return 'marketing';
    } else {
      return 'tenant';
    }
  }, []);
  
  // Initialize tenant with caching
  const initializeTenant = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const detectedPortalType = detectPortalType();
      setPortalType(detectedPortalType);
      
      // Skip tenant detection for marketing site
      if (detectedPortalType === 'marketing') {
        setIsLoading(false);
        return;
      }
      
      // Check cache first
      const cacheKey = window.location.hostname;
      const cached = tenantCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setTenant(cached.data);
        setIsLoading(false);
        
        // Refresh in background
        MultiTenantService.initializeTenantFromURL().then(data => {
          if (data) {
            tenantCache.set(cacheKey, { data, timestamp: Date.now() });
          }
        });
        
        return;
      }
      
      // Fetch fresh data
      const detectedTenant = await MultiTenantService.initializeTenantFromURL();
      
      if (!detectedTenant) {
        setError('No tenant configuration found');
        return;
      }
      
      // Cache the result
      tenantCache.set(cacheKey, { data: detectedTenant, timestamp: Date.now() });
      
      setTenant(detectedTenant);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize tenant');
      console.error('MultiTenant: Error initializing tenant:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initialize on mount
  useEffect(() => {
    initializeTenant();
  }, []);
  
  // Feature check with fallback
  const isFeatureEnabled = useCallback((feature: keyof TenantContext['features']): boolean => {
    if (!tenant) return false;
    
    // Check subscription status first
    if (tenant.status !== 'active' && tenant.status !== 'trial') {
      return false;
    }
    
    return tenant.features[feature] || false;
  }, [tenant]);
  
  // Limit checking with real-time validation
  const checkLimit = useCallback(async (
    limitType: keyof TenantContext['limits'], 
    increment: number = 0
  ): Promise<boolean> => {
    if (!tenant) return false;
    
    const limit = tenant.limits[limitType];
    const wouldExceed = (limit.used + increment) > limit.max;
    
    return !wouldExceed;
  }, [tenant]);
  
  // Get limit usage with percentage
  const getLimitUsage = useCallback((limitType: keyof TenantContext['limits']) => {
    if (!tenant) return { used: 0, max: 0, percentage: 0 };
    
    const limit = tenant.limits[limitType];
    const percentage = limit.max > 0 ? (limit.used / limit.max) * 100 : 0;
    
    return {
      used: limit.used,
      max: limit.max,
      percentage: Math.round(percentage)
    };
  }, [tenant]);
  
  // Update branding dynamically
  const updateBranding = useCallback(async (branding: Partial<TenantContext['branding']>) => {
    if (!tenant) return;
    
    try {
      // Update local state
      setTenant(prev => prev ? {
        ...prev,
        branding: { ...prev.branding, ...branding }
      } : null);
      
      // Clear cache
      tenantCache.delete(window.location.hostname);
      
    } catch (err) {
      console.error('Failed to update branding:', err);
      throw err;
    }
  }, [tenant]);
  
  // Track usage metrics
  const trackUsage = useCallback(async (metric: string, value: number) => {
    if (!tenant) return;
    
    try {
      console.log('Tracking usage:', metric, value);
    } catch (err) {
      console.error('Failed to track usage:', err);
    }
  }, [tenant]);
  
  // Validate request origin
  const validateOrigin = useCallback((origin: string): boolean => {
    if (!tenant) return false;
    
    const allowedOrigins = [
      `https://${tenant.domains.subdomain}.kisans.com`,
      tenant.domains.custom_domain ? `https://${tenant.domains.custom_domain}` : '',
      ...tenant.security.allowed_origins
    ].filter(Boolean);
    
    return allowedOrigins.includes(origin);
  }, [tenant]);
  
  // Check subscription status
  const checkSubscriptionStatus = useCallback((): boolean => {
    if (!tenant) return false;
    
    if (tenant.status === 'trial' && tenant.subscription.trial_ends_at) {
      return new Date() < new Date(tenant.subscription.trial_ends_at);
    }
    
    return tenant.status === 'active' && 
           new Date() < new Date(tenant.subscription.current_period_end);
  }, [tenant]);
  
  // Get portal URL
  const getPortalUrl = useCallback((portal: 'marketing' | 'management' | 'api'): string => {
    if (!tenant) return '';
    
    return tenant.domains.portal_urls[portal] || '';
  }, [tenant]);
  
  // Refresh tenant data
  const refreshTenant = useCallback(async () => {
    tenantCache.delete(window.location.hostname);
    await initializeTenant();
  }, []);
  
  const contextValue: MultiTenantContextType = {
    tenant,
    isLoading,
    error,
    portalType,
    isFeatureEnabled,
    checkLimit,
    getLimitUsage,
    refreshTenant,
    updateBranding,
    trackUsage,
    validateOrigin,
    checkSubscriptionStatus,
    getPortalUrl,
  };
  
  return (
    <MultiTenantContext.Provider value={contextValue}>
      {children}
    </MultiTenantContext.Provider>
  );
};

// Custom hook with error boundary
export const useMultiTenant = () => {
  const context = useContext(MultiTenantContext);
  if (context === undefined) {
    throw new Error('useMultiTenant must be used within a MultiTenantProvider');
  }
  return context;
};

// HOC for feature-gated components
export const withFeature = (feature: keyof TenantContext['features']) => {
  return function WithFeatureComponent<T extends object>(Component: React.ComponentType<T>) {
    return function FeatureGatedComponent(props: T) {
      const { isFeatureEnabled } = useMultiTenant();
      
      if (!isFeatureEnabled(feature)) {
        return React.createElement('div', null, 'This feature is not available in your current plan.');
      }
      
      return React.createElement(Component, props);
    };
  };
};

// HOC for portal-specific components
export const withPortal = (allowedPortals: MultiTenantContextType['portalType'][]) => {
  return function WithPortalComponent<T extends object>(Component: React.ComponentType<T>) {
    return function PortalGatedComponent(props: T) {
      const { portalType } = useMultiTenant();
      
      if (!portalType || !allowedPortals.includes(portalType)) {
        return React.createElement('div', null, 'Access denied for this portal type.');
      }
      
      return React.createElement(Component, props);
    };
  };
};

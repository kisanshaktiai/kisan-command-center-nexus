// White-label configuration types - Triple Domain Architecture

export interface MenuItem {
  label: string;
  url: string;
  icon?: string;
  target?: '_blank' | '_self';
}

export interface FAQItem {
  question: string;
  answer: string;
  category?: string;
}

// ============================================
// TRIPLE DOMAIN ARCHITECTURE
// ============================================

export type PortalType = 'public_website' | 'tenant_portal' | 'farmer_app';

export interface DomainPortalConfig {
  subdomain?: string | null;
  custom_domain?: string | null;
  ssl_enabled: boolean;
  dns_verified: boolean;
  status: 'not_configured' | 'pending' | 'active' | 'failed' | 'verifying';
  cloudflare_record_id?: string | null;
  last_verified?: string | null;
}

export interface CloudflareConfig {
  enabled: boolean;
  zone_id?: string | null;
  api_token?: string | null; // Encrypted in backend
  auto_dns: boolean; // Auto-create DNS records
  proxied: boolean; // Use Cloudflare proxy
  email?: string | null;
  account_id?: string | null;
}

export interface DomainConfig {
  public_website: DomainPortalConfig;
  tenant_portal: DomainPortalConfig;
  farmer_app: DomainPortalConfig;
  cloudflare: CloudflareConfig;
}

// ============================================
// CONTENT MANAGEMENT
// ============================================

export interface ContentManagement {
  terms_of_service?: string;
  privacy_policy?: string;
  about_page?: string;
  help_documentation?: string;
  faq_items?: FAQItem[];
  contact_info?: {
    email?: string;
    phone?: string;
    address?: string;
  };
}

// ============================================
// APP CUSTOMIZATION
// ============================================

export interface AppCustomization {
  app_name?: string;
  tagline?: string;
  favicon_url?: string;
  apple_touch_icon_url?: string;
  meta_description?: string;
  custom_menu?: MenuItem[];
  footer_text?: string;
  copyright_text?: string;
}

// ============================================
// DISTRIBUTION OPTIONS
// ============================================

export interface DistributionOptions {
  allow_subdomain_access?: boolean;
  custom_domain_enabled?: boolean;
  app_store_listing?: boolean;
  play_store_listing?: boolean;
  web_app_manifest?: Record<string, unknown>;
  pwa_enabled?: boolean;
}

// ============================================
// CSS CUSTOMIZATION
// ============================================

export interface CSSCustomization {
  custom_css?: string;
  css_variables?: Record<string, string>;
  theme_overrides?: Record<string, unknown>;
}

// ============================================
// DOMAIN HEALTH
// ============================================

export interface DomainHealth {
  ssl_status: 'valid' | 'invalid' | 'expired' | 'pending';
  dns_status: 'configured' | 'misconfigured' | 'pending';
  performance_score: number;
  uptime_percentage: number;
  last_checked: string;
}

// ============================================
// MAIN WHITE LABEL CONFIGURATION
// ============================================

export interface WhiteLabelConfig {
  tenant_id: string;
  app_customization?: AppCustomization;
  content_management?: ContentManagement;
  distribution_options?: DistributionOptions;
  css_customization?: CSSCustomization;
  domain_health?: DomainHealth;
  domain_config: DomainConfig; // Triple domain architecture
  created_at: string;
  updated_at?: string;
}

export type ConfigUpdateFunction = (section: string, field: string, value: unknown) => void;

// ============================================
// UTILITY FUNCTIONS
// ============================================

export const getPortalTypeLabel = (portalType: PortalType): string => {
  const labels: Record<PortalType, string> = {
    public_website: 'Public Website',
    tenant_portal: 'Tenant Portal',
    farmer_app: 'Farmer App'
  };
  return labels[portalType];
};

export const getPortalTypeDescription = (portalType: PortalType): string => {
  const descriptions: Record<PortalType, string> = {
    public_website: 'Main website for public access (e.g., www.kisanai.com)',
    tenant_portal: 'Partner/tenant management portal (e.g., partner.kisanai.com)',
    farmer_app: 'Mobile app and farmer interface (e.g., app.kisanai.com or farmer.kisanai.com)'
  };
  return descriptions[portalType];
};

export const getDomainExample = (portalType: PortalType): string => {
  const examples: Record<PortalType, string> = {
    public_website: 'www.yourdomain.com',
    tenant_portal: 'partner.yourdomain.com',
    farmer_app: 'app.yourdomain.com'
  };
  return examples[portalType];
};

// White-label configuration types
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

export interface DistributionOptions {
  allow_subdomain_access?: boolean;
  custom_domain_enabled?: boolean;
  app_store_listing?: boolean;
  play_store_listing?: boolean;
  web_app_manifest?: Record<string, unknown>;
  pwa_enabled?: boolean;
}

export interface CSSCustomization {
  custom_css?: string;
  css_variables?: Record<string, string>;
  theme_overrides?: Record<string, unknown>;
}

export interface DomainHealth {
  ssl_status: 'valid' | 'invalid' | 'expired' | 'pending';
  dns_status: 'configured' | 'misconfigured' | 'pending';
  performance_score: number;
  uptime_percentage: number;
  last_checked: string;
}

export interface WhiteLabelConfig {
  tenant_id: string;
  app_customization?: AppCustomization;
  content_management?: ContentManagement;
  distribution_options?: DistributionOptions;
  css_customization?: CSSCustomization;
  domain_health?: DomainHealth;
  created_at: string;
  updated_at?: string;
}

export type ConfigUpdateFunction = (section: string, field: string, value: unknown) => void;
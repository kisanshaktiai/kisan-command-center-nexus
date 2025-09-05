// Comprehensive White-Label Configuration Types for Multi-Tenant SaaS Platform

export interface BrandIdentity {
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  font_family?: string;
  company_name?: string;
}

export interface DomainConfig {
  custom_domain?: string;
  subdomain?: string;
  ssl_enabled?: boolean;
  redirect_urls?: string[];
}

export interface EmailTemplates {
  welcome_template?: string;
  notification_template?: string;
  invoice_template?: string;
  header_color?: string;
  footer_text?: string;
}

export interface AppStoreConfig {
  app_name?: string;
  app_description?: string;
  app_icon?: string;
  screenshots?: string[];
  keywords?: string[];
  category?: string;
}

export interface PWAConfig {
  app_name?: string;
  short_name?: string;
  description?: string;
  theme_color?: string;
  background_color?: string;
  display?: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  orientation?: 'portrait' | 'landscape' | 'any';
  icons?: Array<{
    src: string;
    sizes: string;
    type: string;
  }>;
}

export interface SplashScreens {
  mobile_splash?: string;
  tablet_splash?: string;
  desktop_splash?: string;
  loading_animation?: string;
}

export interface CSSInjection {
  enabled?: boolean;
  custom_css?: string;
  mobile_css?: string;
  print_css?: string;
  css_variables?: Record<string, string>;
  theme_overrides?: Record<string, unknown>;
}

export interface CustomMenuItem {
  id: string;
  title: string;
  icon: string;
  route: string;
  visible: boolean;
  order: number;
  target?: '_blank' | '_self';
}

export interface AppCustomization {
  // App Identifiers
  bundle_id?: string;
  app_version?: string;
  build_number?: number;
  minimum_ios_version?: string;
  minimum_android_version?: string;
  
  // App Metadata
  app_name?: string;
  tagline?: string;
  meta_description?: string;
  favicon_url?: string;
  apple_touch_icon_url?: string;
  
  // Language & Localization
  supported_languages?: string;
  default_language?: string;
  
  // Navigation & Menu
  custom_menu?: CustomMenuItem[];
  footer_text?: string;
  copyright_text?: string;
  
  // Module Visibility
  visible_modules?: Record<string, boolean>;
  
  // Custom Configuration
  custom_fields?: string; // JSON string for custom field definitions
  business_rules?: string; // JSON string for business rules
  
  // Animation Settings
  loading_animation_url?: string;
  transition_duration?: number;
  animations_enabled?: boolean;
  respect_reduce_motion?: boolean;
  animation_preset?: 'minimal' | 'standard' | 'smooth' | 'playful' | 'custom';
}

export interface FAQItem {
  question: string;
  answer: string;
  category?: string;
}

export interface ContentManagement {
  // Documentation & Help
  help_center_url?: string;
  documentation_url?: string;
  getting_started_guide?: string;
  onboarding_video?: string;
  tutorial_videos?: string[];
  
  // Legal Documents
  terms_of_service?: string;
  privacy_policy?: string;
  data_processing_agreement?: string;
  about_page?: string;
  
  // FAQs
  faq_items?: FAQItem[];
  
  // Contact Information
  contact_info?: {
    email?: string;
    phone?: string;
    address?: string;
    support_hours?: string;
  };
  
  // Custom Messaging
  custom_messaging_enabled?: boolean;
  welcome_message?: string;
  success_messages?: string;
  error_messages?: string;
  help_documentation?: string;
}

export interface DistributionOptions {
  // PWA Settings
  pwa_enabled?: boolean;
  pwa_install_prompt?: string;
  pwa_offline_support?: boolean;
  pwa_cache_strategy?: 'cache-first' | 'network-first' | 'stale-while-revalidate';
  
  // Store Settings
  private_store_enabled?: boolean;
  store_url?: string;
  store_name?: string;
  app_store_listing?: boolean;
  play_store_listing?: boolean;
  
  // Access Control
  distribution_groups?: string;
  require_authentication?: boolean;
  allow_subdomain_access?: boolean;
  custom_domain_enabled?: boolean;
  
  // Deep Linking
  url_scheme?: string;
  universal_links_domain?: string;
  deep_link_routes?: string;
  
  // Update Management
  update_channel?: 'stable' | 'beta' | 'alpha';
  auto_updates?: boolean;
  update_check_interval?: number; // hours
  force_update?: boolean;
  minimum_version?: string;
  update_message?: string;
  
  // Web App Manifest
  web_app_manifest?: Record<string, unknown>;
}

export interface DomainHealth {
  ssl_status: 'valid' | 'invalid' | 'expired' | 'pending';
  dns_status: 'configured' | 'misconfigured' | 'pending';
  performance_score: number; // 0-100
  uptime_percentage: number; // 0-100
  last_checked: string; // ISO date string
  issues?: string[];
  recommendations?: string[];
}

export interface WhiteLabelConfiguration {
  id: string;
  tenant_id: string;
  brand_identity?: BrandIdentity;
  domain_config?: DomainConfig;
  email_templates?: EmailTemplates;
  app_store_config?: AppStoreConfig;
  pwa_config?: PWAConfig;
  splash_screens?: SplashScreens;
  css_injection?: CSSInjection;
  app_customization?: AppCustomization;
  content_management?: ContentManagement;
  distribution?: DistributionOptions;
  domain_health?: DomainHealth;
  created_at: string;
  updated_at?: string;
}

// Helper type for configuration updates
export type ConfigUpdateFunction = (section: string, field: string, value: unknown) => void;

// Validation helpers
export const isValidHexColor = (color: string): boolean => {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

export const isValidURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const isValidDomain = (domain: string): boolean => {
  return /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i.test(domain);
};
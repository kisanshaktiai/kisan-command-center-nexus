import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, Eye, Palette, Globe, Mail, Smartphone, Monitor, Code, Settings, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useWhiteLabelConfig } from '@/hooks/useWhiteLabelConfig';

// Import the new components
import { CSSInjectionPanel } from '@/components/white-label/CSSInjectionPanel';
import { DomainHealthPanel } from '@/components/white-label/DomainHealthPanel';
import { ContentManagementPanel } from '@/components/white-label/ContentManagementPanel';
import { DistributionOptionsPanel } from '@/components/white-label/DistributionOptionsPanel';
import { AdvancedAppCustomizationPanel } from '@/components/white-label/AdvancedAppCustomizationPanel';
import { LogoUploadSection } from '@/components/white-label/LogoUploadSection';
import { DomainValidationSection } from '@/components/white-label/DomainValidationSection';
import { EmailTemplatesPanel } from '@/components/white-label/EmailTemplatesPanel';
import { EnhancedMobileThemePanel } from '@/components/white-label/EnhancedMobileThemePanel';

interface WhiteLabelConfig {
  id: string;
  tenant_id: string;
  brand_identity: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    font_family?: string;
    company_name?: string;
    app_name?: string;
    tag_line?: string;
  };
  domain_config: {
    custom_domain?: string;
    subdomain?: string;
    ssl_enabled?: boolean;
    redirect_urls?: string[];
  };
  email_templates: {
    welcome_template?: string;
    notification_template?: string;
    invoice_template?: string;
    header_color?: string;
    footer_text?: string;
  };
  app_store_config: {
    app_name?: string;
    app_description?: string;
    app_icon?: string;
    category?: string;
    keywords?: string[];
    screenshots?: string[];
    privacy_policy_url?: string;
    terms_url?: string;
  };
  pwa_config: {
    name?: string;
    short_name?: string;
    description?: string;
    theme_color?: string;
    background_color?: string;
    display?: string;
    orientation?: string;
    start_url?: string;
    scope?: string;
    icons?: Array<{
      src: string;
      sizes: string;
      type: string;
      purpose?: string;
    }>;
  };
  splash_screens: {
    ios_splash?: string;
    android_splash?: string;
    background_color?: string;
    logo_size?: string;
  };
  css_injection?: {
    enabled?: boolean;
    custom_css?: string;
    mobile_css?: string;
    print_css?: string;
    critical_css?: string;
    css_minified?: boolean;
    preprocessor?: string;
    css_framework?: string;
    css_variables?: string;
  };
  app_customization?: {
    visible_modules?: Record<string, boolean>;
    custom_branding?: boolean;
    layout_customization?: string;
    theme_mode?: string;
    color_scheme?: string;
    typography_scale?: number;
    animations_enabled?: boolean;
    transition_duration?: number;
    respect_reduce_motion?: boolean;
    animation_preset?: string;
  };
  content_management?: {
    help_center_url?: string;
    documentation_url?: string;
    getting_started_guide?: string;
    onboarding_video?: string;
    tutorial_videos?: string[];
    terms_of_service?: string;
    privacy_policy?: string;
    data_processing_agreement?: string;
    faq_items?: Array<{ question: string; answer: string }>;
    custom_messaging_enabled?: boolean;
    welcome_message?: string;
    success_messages?: string;
    error_messages?: string;
  };
  distribution?: {
    pwa_enabled?: boolean;
    pwa_install_prompt?: string;
    pwa_offline_support?: boolean;
    pwa_cache_strategy?: string;
    private_store_enabled?: boolean;
    store_url?: string;
    store_name?: string;
    distribution_groups?: string;
    require_authentication?: boolean;
    url_scheme?: string;
    universal_links_domain?: string;
    deep_link_routes?: string;
    update_channel?: string;
    auto_updates?: boolean;
    update_check_interval?: number;
    force_update?: boolean;
    minimum_version?: string;
    update_message?: string;
  };
  domain_health?: {
    ssl_status: 'valid' | 'invalid' | 'expired' | 'pending';
    dns_status: 'configured' | 'misconfigured' | 'pending';
    performance_score: number;
    uptime_percentage: number;
    last_checked: string;
  };
  created_at: string;
  updated_at: string;
}

interface Tenant {
  id: string;
  name: string;
}

export default function WhiteLabelConfig() {
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [config, setConfig] = useState<WhiteLabelConfig | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch tenants
  const { data: tenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ['tenants-for-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return (data || []) as Tenant[];
    }
  });

  // Use the custom hook for white-label config management
  const { 
    config: whiteLabelConfig, 
    isLoading: configLoading, 
    saveConfig, 
    isSaving,
    refetch: refetchConfig 
  } = useWhiteLabelConfig(selectedTenant);

  useEffect(() => {
    if (whiteLabelConfig) {
      // Load existing config - convert from hook's data type
      setConfig({
        id: whiteLabelConfig.id || '',
        tenant_id: whiteLabelConfig.tenant_id,
        brand_identity: whiteLabelConfig.brand_identity || {},
        domain_config: whiteLabelConfig.domain_config || {},
        email_templates: whiteLabelConfig.email_templates || {},
        app_store_config: whiteLabelConfig.app_store_config || {},
        pwa_config: whiteLabelConfig.pwa_config || {},
        splash_screens: whiteLabelConfig.splash_screens || {},
        css_injection: whiteLabelConfig.css_injection || {},
        app_customization: whiteLabelConfig.app_customization || {},
        content_management: whiteLabelConfig.content_management || {},
        distribution: whiteLabelConfig.distribution || {},
        domain_health: whiteLabelConfig.domain_health || {},
        created_at: whiteLabelConfig.created_at || '',
        updated_at: whiteLabelConfig.updated_at || ''
      } as WhiteLabelConfig);
      setHasUnsavedChanges(false);
    } else if (selectedTenant) {
      // Initialize with default config including new sections
      setConfig({
        id: '',
        tenant_id: selectedTenant,
        brand_identity: {
          primary_color: '#6366f1',  // Modern Indigo
          secondary_color: '#a855f7', // Modern Purple
          accent_color: '#f59e0b',    // Modern Amber
          font_family: 'Inter',
          company_name: '',
          app_name: '',
          tag_line: ''
        },
        domain_config: {
          ssl_enabled: true,
          redirect_urls: []
        },
        email_templates: {
          header_color: '#3b82f6',
          footer_text: 'Powered by KisanShaktiAI'
        },
        app_store_config: {
          category: 'Agriculture',
          keywords: ['agriculture', 'farming', 'crops']
        },
        pwa_config: {
          display: 'standalone',
          orientation: 'portrait',
          theme_color: '#3b82f6',
          background_color: '#ffffff',
          icons: []
        },
        splash_screens: {},
        css_injection: {
          enabled: false,
          custom_css: '',
          mobile_css: '',
          print_css: ''
        },
        app_customization: {
          animations_enabled: true,
          respect_reduce_motion: true,
          transition_duration: 300,
          animation_preset: 'standard',
          visible_modules: {}
        },
        content_management: {
          custom_messaging_enabled: false,
          faq_items: []
        },
        distribution: {
          pwa_enabled: false,
          pwa_offline_support: false,
          private_store_enabled: false,
          auto_updates: true,
          update_check_interval: 24
        },
        domain_health: {
          ssl_status: 'pending',
          dns_status: 'pending',
          performance_score: 0,
          uptime_percentage: 0,
          last_checked: new Date().toISOString()
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      setHasUnsavedChanges(false);
    }
  }, [whiteLabelConfig, selectedTenant]);

  const handleSave = async () => {
    if (!config || !selectedTenant) return;
    
    // Ensure brand_identity includes all fields
    const configData = {
      brand_identity: {
        logo_url: config.brand_identity?.logo_url || '',
        primary_color: config.brand_identity?.primary_color || '#6366f1',
        secondary_color: config.brand_identity?.secondary_color || '#a855f7',
        accent_color: config.brand_identity?.accent_color || '#f59e0b',
        font_family: config.brand_identity?.font_family || 'Inter',
        company_name: config.brand_identity?.company_name || '',
        app_name: config.brand_identity?.app_name || '',
        tag_line: config.brand_identity?.tag_line || ''
      },
      domain_config: config.domain_config,
      email_templates: config.email_templates,
      app_store_config: config.app_store_config,
      pwa_config: config.pwa_config,
      splash_screens: config.splash_screens,
      css_injection: config.css_injection,
      app_customization: config.app_customization,
      content_management: config.content_management,
      distribution: config.distribution,
      domain_health: config.domain_health
    };
    
    try {
      await saveConfig(configData);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  };

  const updateConfig = (section: keyof WhiteLabelConfig, field: string, value: any) => {
    if (!config) return;
    
    const currentSection = config[section];
    const sectionValue = typeof currentSection === 'object' && currentSection !== null ? currentSection : {};
    
    setConfig({
      ...config,
      [section]: {
        ...sectionValue,
        [field]: value
      }
    });
    setHasUnsavedChanges(true);
  };

  // Handle tenant selection change
  const handleTenantChange = (newTenantId: string) => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Do you want to discard them?')) {
        return;
      }
    }
    setSelectedTenant(newTenantId);
    setHasUnsavedChanges(false);
  };

  const generateEmailPreview = (template: string) => {
    const userName = 'John Doe';
    const appName = config?.app_store_config?.app_name || 'KisanShaktiAI';
    const companyName = config?.brand_identity?.company_name || 'Your Company';
    
    return template
      .replace(/\{\{user_name\}\}/g, userName)
      .replace(/\{\{app_name\}\}/g, appName)
      .replace(/\{\{company_name\}\}/g, companyName);
  };

  if (tenantsLoading) {
    return <div className="text-center py-8">Loading tenants...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">White-Label Configuration</h1>
          <p className="text-muted-foreground">Customize branding and appearance for tenants</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="h-4 w-4 mr-1" />
            {previewMode ? 'Edit Mode' : 'Preview'}
          </Button>
        </div>
      </div>

      {/* Tenant Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label htmlFor="tenant-select">Select Tenant</Label>
            <select
              id="tenant-select"
              className="w-full p-2 border rounded-md"
              value={selectedTenant}
              onChange={(e) => handleTenantChange(e.target.value)}
            >
              <option value="">Choose a tenant...</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {selectedTenant && (
        <Tabs defaultValue="branding" className="space-y-4">
          <div className="flex justify-between items-center">
            <TabsList className="grid grid-cols-8 w-full max-w-4xl">
              <TabsTrigger value="branding">
                <Palette className="h-4 w-4 mr-1" />
                Branding
              </TabsTrigger>
              <TabsTrigger value="domain">
                <Globe className="h-4 w-4 mr-1" />
                Domain
              </TabsTrigger>
              <TabsTrigger value="email">
                <Mail className="h-4 w-4 mr-1" />
                Email
              </TabsTrigger>
              <TabsTrigger value="mobile">
                <Smartphone className="h-4 w-4 mr-1" />
                Mobile
              </TabsTrigger>
              <TabsTrigger value="pwa">
                <Monitor className="h-4 w-4 mr-1" />
                PWA
              </TabsTrigger>
              <TabsTrigger value="advanced">
                <Code className="h-4 w-4 mr-1" />
                Advanced
              </TabsTrigger>
              <TabsTrigger value="content">
                <Settings className="h-4 w-4 mr-1" />
                Content
              </TabsTrigger>
              <TabsTrigger value="distribution">
                <Download className="h-4 w-4 mr-1" />
                Distribution
              </TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              {hasUnsavedChanges && (
                <Badge variant="outline" className="text-amber-600">
                  Unsaved Changes
                </Badge>
              )}
              <Button
                onClick={handleSave}
                disabled={!hasUnsavedChanges || isSaving}
                className="min-w-[100px]"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Brand Identity</CardTitle>
                <CardDescription>Configure your brand colors, logo, and visual identity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <LogoUploadSection 
                  logoUrl={config?.brand_identity?.logo_url || ''} 
                  onLogoChange={(url) => updateConfig('brand_identity', 'logo_url', url)} 
                />
                
                {/* App Name and Tag Line */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="app-name">App Name</Label>
                    <Input
                      id="app-name"
                      type="text"
                      placeholder="Enter your app name"
                      value={config?.brand_identity?.app_name || ''}
                      onChange={(e) => updateConfig('brand_identity', 'app_name', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tag-line">Tag Line</Label>
                    <Input
                      id="tag-line"
                      type="text"
                      placeholder="Enter your tag line"
                      value={config?.brand_identity?.tag_line || ''}
                      onChange={(e) => updateConfig('brand_identity', 'tag_line', e.target.value)}
                    />
                  </div>
                </div>
                
                {/* Color Configuration */}
                <div className="space-y-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Note:</strong> These brand colors serve as the default theme for your application. 
                      The mobile theme section allows you to override these colors specifically for mobile app experiences.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primary-color">Primary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="primary-color"
                          type="color"
                          value={config?.brand_identity?.primary_color || '#3b82f6'}
                          onChange={(e) => updateConfig('brand_identity', 'primary_color', e.target.value)}
                          className="h-10 w-20"
                        />
                        <Input
                          type="text"
                          value={config?.brand_identity?.primary_color || '#3b82f6'}
                          onChange={(e) => updateConfig('brand_identity', 'primary_color', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="secondary-color">Secondary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="secondary-color"
                          type="color"
                          value={config?.brand_identity?.secondary_color || '#64748b'}
                          onChange={(e) => updateConfig('brand_identity', 'secondary_color', e.target.value)}
                          className="h-10 w-20"
                        />
                        <Input
                          type="text"
                          value={config?.brand_identity?.secondary_color || '#64748b'}
                          onChange={(e) => updateConfig('brand_identity', 'secondary_color', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accent-color">Accent Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="accent-color"
                          type="color"
                          value={config?.brand_identity?.accent_color || '#10b981'}
                          onChange={(e) => updateConfig('brand_identity', 'accent_color', e.target.value)}
                          className="h-10 w-20"
                        />
                        <Input
                          type="text"
                          value={config?.brand_identity?.accent_color || '#10b981'}
                          onChange={(e) => updateConfig('brand_identity', 'accent_color', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input
                    id="company-name"
                    value={config?.brand_identity?.company_name || ''}
                    onChange={(e) => updateConfig('brand_identity', 'company_name', e.target.value)}
                    placeholder="Your Company Name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="font-family">Font Family</Label>
                  <select
                    id="font-family"
                    className="w-full p-2 border rounded-md"
                    value={config?.brand_identity?.font_family || 'Inter'}
                    onChange={(e) => updateConfig('brand_identity', 'font_family', e.target.value)}
                  >
                    <option value="Inter">Inter</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Open Sans">Open Sans</option>
                    <option value="Lato">Lato</option>
                    <option value="Poppins">Poppins</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Domain Tab */}
          <TabsContent value="domain" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Domain Configuration</CardTitle>
                <CardDescription>Set up custom domain and subdomain settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <DomainValidationSection 
                  domain={config?.domain_config?.custom_domain || ''} 
                  onDomainChange={(domain) => updateConfig('domain_config', 'custom_domain', domain)}
                  type="custom_domain"
                  tenantId={selectedTenant}
                />
                
                <div className="space-y-2">
                  <Label htmlFor="custom-domain">Custom Domain</Label>
                  <Input
                    id="custom-domain"
                    value={config?.domain_config?.custom_domain || ''}
                    onChange={(e) => updateConfig('domain_config', 'custom_domain', e.target.value)}
                    placeholder="app.yourdomain.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subdomain">Subdomain</Label>
                  <Input
                    id="subdomain"
                    value={config?.domain_config?.subdomain || ''}
                    onChange={(e) => updateConfig('domain_config', 'subdomain', e.target.value)}
                    placeholder="yourcompany"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="ssl-enabled"
                    checked={config?.domain_config?.ssl_enabled || false}
                    onCheckedChange={(checked) => updateConfig('domain_config', 'ssl_enabled', checked)}
                  />
                  <Label htmlFor="ssl-enabled">Enable SSL/HTTPS</Label>
                </div>

                <DomainHealthPanel config={config} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Tab */}
          <TabsContent value="email" className="space-y-4">
            <EmailTemplatesPanel config={config} updateConfig={updateConfig} />
          </TabsContent>

          {/* Mobile Tab */}
          <TabsContent value="mobile" className="space-y-4">
            <EnhancedMobileThemePanel 
              config={config} 
              updateConfig={updateConfig}
              tenantId={selectedTenant}
              appName={config?.app_store_config?.app_name || 'Your App'}
              logoUrl={config?.brand_identity?.logo_url || ''}
            />
            
            <Card>
              <CardHeader>
                <CardTitle>App Store Configuration</CardTitle>
                <CardDescription>Configure app store listing details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="app-name">App Name</Label>
                    <Input
                      id="app-name"
                      value={config?.app_store_config?.app_name || ''}
                      onChange={(e) => updateConfig('app_store_config', 'app_name', e.target.value)}
                      placeholder="Your App Name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="app-category">Category</Label>
                    <Input
                      id="app-category"
                      value={config?.app_store_config?.category || ''}
                      onChange={(e) => updateConfig('app_store_config', 'category', e.target.value)}
                      placeholder="Business"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="app-description">App Description</Label>
                  <Textarea
                    id="app-description"
                    value={config?.app_store_config?.app_description || ''}
                    onChange={(e) => updateConfig('app_store_config', 'app_description', e.target.value)}
                    placeholder="Describe your app..."
                    className="min-h-[100px]"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PWA Tab */}
          <TabsContent value="pwa" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Progressive Web App Settings</CardTitle>
                <CardDescription>Configure PWA manifest and behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pwa-name">App Name</Label>
                    <Input
                      id="pwa-name"
                      value={config?.pwa_config?.name || ''}
                      onChange={(e) => updateConfig('pwa_config', 'name', e.target.value)}
                      placeholder="Your PWA Name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pwa-short-name">Short Name</Label>
                    <Input
                      id="pwa-short-name"
                      value={config?.pwa_config?.short_name || ''}
                      onChange={(e) => updateConfig('pwa_config', 'short_name', e.target.value)}
                      placeholder="ShortName"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pwa-display">Display Mode</Label>
                    <select
                      id="pwa-display"
                      className="w-full p-2 border rounded-md"
                      value={config?.pwa_config?.display || 'standalone'}
                      onChange={(e) => updateConfig('pwa_config', 'display', e.target.value)}
                    >
                      <option value="fullscreen">Fullscreen</option>
                      <option value="standalone">Standalone</option>
                      <option value="minimal-ui">Minimal UI</option>
                      <option value="browser">Browser</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pwa-orientation">Orientation</Label>
                    <select
                      id="pwa-orientation"
                      className="w-full p-2 border rounded-md"
                      value={config?.pwa_config?.orientation || 'any'}
                      onChange={(e) => updateConfig('pwa_config', 'orientation', e.target.value)}
                    >
                      <option value="any">Any</option>
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* New Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4">
            <AdvancedAppCustomizationPanel config={config} updateConfig={updateConfig} />
            <CSSInjectionPanel config={config} updateConfig={updateConfig} />
          </TabsContent>

          {/* New Content Tab */}
          <TabsContent value="content" className="space-y-4">
            <ContentManagementPanel config={config} updateConfig={updateConfig} />
          </TabsContent>

          {/* New Distribution Tab */}
          <TabsContent value="distribution" className="space-y-4">
            <DistributionOptionsPanel config={config} updateConfig={updateConfig} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
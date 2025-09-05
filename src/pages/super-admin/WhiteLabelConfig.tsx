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
import { MobileThemeConfigPanel } from '@/components/white-label/MobileThemeConfigPanel';

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
    screenshots?: string[];
    keywords?: string[];
    category?: string;
  };
  pwa_config: {
    app_name?: string;
    short_name?: string;
    description?: string;
    theme_color?: string;
    background_color?: string;
    display?: string;
    orientation?: string;
    icons?: Array<{
      src: string;
      sizes: string;
      type: string;
    }>;
  };
  splash_screens: {
    mobile_splash?: string;
    tablet_splash?: string;
    desktop_splash?: string;
    loading_animation?: string;
  };
  // New configuration sections
  css_injection?: {
    enabled?: boolean;
    custom_css?: string;
    mobile_css?: string;
    print_css?: string;
  };
  app_customization?: {
    bundle_id?: string;
    app_version?: string;
    build_number?: number;
    minimum_ios_version?: string;
    minimum_android_version?: string;
    supported_languages?: string;
    custom_menu?: any[];
    visible_modules?: Record<string, boolean>;
    custom_fields?: string;
    business_rules?: string;
    loading_animation_url?: string;
    transition_duration?: number;
    animations_enabled?: boolean;
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
          primary_color: '#3b82f6',
          secondary_color: '#64748b',
          accent_color: '#10b981',
          font_family: 'Inter',
          company_name: ''
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
          pwa_enabled: true,
          auto_updates: true,
          update_channel: 'stable',
          update_check_interval: 24
        },
        domain_health: {
          ssl_status: 'pending',
          dns_status: 'pending',
          performance_score: 0,
          uptime_percentage: 0,
          last_checked: new Date().toISOString()
        },
        created_at: '',
        updated_at: ''
      });
    }
  }, [whiteLabelConfig, selectedTenant]);

  const handleSave = async () => {
    if (!config || !selectedTenant) {
      toast.error('Please select a tenant first');
      return;
    }
    
    const configData = {
      brand_identity: config.brand_identity,
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
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="w-4 h-4 mr-2" />
            {previewMode ? 'Exit Preview' : 'Preview'}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!config || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Configuration
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tenant Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Tenant</CardTitle>
          <CardDescription>Choose a tenant to configure white-label settings</CardDescription>
        </CardHeader>
        <CardContent>
          <select
            className="w-full p-2 border rounded-md"
            value={selectedTenant}
            onChange={(e) => handleTenantChange(e.target.value)}
            disabled={tenantsLoading}
          >
            <option value="">Select a tenant...</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
          {configLoading && selectedTenant && (
            <p className="text-sm text-muted-foreground mt-2">
              <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
              Loading configuration...
            </p>
          )}
          {hasUnsavedChanges && (
            <Badge variant="outline" className="mt-2">
              Unsaved changes
            </Badge>
          )}
        </CardContent>
      </Card>

      {selectedTenant && config && (
        <Tabs defaultValue="brand" className="space-y-4">
          <TabsList className="grid w-full grid-cols-8 text-xs">
            <TabsTrigger value="brand" className="flex items-center gap-1">
              <Palette className="w-3 h-3" />
              Brand
            </TabsTrigger>
            <TabsTrigger value="domain" className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              Domain
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              Email
            </TabsTrigger>
            <TabsTrigger value="mobile" className="flex items-center gap-1">
              <Smartphone className="w-3 h-3" />
              Mobile
            </TabsTrigger>
            <TabsTrigger value="pwa" className="flex items-center gap-1">
              <Monitor className="w-3 h-3" />
              PWA
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-1">
              <Settings className="w-3 h-3" />
              Advanced
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Content
            </TabsTrigger>
            <TabsTrigger value="distribution" className="flex items-center gap-1">
              <Download className="w-3 h-3" />
              Distribution
            </TabsTrigger>
          </TabsList>

          {/* Brand Identity */}
          <TabsContent value="brand" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Brand Identity</CardTitle>
                <CardDescription>Configure colors, fonts, and branding elements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="company_name">Company Name</Label>
                    <Input
                      id="company_name"
                      value={config.brand_identity.company_name || ''}
                      onChange={(e) => updateConfig('brand_identity', 'company_name', e.target.value)}
                      placeholder="Your Company Name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="font_family">Font Family</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={config.brand_identity.font_family || 'Inter'}
                      onChange={(e) => updateConfig('brand_identity', 'font_family', e.target.value)}
                    >
                      <option value="Inter">Inter</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Open Sans">Open Sans</option>
                      <option value="Lato">Lato</option>
                      <option value="Poppins">Poppins</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="primary_color">Primary Color</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="color"
                        value={config.brand_identity.primary_color || '#3b82f6'}
                        onChange={(e) => updateConfig('brand_identity', 'primary_color', e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={config.brand_identity.primary_color || '#3b82f6'}
                        onChange={(e) => updateConfig('brand_identity', 'primary_color', e.target.value)}
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="secondary_color">Secondary Color</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="color"
                        value={config.brand_identity.secondary_color || '#64748b'}
                        onChange={(e) => updateConfig('brand_identity', 'secondary_color', e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={config.brand_identity.secondary_color || '#64748b'}
                        onChange={(e) => updateConfig('brand_identity', 'secondary_color', e.target.value)}
                        placeholder="#64748b"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="accent_color">Accent Color</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="color"
                        value={config.brand_identity.accent_color || '#10b981'}
                        onChange={(e) => updateConfig('brand_identity', 'accent_color', e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={config.brand_identity.accent_color || '#10b981'}
                        onChange={(e) => updateConfig('brand_identity', 'accent_color', e.target.value)}
                        placeholder="#10b981"
                      />
                    </div>
                  </div>
                </div>

                <LogoUploadSection
                  logoUrl={config.brand_identity.logo_url || ''}
                  onLogoChange={(url) => updateConfig('brand_identity', 'logo_url', url)}
                  label="Company Logo"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Domain Configuration */}
          <TabsContent value="domain" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Domain Configuration</CardTitle>
                <CardDescription>Set up custom domains and SSL settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <DomainValidationSection
                    domain={config.domain_config.subdomain || ''}
                    onDomainChange={(domain) => updateConfig('domain_config', 'subdomain', domain)}
                    type="subdomain"
                    tenantId={selectedTenant}
                  />
                  <DomainValidationSection
                    domain={config.domain_config.custom_domain || ''}
                    onDomainChange={(domain) => updateConfig('domain_config', 'custom_domain', domain)}
                    type="custom_domain"
                    tenantId={selectedTenant}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="ssl_enabled"
                    checked={config.domain_config.ssl_enabled || false}
                    onCheckedChange={(checked) => updateConfig('domain_config', 'ssl_enabled', checked)}
                  />
                  <Label htmlFor="ssl_enabled">Enable SSL Certificate</Label>
                </div>

                <div>
                  <Label htmlFor="redirect_urls">Redirect URLs (one per line)</Label>
                  <Textarea
                    id="redirect_urls"
                    value={(config.domain_config.redirect_urls || []).join('\n')}
                    onChange={(e) => updateConfig('domain_config', 'redirect_urls', e.target.value.split('\n').filter(Boolean))}
                    placeholder="https://yoursite.com/auth/callback"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <DomainHealthPanel config={config} updateConfig={updateConfig} />
          </TabsContent>

          {/* Email Templates */}
          <TabsContent value="email" className="space-y-4">
            <EmailTemplatesPanel config={config} updateConfig={updateConfig} />
          </TabsContent>

          {/* Mobile App Configuration */}
          <TabsContent value="mobile" className="space-y-4">
            <MobileThemeConfigPanel config={config} updateConfig={updateConfig} />
          </TabsContent>

          {/* PWA Configuration */}
          <TabsContent value="pwa" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>PWA Configuration</CardTitle>
                <CardDescription>Configure Progressive Web App settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="pwa_app_name">App Name</Label>
                    <Input
                      id="pwa_app_name"
                      value={config.pwa_config.app_name || ''}
                      onChange={(e) => updateConfig('pwa_config', 'app_name', e.target.value)}
                      placeholder="KisanShaktiAI"
                    />
                  </div>
                  <div>
                    <Label htmlFor="short_name">Short Name</Label>
                    <Input
                      id="short_name"
                      value={config.pwa_config.short_name || ''}
                      onChange={(e) => updateConfig('pwa_config', 'short_name', e.target.value)}
                      placeholder="KisanShakti"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="pwa_description">Description</Label>
                  <Textarea
                    id="pwa_description"
                    value={config.pwa_config.description || ''}
                    onChange={(e) => updateConfig('pwa_config', 'description', e.target.value)}
                    placeholder="Agricultural management platform"
                    rows={2}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="theme_color">Theme Color</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="color"
                        value={config.pwa_config.theme_color || '#3b82f6'}
                        onChange={(e) => updateConfig('pwa_config', 'theme_color', e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={config.pwa_config.theme_color || '#3b82f6'}
                        onChange={(e) => updateConfig('pwa_config', 'theme_color', e.target.value)}
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="background_color">Background Color</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="color"
                        value={config.pwa_config.background_color || '#ffffff'}
                        onChange={(e) => updateConfig('pwa_config', 'background_color', e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={config.pwa_config.background_color || '#ffffff'}
                        onChange={(e) => updateConfig('pwa_config', 'background_color', e.target.value)}
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="display">Display Mode</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={config.pwa_config.display || 'standalone'}
                      onChange={(e) => updateConfig('pwa_config', 'display', e.target.value)}
                    >
                      <option value="standalone">Standalone</option>
                      <option value="fullscreen">Fullscreen</option>
                      <option value="minimal-ui">Minimal UI</option>
                      <option value="browser">Browser</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="orientation">Orientation</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={config.pwa_config.orientation || 'portrait'}
                      onChange={(e) => updateConfig('pwa_config', 'orientation', e.target.value)}
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                      <option value="any">Any</option>
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

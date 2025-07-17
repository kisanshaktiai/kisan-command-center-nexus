
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, Eye, Palette, Globe, Mail, Smartphone, Monitor } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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
  const queryClient = useQueryClient();

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
      return data as Tenant[];
    }
  });

  // Fetch white-label config for selected tenant
  const { data: whiteLabelConfig, isLoading: configLoading } = useQuery({
    queryKey: ['white-label-config', selectedTenant],
    queryFn: async () => {
      if (!selectedTenant) return null;
      
      const { data, error } = await supabase
        .from('white_label_configs')
        .select('*')
        .eq('tenant_id', selectedTenant)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as WhiteLabelConfig;
    },
    enabled: !!selectedTenant
  });

  useEffect(() => {
    if (whiteLabelConfig) {
      setConfig(whiteLabelConfig);
    } else if (selectedTenant) {
      // Initialize with default config
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
        created_at: '',
        updated_at: ''
      });
    }
  }, [whiteLabelConfig, selectedTenant]);

  // Save configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (configData: Partial<WhiteLabelConfig>) => {
      if (whiteLabelConfig) {
        // Update existing config
        const { data, error } = await supabase
          .from('white_label_configs')
          .update(configData)
          .eq('id', whiteLabelConfig.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Create new config
        const { data, error } = await supabase
          .from('white_label_configs')
          .insert([{ ...configData, tenant_id: selectedTenant }])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['white-label-config'] });
      toast.success('Configuration saved successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to save configuration: ' + error.message);
    }
  });

  const handleSave = () => {
    if (!config) return;
    
    const configData = {
      brand_identity: config.brand_identity,
      domain_config: config.domain_config,
      email_templates: config.email_templates,
      app_store_config: config.app_store_config,
      pwa_config: config.pwa_config,
      splash_screens: config.splash_screens
    };
    
    saveConfigMutation.mutate(configData);
  };

  const updateConfig = (section: keyof WhiteLabelConfig, field: string, value: any) => {
    if (!config) return;
    
    setConfig({
      ...config,
      [section]: {
        ...config[section],
        [field]: value
      }
    });
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
            disabled={!config || saveConfigMutation.isPending}
          >
            {saveConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
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
            onChange={(e) => setSelectedTenant(e.target.value)}
          >
            <option value="">Select a tenant...</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {selectedTenant && config && (
        <Tabs defaultValue="brand" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="brand" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Brand
            </TabsTrigger>
            <TabsTrigger value="domain" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Domain
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="mobile" className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Mobile
            </TabsTrigger>
            <TabsTrigger value="pwa" className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              PWA
            </TabsTrigger>
            <TabsTrigger value="splash" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Splash
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

                <div>
                  <Label htmlFor="logo_url">Logo URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="logo_url"
                      value={config.brand_identity.logo_url || ''}
                      onChange={(e) => updateConfig('brand_identity', 'logo_url', e.target.value)}
                      placeholder="https://example.com/logo.png"
                    />
                    <Button variant="outline">
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
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
                  <div>
                    <Label htmlFor="custom_domain">Custom Domain</Label>
                    <Input
                      id="custom_domain"
                      value={config.domain_config.custom_domain || ''}
                      onChange={(e) => updateConfig('domain_config', 'custom_domain', e.target.value)}
                      placeholder="app.yourcompany.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="subdomain">Subdomain</Label>
                    <Input
                      id="subdomain"
                      value={config.domain_config.subdomain || ''}
                      onChange={(e) => updateConfig('domain_config', 'subdomain', e.target.value)}
                      placeholder="yourcompany"
                    />
                  </div>
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
          </TabsContent>

          {/* Email Templates */}
          <TabsContent value="email" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Email Templates</CardTitle>
                <CardDescription>Customize email templates and branding</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="header_color">Header Color</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="color"
                        value={config.email_templates.header_color || '#3b82f6'}
                        onChange={(e) => updateConfig('email_templates', 'header_color', e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={config.email_templates.header_color || '#3b82f6'}
                        onChange={(e) => updateConfig('email_templates', 'header_color', e.target.value)}
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="footer_text">Footer Text</Label>
                    <Input
                      id="footer_text"
                      value={config.email_templates.footer_text || ''}
                      onChange={(e) => updateConfig('email_templates', 'footer_text', e.target.value)}
                      placeholder="Powered by KisanShaktiAI"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="welcome_template">Welcome Email Template</Label>
                  <Textarea
                    id="welcome_template"
                    value={config.email_templates.welcome_template || ''}
                    onChange={(e) => updateConfig('email_templates', 'welcome_template', e.target.value)}
                    placeholder="Welcome {{user_name}} to {{app_name}}! We're excited to have you on board."
                    rows={4}
                  />
                  {config.email_templates.welcome_template && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md">
                      <Label className="text-sm font-medium">Preview:</Label>
                      <div className="text-sm text-gray-600">
                        {generateEmailPreview(config.email_templates.welcome_template)}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="notification_template">Notification Email Template</Label>
                  <Textarea
                    id="notification_template"
                    value={config.email_templates.notification_template || ''}
                    onChange={(e) => updateConfig('email_templates', 'notification_template', e.target.value)}
                    placeholder="Hi {{user_name}}, you have a new notification from {{app_name}}."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mobile App Configuration */}
          <TabsContent value="mobile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Mobile App Configuration</CardTitle>
                <CardDescription>Configure app store listing and mobile app settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="app_name">App Name</Label>
                    <Input
                      id="app_name"
                      value={config.app_store_config.app_name || ''}
                      onChange={(e) => updateConfig('app_store_config', 'app_name', e.target.value)}
                      placeholder="KisanShakti"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={config.app_store_config.category || 'Agriculture'}
                      onChange={(e) => updateConfig('app_store_config', 'category', e.target.value)}
                    >
                      <option value="Agriculture">Agriculture</option>
                      <option value="Business">Business</option>
                      <option value="Productivity">Productivity</option>
                      <option value="Education">Education</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="app_description">App Description</Label>
                  <Textarea
                    id="app_description"
                    value={config.app_store_config.app_description || ''}
                    onChange={(e) => updateConfig('app_store_config', 'app_description', e.target.value)}
                    placeholder="A comprehensive agricultural management platform..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                  <Input
                    id="keywords"
                    value={(config.app_store_config.keywords || []).join(', ')}
                    onChange={(e) => updateConfig('app_store_config', 'keywords', e.target.value.split(',').map(k => k.trim()))}
                    placeholder="agriculture, farming, crops, soil, weather"
                  />
                </div>

                <div>
                  <Label htmlFor="app_icon">App Icon URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="app_icon"
                      value={config.app_store_config.app_icon || ''}
                      onChange={(e) => updateConfig('app_store_config', 'app_icon', e.target.value)}
                      placeholder="https://example.com/app-icon.png"
                    />
                    <Button variant="outline">
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
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

          {/* Splash Screens */}
          <TabsContent value="splash" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Splash Screens</CardTitle>
                <CardDescription>Configure loading screens for different devices</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="mobile_splash">Mobile Splash Screen</Label>
                  <div className="flex gap-2">
                    <Input
                      id="mobile_splash"
                      value={config.splash_screens.mobile_splash || ''}
                      onChange={(e) => updateConfig('splash_screens', 'mobile_splash', e.target.value)}
                      placeholder="https://example.com/mobile-splash.png"
                    />
                    <Button variant="outline">
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="tablet_splash">Tablet Splash Screen</Label>
                  <div className="flex gap-2">
                    <Input
                      id="tablet_splash"
                      value={config.splash_screens.tablet_splash || ''}
                      onChange={(e) => updateConfig('splash_screens', 'tablet_splash', e.target.value)}
                      placeholder="https://example.com/tablet-splash.png"
                    />
                    <Button variant="outline">
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="desktop_splash">Desktop Splash Screen</Label>
                  <div className="flex gap-2">
                    <Input
                      id="desktop_splash"
                      value={config.splash_screens.desktop_splash || ''}
                      onChange={(e) => updateConfig('splash_screens', 'desktop_splash', e.target.value)}
                      placeholder="https://example.com/desktop-splash.png"
                    />
                    <Button variant="outline">
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="loading_animation">Loading Animation URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="loading_animation"
                      value={config.splash_screens.loading_animation || ''}
                      onChange={(e) => updateConfig('splash_screens', 'loading_animation', e.target.value)}
                      placeholder="https://example.com/loading.gif"
                    />
                    <Button variant="outline">
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

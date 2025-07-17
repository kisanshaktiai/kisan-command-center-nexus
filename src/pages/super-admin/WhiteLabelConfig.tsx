
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Palette, Globe, Mail, Smartphone, Monitor, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WhiteLabelConfig {
  id: string;
  tenant_id: string;
  brand_identity: any;
  domain_config: any;
  email_templates: any;
  app_store_config: any;
  pwa_config: any;
  splash_screens: any;
  tenant_name?: string;
}

export default function WhiteLabelConfig() {
  const [configs, setConfigs] = useState<WhiteLabelConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<WhiteLabelConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchWhiteLabelConfigs();
  }, []);

  const fetchWhiteLabelConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('white_label_configs')
        .select(`
          *,
          tenants:tenant_id (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedConfigs = data?.map(config => ({
        ...config,
        tenant_name: config.tenants?.name || 'Unknown Tenant'
      })) || [];

      setConfigs(formattedConfigs);
      if (formattedConfigs.length > 0) {
        setSelectedConfig(formattedConfigs[0]);
      }
    } catch (error) {
      console.error('Error fetching white-label configs:', error);
      toast.error('Failed to load white-label configurations');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (section: string, data: any) => {
    if (!selectedConfig) return;

    setSaving(true);
    try {
      const updateData = {
        [section]: { ...selectedConfig[section as keyof WhiteLabelConfig], ...data }
      };

      const { error } = await supabase
        .from('white_label_configs')
        .update(updateData)
        .eq('id', selectedConfig.id);

      if (error) throw error;

      setSelectedConfig({ ...selectedConfig, ...updateData });
      toast.success('Configuration updated successfully');
    } catch (error) {
      console.error('Error updating configuration:', error);
      toast.error('Failed to update configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">White-Label Configuration</h1>
          <p className="text-muted-foreground">
            Customize branding and appearance for tenant applications
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Tenant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {configs.map((config) => (
              <div
                key={config.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedConfig?.id === config.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
                onClick={() => setSelectedConfig(config)}
              >
                <div className="font-medium">{config.tenant_name}</div>
                <div className="text-sm opacity-70">
                  {config.brand_identity?.app_name || 'No app name set'}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="col-span-3">
          {selectedConfig ? (
            <Tabs defaultValue="branding" className="space-y-4">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="branding">Branding</TabsTrigger>
                <TabsTrigger value="domain">Domain</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="mobile">Mobile</TabsTrigger>
                <TabsTrigger value="pwa">PWA</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="branding">
                <BrandingConfiguration 
                  config={selectedConfig.brand_identity || {}}
                  onUpdate={(data) => updateConfig('brand_identity', data)}
                  saving={saving}
                />
              </TabsContent>

              <TabsContent value="domain">
                <DomainConfiguration 
                  config={selectedConfig.domain_config || {}}
                  onUpdate={(data) => updateConfig('domain_config', data)}
                  saving={saving}
                />
              </TabsContent>

              <TabsContent value="email">
                <EmailTemplateConfiguration 
                  config={selectedConfig.email_templates || {}}
                  onUpdate={(data) => updateConfig('email_templates', data)}
                  saving={saving}
                />
              </TabsContent>

              <TabsContent value="mobile">
                <MobileAppConfiguration 
                  config={selectedConfig.app_store_config || {}}
                  onUpdate={(data) => updateConfig('app_store_config', data)}
                  saving={saving}
                />
              </TabsContent>

              <TabsContent value="pwa">
                <PWAConfiguration 
                  config={selectedConfig.pwa_config || {}}
                  onUpdate={(data) => updateConfig('pwa_config', data)}
                  saving={saving}
                />
              </TabsContent>

              <TabsContent value="preview">
                <ConfigurationPreview config={selectedConfig} />
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Palette className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No Configuration Selected</h3>
                  <p className="text-muted-foreground">
                    Select a tenant to view and edit their white-label configuration
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function BrandingConfiguration({ config, onUpdate, saving }: {
  config: any;
  onUpdate: (data: any) => void;
  saving: boolean;
}) {
  const [formData, setFormData] = useState({
    app_name: config.app_name || '',
    app_tagline: config.app_tagline || '',
    logo_url: config.logo_url || '',
    primary_color: config.primary_color || '#007bff',
    secondary_color: config.secondary_color || '#6c757d',
    accent_color: config.accent_color || '#28a745',
    font_family: config.font_family || 'Inter',
    ...config
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Palette className="h-5 w-5" />
          <span>Brand Identity</span>
        </CardTitle>
        <CardDescription>
          Configure the visual identity and branding elements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="app_name">Application Name</Label>
              <Input
                id="app_name"
                value={formData.app_name}
                onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
                placeholder="Your App Name"
              />
            </div>
            <div>
              <Label htmlFor="app_tagline">Tagline</Label>
              <Input
                id="app_tagline"
                value={formData.app_tagline}
                onChange={(e) => setFormData({ ...formData, app_tagline: e.target.value })}
                placeholder="Your app's tagline"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="logo_url">Logo URL</Label>
            <div className="flex space-x-2">
              <Input
                id="logo_url"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                placeholder="https://example.com/logo.png"
              />
              <Button type="button" variant="outline">
                <Upload className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="primary_color">Primary Color</Label>
              <div className="flex space-x-2">
                <Input
                  id="primary_color"
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="w-16"
                />
                <Input
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  placeholder="#007bff"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="secondary_color">Secondary Color</Label>
              <div className="flex space-x-2">
                <Input
                  id="secondary_color"
                  type="color"
                  value={formData.secondary_color}
                  onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                  className="w-16"
                />
                <Input
                  value={formData.secondary_color}
                  onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                  placeholder="#6c757d"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="accent_color">Accent Color</Label>
              <div className="flex space-x-2">
                <Input
                  id="accent_color"
                  type="color"
                  value={formData.accent_color}
                  onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                  className="w-16"
                />
                <Input
                  value={formData.accent_color}
                  onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                  placeholder="#28a745"
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="font_family">Font Family</Label>
            <Select 
              value={formData.font_family} 
              onValueChange={(value) => setFormData({ ...formData, font_family: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Inter">Inter</SelectItem>
                <SelectItem value="Roboto">Roboto</SelectItem>
                <SelectItem value="Open Sans">Open Sans</SelectItem>
                <SelectItem value="Lato">Lato</SelectItem>
                <SelectItem value="Montserrat">Montserrat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Branding'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function DomainConfiguration({ config, onUpdate, saving }: {
  config: any;
  onUpdate: (data: any) => void;
  saving: boolean;
}) {
  const [formData, setFormData] = useState({
    custom_domain: config.custom_domain || '',
    subdomain: config.subdomain || '',
    ssl_enabled: config.ssl_enabled || true,
    redirect_www: config.redirect_www || true,
    ...config
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Globe className="h-5 w-5" />
          <span>Domain Configuration</span>
        </CardTitle>
        <CardDescription>
          Set up custom domains and SSL configuration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="custom_domain">Custom Domain</Label>
            <Input
              id="custom_domain"
              value={formData.custom_domain}
              onChange={(e) => setFormData({ ...formData, custom_domain: e.target.value })}
              placeholder="app.yourcompany.com"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Point your domain's CNAME to our servers
            </p>
          </div>

          <div>
            <Label htmlFor="subdomain">Subdomain</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="subdomain"
                value={formData.subdomain}
                onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                placeholder="yourcompany"
              />
              <span className="text-muted-foreground">.kisanshakti.app</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="ssl_enabled">SSL Certificate</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically provision SSL certificates
                </p>
              </div>
              <Switch
                id="ssl_enabled"
                checked={formData.ssl_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, ssl_enabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="redirect_www">Redirect WWW</Label>
                <p className="text-sm text-muted-foreground">
                  Redirect www.domain.com to domain.com
                </p>
              </div>
              <Switch
                id="redirect_www"
                checked={formData.redirect_www}
                onCheckedChange={(checked) => setFormData({ ...formData, redirect_www: checked })}
              />
            </div>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Domain Settings'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function EmailTemplateConfiguration({ config, onUpdate, saving }: {
  config: any;
  onUpdate: (data: any) => void;
  saving: boolean;
}) {
  const [selectedTemplate, setSelectedTemplate] = useState('welcome');
  const [formData, setFormData] = useState({
    welcome: config.welcome || {
      subject: 'Welcome to {{app_name}}',
      html: '<h1>Welcome {{user_name}}!</h1><p>Thank you for joining {{app_name}}.</p>'
    },
    reset_password: config.reset_password || {
      subject: 'Reset your password',
      html: '<h1>Password Reset</h1><p>Click the link below to reset your password.</p>'
    },
    ...config
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Mail className="h-5 w-5" />
          <span>Email Templates</span>
        </CardTitle>
        <CardDescription>
          Customize email templates with your branding
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label>Select Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="welcome">Welcome Email</SelectItem>
                <SelectItem value="reset_password">Password Reset</SelectItem>
                <SelectItem value="invitation">Team Invitation</SelectItem>
                <SelectItem value="notification">Notification</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="subject">Subject Line</Label>
            <Input
              id="subject"
              value={formData[selectedTemplate]?.subject || ''}
              onChange={(e) => setFormData({
                ...formData,
                [selectedTemplate]: {
                  ...formData[selectedTemplate],
                  subject: e.target.value
                }
              })}
              placeholder="Email subject"
            />
          </div>

          <div>
            <Label htmlFor="html">HTML Content</Label>
            <Textarea
              id="html"
              value={formData[selectedTemplate]?.html || ''}
              onChange={(e) => setFormData({
                ...formData,
                [selectedTemplate]: {
                  ...formData[selectedTemplate],
                  html: e.target.value
                }
              })}
              placeholder="HTML email content"
              rows={10}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Use variables like {{user_name}}, {{app_name}}, {{company_name}}
            </p>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Email Template'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function MobileAppConfiguration({ config, onUpdate, saving }: {
  config: any;
  onUpdate: (data: any) => void;
  saving: boolean;
}) {
  const [formData, setFormData] = useState({
    app_name: config.app_name || '',
    app_description: config.app_description || '',
    app_icon_url: config.app_icon_url || '',
    splash_screen_url: config.splash_screen_url || '',
    app_store_url: config.app_store_url || '',
    play_store_url: config.play_store_url || '',
    ...config
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Smartphone className="h-5 w-5" />
          <span>Mobile App Configuration</span>
        </CardTitle>
        <CardDescription>
          Configure mobile app branding and store listings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="app_name">App Name</Label>
              <Input
                id="app_name"
                value={formData.app_name}
                onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
                placeholder="Your Mobile App"
              />
            </div>
            <div>
              <Label htmlFor="app_description">App Description</Label>
              <Input
                id="app_description"
                value={formData.app_description}
                onChange={(e) => setFormData({ ...formData, app_description: e.target.value })}
                placeholder="App description for stores"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="app_icon_url">App Icon URL</Label>
              <Input
                id="app_icon_url"
                value={formData.app_icon_url}
                onChange={(e) => setFormData({ ...formData, app_icon_url: e.target.value })}
                placeholder="https://example.com/icon.png"
              />
            </div>
            <div>
              <Label htmlFor="splash_screen_url">Splash Screen URL</Label>
              <Input
                id="splash_screen_url"
                value={formData.splash_screen_url}
                onChange={(e) => setFormData({ ...formData, splash_screen_url: e.target.value })}
                placeholder="https://example.com/splash.png"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="app_store_url">App Store URL</Label>
              <Input
                id="app_store_url"
                value={formData.app_store_url}
                onChange={(e) => setFormData({ ...formData, app_store_url: e.target.value })}
                placeholder="https://apps.apple.com/..."
              />
            </div>
            <div>
              <Label htmlFor="play_store_url">Play Store URL</Label>
              <Input
                id="play_store_url"
                value={formData.play_store_url}
                onChange={(e) => setFormData({ ...formData, play_store_url: e.target.value })}
                placeholder="https://play.google.com/..."
              />
            </div>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Mobile Settings'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PWAConfiguration({ config, onUpdate, saving }: {
  config: any;
  onUpdate: (data: any) => void;
  saving: boolean;
}) {
  const [formData, setFormData] = useState({
    name: config.name || '',
    short_name: config.short_name || '',
    description: config.description || '',
    theme_color: config.theme_color || '#007bff',
    background_color: config.background_color || '#ffffff',
    display: config.display || 'standalone',
    orientation: config.orientation || 'portrait',
    ...config
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Monitor className="h-5 w-5" />
          <span>PWA Configuration</span>
        </CardTitle>
        <CardDescription>
          Configure Progressive Web App settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">App Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your Progressive Web App"
              />
            </div>
            <div>
              <Label htmlFor="short_name">Short Name</Label>
              <Input
                id="short_name"
                value={formData.short_name}
                onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                placeholder="YourApp"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="App description for PWA manifest"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="theme_color">Theme Color</Label>
              <div className="flex space-x-2">
                <Input
                  id="theme_color"
                  type="color"
                  value={formData.theme_color}
                  onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })}
                  className="w-16"
                />
                <Input
                  value={formData.theme_color}
                  onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })}
                  placeholder="#007bff"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="background_color">Background Color</Label>
              <div className="flex space-x-2">
                <Input
                  id="background_color"
                  type="color"
                  value={formData.background_color}
                  onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                  className="w-16"
                />
                <Input
                  value={formData.background_color}
                  onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                  placeholder="#ffffff"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="display">Display Mode</Label>
              <Select 
                value={formData.display} 
                onValueChange={(value) => setFormData({ ...formData, display: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standalone">Standalone</SelectItem>
                  <SelectItem value="fullscreen">Fullscreen</SelectItem>
                  <SelectItem value="minimal-ui">Minimal UI</SelectItem>
                  <SelectItem value="browser">Browser</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="orientation">Orientation</Label>
              <Select 
                value={formData.orientation} 
                onValueChange={(value) => setFormData({ ...formData, orientation: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">Portrait</SelectItem>
                  <SelectItem value="landscape">Landscape</SelectItem>
                  <SelectItem value="any">Any</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save PWA Settings'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ConfigurationPreview({ config }: { config: WhiteLabelConfig }) {
  const branding = config.brand_identity || {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuration Preview</CardTitle>
        <CardDescription>
          Preview how your white-label configuration will look
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="border rounded-lg p-6" style={{
            backgroundColor: branding.background_color || '#ffffff',
            color: branding.text_color || '#000000'
          }}>
            <div className="flex items-center space-x-4 mb-6">
              {branding.logo_url && (
                <img 
                  src={branding.logo_url} 
                  alt="Logo" 
                  className="h-12 w-12 object-contain"
                />
              )}
              <div>
                <h2 
                  className="text-2xl font-bold"
                  style={{ color: branding.primary_color || '#007bff' }}
                >
                  {branding.app_name || 'Your App Name'}
                </h2>
                <p className="text-muted-foreground">
                  {branding.app_tagline || 'Your app tagline'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Button 
                style={{ 
                  backgroundColor: branding.primary_color || '#007bff',
                  color: '#ffffff'
                }}
              >
                Primary Button
              </Button>
              <Button 
                variant="outline"
                style={{ 
                  borderColor: branding.secondary_color || '#6c757d',
                  color: branding.secondary_color || '#6c757d'
                }}
              >
                Secondary Button
              </Button>
              <Button 
                style={{ 
                  backgroundColor: branding.accent_color || '#28a745',
                  color: '#ffffff'
                }}
              >
                Accent Button
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Brand Colors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: branding.primary_color || '#007bff' }}
                  />
                  <span>Primary: {branding.primary_color || '#007bff'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: branding.secondary_color || '#6c757d' }}
                  />
                  <span>Secondary: {branding.secondary_color || '#6c757d'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: branding.accent_color || '#28a745' }}
                  />
                  <span>Accent: {branding.accent_color || '#28a745'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Domain Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4" />
                  <span>
                    {config.domain_config?.custom_domain || 'No custom domain'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={config.domain_config?.ssl_enabled ? 'default' : 'secondary'}>
                    {config.domain_config?.ssl_enabled ? 'SSL Enabled' : 'SSL Disabled'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

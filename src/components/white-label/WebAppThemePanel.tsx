import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Palette, 
  Layout, 
  Type, 
  Box, 
  Save,
  RefreshCw,
  Eye
} from 'lucide-react';

interface WebAppThemePanelProps {
  tenantId: string | null;
  onThemeChange?: (theme: any) => void;
}

export function WebAppThemePanel({ tenantId, onThemeChange }: WebAppThemePanelProps) {
  const [theme, setTheme] = useState<any>({
    primary_color: '#10B981',
    secondary_color: '#065F46',
    accent_color: '#F59E0B',
    text_color: '#1F2937',
    background_color: '#FFFFFF',
    app_name: '',
    logo_url: '',
    font_family: 'Inter',
    button_radius: 8,
    card_radius: 12,
    enable_animations: true,
    layout_style: 'sidebar',
    theme_mode: 'light'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop');

  // Load tenant branding data
  useEffect(() => {
    if (tenantId) {
      loadTenantBranding();
    }
  }, [tenantId]);

  const loadTenantBranding = async () => {
    if (!tenantId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenant_branding')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        // Extract additional settings from the settings JSON field
        const settings = data.settings as any || {};
        
        setTheme({
          primary_color: data.primary_color || '#10B981',
          secondary_color: data.secondary_color || '#065F46',
          accent_color: data.accent_color || '#F59E0B',
          text_color: data.text_color || '#1F2937',
          background_color: data.background_color || '#FFFFFF',
          app_name: data.app_name || '',
          logo_url: data.logo_url || '',
          font_family: data.font_family || 'Inter',
          button_radius: settings.button_radius || 8,
          card_radius: settings.card_radius || 12,
          enable_animations: settings.enable_animations !== false,
          layout_style: settings.layout_style || 'sidebar',
          theme_mode: settings.theme_mode || 'light'
        });
      }
    } catch (error) {
      console.error('Error loading tenant branding:', error);
      toast({
        title: 'Error',
        description: 'Failed to load branding settings',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveTenantBranding = async () => {
    if (!tenantId) {
      toast({
        title: 'Error',
        description: 'Please select a tenant first',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      // Separate settings fields from direct columns
      const { button_radius, card_radius, enable_animations, layout_style, theme_mode, ...directFields } = theme;
      
      const { error } = await supabase
        .from('tenant_branding')
        .upsert({
          tenant_id: tenantId,
          ...directFields,
          settings: {
            button_radius,
            card_radius,
            enable_animations,
            layout_style,
            theme_mode
          },
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Web app theme saved successfully'
      });
      
      if (onThemeChange) {
        onThemeChange(theme);
      }
    } catch (error) {
      console.error('Error saving tenant branding:', error);
      toast({
        title: 'Error',
        description: 'Failed to save branding settings',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleColorChange = (field: string, value: string) => {
    setTheme((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const presetThemes = [
    {
      name: 'Professional',
      colors: {
        primary_color: '#3B82F6',
        secondary_color: '#1E40AF',
        accent_color: '#F59E0B',
        text_color: '#1F2937',
        background_color: '#FFFFFF'
      }
    },
    {
      name: 'Nature',
      colors: {
        primary_color: '#10B981',
        secondary_color: '#065F46',
        accent_color: '#F59E0B',
        text_color: '#1F2937',
        background_color: '#F7FEE7'
      }
    },
    {
      name: 'Dark Mode',
      colors: {
        primary_color: '#8B5CF6',
        secondary_color: '#6D28D9',
        accent_color: '#EC4899',
        text_color: '#F9FAFB',
        background_color: '#111827'
      }
    },
    {
      name: 'Minimal',
      colors: {
        primary_color: '#000000',
        secondary_color: '#4B5563',
        accent_color: '#EF4444',
        text_color: '#111827',
        background_color: '#FFFFFF'
      }
    }
  ];

  const applyPresetTheme = (preset: typeof presetThemes[0]) => {
    setTheme((prev: any) => ({
      ...prev,
      ...preset.colors
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Web App Theme Configuration
          </CardTitle>
          <CardDescription>
            Configure the visual appearance of your web application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="colors" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="colors">
                <Palette className="h-4 w-4 mr-2" />
                Colors
              </TabsTrigger>
              <TabsTrigger value="typography">
                <Type className="h-4 w-4 mr-2" />
                Typography
              </TabsTrigger>
              <TabsTrigger value="layout">
                <Layout className="h-4 w-4 mr-2" />
                Layout
              </TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="colors" className="space-y-6">
              {/* Preset Themes */}
              <div className="space-y-3">
                <Label>Quick Start Themes</Label>
                <div className="grid grid-cols-2 gap-3">
                  {presetThemes.map((preset) => (
                    <Button
                      key={preset.name}
                      variant="outline"
                      className="justify-start"
                      onClick={() => applyPresetTheme(preset)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div 
                            className="w-4 h-4 rounded" 
                            style={{ backgroundColor: preset.colors.primary_color }}
                          />
                          <div 
                            className="w-4 h-4 rounded" 
                            style={{ backgroundColor: preset.colors.secondary_color }}
                          />
                          <div 
                            className="w-4 h-4 rounded" 
                            style={{ backgroundColor: preset.colors.accent_color }}
                          />
                        </div>
                        <span>{preset.name}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Color Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primary"
                      type="color"
                      value={theme.primary_color}
                      onChange={(e) => handleColorChange('primary_color', e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={theme.primary_color}
                      onChange={(e) => handleColorChange('primary_color', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondary">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondary"
                      type="color"
                      value={theme.secondary_color}
                      onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={theme.secondary_color}
                      onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accent">Accent Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accent"
                      type="color"
                      value={theme.accent_color}
                      onChange={(e) => handleColorChange('accent_color', e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={theme.accent_color}
                      onChange={(e) => handleColorChange('accent_color', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="background">Background Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="background"
                      type="color"
                      value={theme.background_color}
                      onChange={(e) => handleColorChange('background_color', e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={theme.background_color}
                      onChange={(e) => handleColorChange('background_color', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="typography" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="font">Font Family</Label>
                  <select
                    id="font"
                    value={theme.font_family}
                    onChange={(e) => setTheme({ ...theme, font_family: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="Inter">Inter</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Open Sans">Open Sans</option>
                    <option value="Lato">Lato</option>
                    <option value="Poppins">Poppins</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="text-color">Text Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="text-color"
                      type="color"
                      value={theme.text_color}
                      onChange={(e) => handleColorChange('text_color', e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={theme.text_color}
                      onChange={(e) => handleColorChange('text_color', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="layout" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Button Border Radius</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[theme.button_radius]}
                      onValueChange={(value) => setTheme({ ...theme, button_radius: value[0] })}
                      max={20}
                      step={1}
                      className="flex-1"
                    />
                    <span className="w-12 text-sm">{theme.button_radius}px</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Card Border Radius</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[theme.card_radius]}
                      onValueChange={(value) => setTheme({ ...theme, card_radius: value[0] })}
                      max={24}
                      step={1}
                      className="flex-1"
                    />
                    <span className="w-12 text-sm">{theme.card_radius}px</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="animations">Enable Animations</Label>
                  <Switch
                    id="animations"
                    checked={theme.enable_animations}
                    onCheckedChange={(checked) => setTheme({ ...theme, enable_animations: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Layout Style</Label>
                  <select
                    value={theme.layout_style}
                    onChange={(e) => setTheme({ ...theme, layout_style: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="sidebar">Sidebar Navigation</option>
                    <option value="topbar">Top Bar Navigation</option>
                    <option value="combined">Combined Navigation</option>
                  </select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <div className="border rounded-lg p-6" style={{
                backgroundColor: theme.background_color,
                fontFamily: theme.font_family
              }}>
                <div className="space-y-4">
                  <h3 style={{ color: theme.primary_color }} className="text-2xl font-bold">
                    {theme.app_name || 'Your App Name'}
                  </h3>
                  <p style={{ color: theme.text_color }}>
                    This is a preview of your web app theme settings.
                  </p>
                  <div className="flex gap-3">
                    <button 
                      style={{
                        backgroundColor: theme.primary_color,
                        color: '#FFFFFF',
                        borderRadius: `${theme.button_radius}px`,
                        padding: '8px 16px'
                      }}
                    >
                      Primary Button
                    </button>
                    <button 
                      style={{
                        backgroundColor: theme.secondary_color,
                        color: '#FFFFFF',
                        borderRadius: `${theme.button_radius}px`,
                        padding: '8px 16px'
                      }}
                    >
                      Secondary Button
                    </button>
                    <button 
                      style={{
                        backgroundColor: theme.accent_color,
                        color: '#FFFFFF',
                        borderRadius: `${theme.button_radius}px`,
                        padding: '8px 16px'
                      }}
                    >
                      Accent Button
                    </button>
                  </div>
                  <div 
                    style={{
                      borderRadius: `${theme.card_radius}px`,
                      border: '1px solid #E5E7EB',
                      padding: '16px',
                      backgroundColor: '#FFFFFF'
                    }}
                  >
                    <h4 style={{ color: theme.primary_color }} className="font-semibold mb-2">
                      Card Component
                    </h4>
                    <p style={{ color: theme.text_color }}>
                      This is how your card components will look with the current theme settings.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={loadTenantBranding}
              disabled={isLoading || !tenantId}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              onClick={saveTenantBranding}
              disabled={isSaving || !tenantId}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Theme
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
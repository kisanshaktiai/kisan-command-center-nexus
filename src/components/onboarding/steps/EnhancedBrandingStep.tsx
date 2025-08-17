
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Palette, Smartphone, Monitor, Upload, Wand2, Eye, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';

interface BrandingPreset {
  id: string;
  name: string;
  description: string;
  category: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    primary: string;
    secondary: string;
  };
}

interface EnhancedBrandingStepProps {
  tenantId: string;
  onComplete: (data: any) => void;
  data: any;
  onDataChange: (data: any) => void;
}

export const EnhancedBrandingStep: React.FC<EnhancedBrandingStepProps> = ({
  tenantId,
  onComplete,
  data,
  onDataChange
}) => {
  const [brandingData, setBrandingData] = useState({
    logo_url: data.logo_url || '',
    primary_color: data.primary_color || '#16a34a',
    secondary_color: data.secondary_color || '#65a30d',
    accent_color: data.accent_color || '#84cc16',
    background_color: data.background_color || '#ffffff',
    text_color: data.text_color || '#1f2937',
    font_family: data.font_family || 'Inter',
    enable_dark_mode: data.enable_dark_mode || false,
    custom_css: data.custom_css || '',
    ...data
  });

  const [presets, setPresets] = useState<BrandingPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [isUploading, setIsUploading] = useState(false);
  const { showSuccess, showError } = useNotifications();

  useEffect(() => {
    loadBrandingPresets();
  }, []);

  const loadBrandingPresets = async () => {
    try {
      const { data: presetsData, error } = await supabase
        .from('branding_presets')
        .select('*')
        .eq('is_system_preset', true)
        .order('category, name');

      if (error) throw error;

      const formattedPresets = presetsData.map(preset => ({
        ...preset,
        colors: typeof preset.colors === 'string' ? JSON.parse(preset.colors) : preset.colors,
        fonts: typeof preset.fonts === 'string' ? JSON.parse(preset.fonts) : preset.fonts,
      }));

      setPresets(formattedPresets);
    } catch (error) {
      console.error('Error loading presets:', error);
      showError('Failed to load branding presets');
    }
  };

  const handlePresetSelect = (preset: BrandingPreset) => {
    const newBrandingData = {
      ...brandingData,
      primary_color: preset.colors.primary,
      secondary_color: preset.colors.secondary,
      accent_color: preset.colors.accent,
      background_color: preset.colors.background,
      text_color: preset.colors.text,
      font_family: preset.fonts.primary,
    };
    
    setBrandingData(newBrandingData);
    onDataChange(newBrandingData);
    setSelectedPreset(preset.id);
    showSuccess(`Applied ${preset.name} theme`);
  };

  const handleColorChange = (colorKey: string, value: string) => {
    const newData = { ...brandingData, [colorKey]: value };
    setBrandingData(newData);
    onDataChange(newData);
    setSelectedPreset(null); // Clear preset selection when manually changing colors
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showError('Logo file size must be less than 2MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `tenant-${tenantId}/logo-${Date.now()}.${file.name.split('.').pop()}`;
      
      const { error: uploadError } = await supabase.storage
        .from('tenant-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tenant-assets')
        .getPublicUrl(fileName);

      const newData = { ...brandingData, logo_url: publicUrl };
      setBrandingData(newData);
      onDataChange(newData);
      showSuccess('Logo uploaded successfully');
    } catch (error) {
      console.error('Error uploading logo:', error);
      showError('Failed to upload logo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Update tenant branding
      const { error } = await supabase
        .from('tenant_branding')
        .upsert({
          tenant_id: tenantId,
          logo_url: brandingData.logo_url,
          primary_color: brandingData.primary_color,
          secondary_color: brandingData.secondary_color,
          accent_color: brandingData.accent_color,
          background_color: brandingData.background_color,
          text_color: brandingData.text_color,
          font_family: brandingData.font_family,
          custom_css: brandingData.custom_css,
          settings: {
            enable_dark_mode: brandingData.enable_dark_mode,
            selected_preset: selectedPreset
          }
        });

      if (error) throw error;

      showSuccess('Branding settings saved successfully');
      onComplete(brandingData);
    } catch (error) {
      console.error('Error saving branding:', error);
      showError('Failed to save branding settings');
    }
  };

  const renderMobilePreview = () => (
    <div className="relative mx-auto" style={{ width: '280px', height: '560px' }}>
      {/* Phone Frame */}
      <div className="absolute inset-0 bg-gray-900 rounded-[2.5rem] p-2">
        <div className="relative w-full h-full bg-white rounded-[2rem] overflow-hidden shadow-inner">
          {/* Status Bar */}
          <div className="h-6 bg-black flex items-center justify-between px-6 text-white text-xs">
            <span>9:41</span>
            <div className="flex gap-1">
              <div className="w-4 h-2 bg-white rounded-sm"></div>
              <div className="w-6 h-2 bg-white rounded-sm"></div>
            </div>
          </div>
          
          {/* App Content */}
          <div className="flex-1 p-4" style={{ backgroundColor: brandingData.background_color }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {brandingData.logo_url ? (
                  <img src={brandingData.logo_url} alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: brandingData.primary_color }}
                  >
                    KS
                  </div>
                )}
                <h1 className="text-lg font-bold" style={{ color: brandingData.text_color }}>
                  KisanShakti
                </h1>
              </div>
              <div className="w-8 h-8 rounded-full bg-gray-200"></div>
            </div>

            {/* Dashboard Cards */}
            <div className="space-y-4">
              <div 
                className="p-4 rounded-xl shadow-sm"
                style={{ backgroundColor: brandingData.primary_color }}
              >
                <h3 className="text-white font-semibold mb-2">Weather Today</h3>
                <div className="flex items-center gap-2">
                  <span className="text-2xl text-white">28°C</span>
                  <span className="text-white/80 text-sm">Sunny</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border">
                <h3 className="font-semibold mb-2" style={{ color: brandingData.text_color }}>
                  My Farms
                </h3>
                <div className="flex gap-2">
                  <div 
                    className="px-3 py-1 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: brandingData.secondary_color }}
                  >
                    Wheat
                  </div>
                  <div 
                    className="px-3 py-1 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: brandingData.accent_color }}
                  >
                    Rice
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border">
                <h3 className="font-semibold mb-2" style={{ color: brandingData.text_color }}>
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {['Add Crop', 'View Reports'].map((action) => (
                    <button
                      key={action}
                      className="p-2 rounded-lg text-sm font-medium text-white"
                      style={{ backgroundColor: brandingData.primary_color }}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDesktopPreview = () => (
    <div className="w-full h-80 bg-gray-100 rounded-lg overflow-hidden shadow-lg">
      <div className="h-8 bg-gray-800 flex items-center px-4">
        <div className="flex gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        </div>
        <div className="flex-1 text-center text-white text-sm">KisanShakti Dashboard</div>
      </div>
      <div className="flex h-full">
        <div className="w-64 border-r" style={{ backgroundColor: brandingData.background_color }}>
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              {brandingData.logo_url ? (
                <img src={brandingData.logo_url} alt="Logo" className="w-8 h-8 rounded object-cover" />
              ) : (
                <div 
                  className="w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: brandingData.primary_color }}
                >
                  KS
                </div>
              )}
              <span className="font-semibold" style={{ color: brandingData.text_color }}>
                KisanShakti
              </span>
            </div>
          </div>
          <nav className="p-4">
            {['Dashboard', 'Farms', 'Weather', 'Reports'].map((item) => (
              <div 
                key={item}
                className="py-2 px-3 rounded-lg mb-2 cursor-pointer"
                style={{ 
                  backgroundColor: item === 'Dashboard' ? brandingData.primary_color : 'transparent',
                  color: item === 'Dashboard' ? 'white' : brandingData.text_color
                }}
              >
                {item}
              </div>
            ))}
          </nav>
        </div>
        <div className="flex-1 p-6" style={{ backgroundColor: brandingData.background_color }}>
          <h1 className="text-2xl font-bold mb-6" style={{ color: brandingData.text_color }}>
            Dashboard Overview
          </h1>
          <div className="grid grid-cols-3 gap-4">
            {['Total Farms', 'Active Crops', 'Weather Alerts'].map((metric, index) => (
              <div key={metric} className="bg-white p-4 rounded-lg shadow-sm border">
                <h3 className="text-sm font-medium text-gray-600">{metric}</h3>
                <div className="text-2xl font-bold mt-2" style={{ color: brandingData.primary_color }}>
                  {[12, 8, 3][index]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const groupedPresets = presets.reduce((acc, preset) => {
    if (!acc[preset.category]) acc[preset.category] = [];
    acc[preset.category].push(preset);
    return acc;
  }, {} as Record<string, BrandingPreset[]>);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Branding & Customization</h3>
        <p className="text-muted-foreground">
          Customize your tenant's appearance with logo, colors, and themes
        </p>
      </div>

      <Tabs defaultValue="presets" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="presets" className="flex items-center gap-2">
            <Wand2 className="w-4 h-4" />
            Quick Themes
          </TabsTrigger>
          <TabsTrigger value="colors" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Colors
          </TabsTrigger>
          <TabsTrigger value="logo" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Logo & Assets
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Live Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="presets" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Theme Presets</CardTitle>
              <CardDescription>
                Choose from professionally designed themes tailored for different industries
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.entries(groupedPresets).map(([category, categoryPresets]) => (
                <div key={category} className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-3">
                    {category}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryPresets.map((preset) => (
                      <div
                        key={preset.id}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                          selectedPreset === preset.id ? 'border-primary bg-primary/5' : 'border-gray-200'
                        }`}
                        onClick={() => handlePresetSelect(preset)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium">{preset.name}</h5>
                          {selectedPreset === preset.id && (
                            <Badge variant="default" className="text-xs">Active</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{preset.description}</p>
                        <div className="flex gap-2">
                          {Object.entries(preset.colors).slice(0, 4).map(([key, color]) => (
                            <div
                              key={key}
                              className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                              style={{ backgroundColor: color }}
                              title={key}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="colors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Color Customization</CardTitle>
              <CardDescription>
                Fine-tune your brand colors for a perfect match
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { key: 'primary_color', label: 'Primary Color', description: 'Main brand color for buttons and highlights' },
                  { key: 'secondary_color', label: 'Secondary Color', description: 'Supporting brand color' },
                  { key: 'accent_color', label: 'Accent Color', description: 'For badges and special elements' },
                  { key: 'background_color', label: 'Background Color', description: 'Main background color' },
                  { key: 'text_color', label: 'Text Color', description: 'Primary text color' },
                ].map(({ key, label, description }) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={key}>{label}</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        id={key}
                        value={brandingData[key]}
                        onChange={(e) => handleColorChange(key, e.target.value)}
                        className="w-16 h-10 rounded-lg border border-gray-300 cursor-pointer"
                      />
                      <div className="flex-1">
                        <Input
                          value={brandingData[key]}
                          onChange={(e) => handleColorChange(key, e.target.value)}
                          placeholder="#000000"
                          className="font-mono"
                        />
                        <p className="text-xs text-gray-500 mt-1">{description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Logo & Brand Assets</CardTitle>
              <CardDescription>
                Upload your logo and manage brand assets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="logo-upload">Company Logo</Label>
                <div className="mt-2 flex items-center gap-4">
                  {brandingData.logo_url ? (
                    <img 
                      src={brandingData.logo_url} 
                      alt="Current logo" 
                      className="w-16 h-16 rounded-lg object-cover border"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <Upload className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={isUploading}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Recommended: 512x512px, PNG or JPG, max 2MB
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="font-family">Font Family</Label>
                <select
                  id="font-family"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  value={brandingData.font_family}
                  onChange={(e) => handleColorChange('font_family', e.target.value)}
                >
                  <option value="Inter">Inter (Default)</option>
                  <option value="Poppins">Poppins</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Lato">Lato</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="dark-mode">Enable Dark Mode Support</Label>
                  <p className="text-sm text-gray-500">Allow users to switch to dark theme</p>
                </div>
                <Switch
                  id="dark-mode"
                  checked={brandingData.enable_dark_mode}
                  onCheckedChange={(checked) => handleColorChange('enable_dark_mode', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Live Preview
              </CardTitle>
              <CardDescription>
                See how your branding will look across different devices
              </CardDescription>
              <div className="flex gap-2">
                <Button
                  variant={previewDevice === 'mobile' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewDevice('mobile')}
                  className="flex items-center gap-2"
                >
                  <Smartphone className="w-4 h-4" />
                  Mobile
                </Button>
                <Button
                  variant={previewDevice === 'desktop' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewDevice('desktop')}
                  className="flex items-center gap-2"
                >
                  <Monitor className="w-4 h-4" />
                  Desktop
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center p-8 bg-gray-50 rounded-lg">
                {previewDevice === 'mobile' ? renderMobilePreview() : renderDesktopPreview()}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="min-w-32">
          Save Branding Settings
        </Button>
      </div>
    </div>
  );
};

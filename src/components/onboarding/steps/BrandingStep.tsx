
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Upload, Palette, Eye, Save } from 'lucide-react';
import { BrandingPreview } from '@/components/tenant/BrandingPreview';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';

interface BrandingStepProps {
  tenantId: string;
  onComplete: (data: any) => void;
  data: any;
  onDataChange: (data: any) => void;
}

export const BrandingStep: React.FC<BrandingStepProps> = ({
  tenantId,
  onComplete,
  data,
  onDataChange
}) => {
  const [formData, setFormData] = useState({
    appName: '',
    tagline: '',
    primaryColor: '#10B981',
    secondaryColor: '#065F46',
    accentColor: '#34D399',
    logoUrl: '',
    faviconUrl: '',
    customCss: '',
    ...data
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const { showSuccess, showError } = useNotifications();

  const handleInputChange = (field: string, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onDataChange(newData);
  };

  const handleFileUpload = async (file: File, type: 'logo' | 'favicon') => {
    try {
      setIsUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${tenantId}/${type}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('tenant-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tenant-assets')
        .getPublicUrl(fileName);

      const field = type === 'logo' ? 'logoUrl' : 'faviconUrl';
      handleInputChange(field, publicUrl);
      
      showSuccess(`${type === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully`);
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      showError(`Failed to upload ${type}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      handleFileUpload(file, 'logo');
    }
  };

  const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFaviconFile(file);
      handleFileUpload(file, 'favicon');
    }
  };

  const handleSubmit = async () => {
    try {
      // Create or update tenant branding record
      const { error } = await supabase
        .from('tenant_branding')
        .upsert({
          tenant_id: tenantId,
          app_name: formData.appName,
          tagline: formData.tagline,
          primary_color: formData.primaryColor,
          secondary_color: formData.secondaryColor,
          accent_color: formData.accentColor,
          logo_url: formData.logoUrl,
          favicon_url: formData.faviconUrl,
          custom_css: formData.customCss,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'tenant_id'
        });

      if (error) throw error;

      showSuccess('Branding settings saved successfully');
      onComplete(formData);
    } catch (error) {
      console.error('Error saving branding:', error);
      showError('Failed to save branding settings');
    }
  };

  const predefinedColors = [
    { name: 'Emerald', primary: '#10B981', secondary: '#065F46', accent: '#34D399' },
    { name: 'Blue', primary: '#3B82F6', secondary: '#1E40AF', accent: '#60A5FA' },
    { name: 'Purple', primary: '#8B5CF6', secondary: '#5B21B6', accent: '#A78BFA' },
    { name: 'Orange', primary: '#F97316', secondary: '#C2410C', accent: '#FB923C' },
    { name: 'Rose', primary: '#F43F5E', secondary: '#BE123C', accent: '#FB7185' },
    { name: 'Teal', primary: '#14B8A6', secondary: '#0D9488', accent: '#2DD4BF' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Branding & Customization</h3>
        <p className="text-muted-foreground">
          Customize your app's appearance and branding
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branding Settings */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>App Identity</CardTitle>
              <CardDescription>Name and tagline for your application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="appName">App Name</Label>
                <Input
                  id="appName"
                  value={formData.appName}
                  onChange={(e) => handleInputChange('appName', e.target.value)}
                  placeholder="Your App Name"
                />
              </div>
              <div>
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={formData.tagline}
                  onChange={(e) => handleInputChange('tagline', e.target.value)}
                  placeholder="Your App Tagline"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Logo & Assets</CardTitle>
              <CardDescription>Upload your brand assets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Logo</Label>
                <div className="flex items-center gap-4">
                  {formData.logoUrl ? (
                    <img 
                      src={formData.logoUrl} 
                      alt="Logo" 
                      className="w-16 h-16 object-contain rounded border"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center">
                      <Upload className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Logo
                  </Button>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended: PNG or SVG, 200x200px max
                </p>
              </div>

              <div>
                <Label>Favicon</Label>
                <div className="flex items-center gap-4">
                  {formData.faviconUrl ? (
                    <img 
                      src={formData.faviconUrl} 
                      alt="Favicon" 
                      className="w-8 h-8 object-contain rounded border"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-100 rounded border flex items-center justify-center">
                      <Upload className="w-3 h-3 text-gray-400" />
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => faviconInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Favicon
                  </Button>
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFaviconChange}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended: ICO or PNG, 32x32px
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Color Scheme</CardTitle>
              <CardDescription>Choose your brand colors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Palette className="w-4 h-4" />
                  Quick Presets
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {predefinedColors.map((preset) => (
                    <Button
                      key={preset.name}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleInputChange('primaryColor', preset.primary);
                        handleInputChange('secondaryColor', preset.secondary);
                        handleInputChange('accentColor', preset.accent);
                      }}
                      className="justify-start"
                    >
                      <div className="flex gap-1 mr-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: preset.primary }}
                        />
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: preset.secondary }}
                        />
                      </div>
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                      className="w-16 h-10 p-1 rounded"
                    />
                    <Input
                      value={formData.primaryColor}
                      onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                      placeholder="#10B981"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={formData.secondaryColor}
                      onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                      className="w-16 h-10 p-1 rounded"
                    />
                    <Input
                      value={formData.secondaryColor}
                      onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                      placeholder="#065F46"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="accentColor">Accent Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accentColor"
                      type="color"
                      value={formData.accentColor}
                      onChange={(e) => handleInputChange('accentColor', e.target.value)}
                      className="w-16 h-10 p-1 rounded"
                    />
                    <Input
                      value={formData.accentColor}
                      onChange={(e) => handleInputChange('accentColor', e.target.value)}
                      placeholder="#34D399"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custom CSS</CardTitle>
              <CardDescription>Advanced styling customizations</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.customCss}
                onChange={(e) => handleInputChange('customCss', e.target.value)}
                placeholder="/* Custom CSS styles */"
                rows={6}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Add custom CSS to override default styles. Use with caution.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Live Preview
              </CardTitle>
              <CardDescription>See how your branding will look</CardDescription>
            </CardHeader>
            <CardContent>
              <BrandingPreview
                logoUrl={formData.logoUrl}
                primaryColor={formData.primaryColor}
                secondaryColor={formData.secondaryColor}
                appName={formData.appName || 'Your App Name'}
                appTagline={formData.tagline || 'Your App Tagline'}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Branding Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="text-xs">Logo</Badge>
                  <p className="text-xs text-muted-foreground">
                    Use high-quality PNG or SVG files. Recommended size: 200x200px
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="text-xs">Colors</Badge>
                  <p className="text-xs text-muted-foreground">
                    Choose colors that provide good contrast and accessibility
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="text-xs">Name</Badge>
                  <p className="text-xs text-muted-foreground">
                    Keep app name concise and memorable (2-3 words max)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={isUploading}>
          <Save className="w-4 h-4 mr-2" />
          Save Branding
        </Button>
      </div>
    </div>
  );
};

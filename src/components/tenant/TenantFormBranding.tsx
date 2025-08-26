
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Palette } from 'lucide-react';
import { BrandingPreview } from './BrandingPreview';
import { ColorPicker } from './ColorPicker';

interface TenantFormBrandingProps {
  formData: any;
  onChange?: (field: string, value: any) => void;
}

export const TenantFormBranding: React.FC<TenantFormBrandingProps> = ({ formData, onChange }) => {
  const [logoPreview, setLogoPreview] = useState<string | null>(formData.branding?.logo_url || null);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setLogoPreview(result);
        onChange?.('branding.logo_url', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBrandingChange = (field: string, value: string) => {
    onChange?.(`branding.${field}`, value);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Palette className="h-6 w-6 text-primary" />
            Brand Configuration
          </CardTitle>
          <CardDescription>Customize your organization's branding and visual identity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="logo">Logo Upload</Label>
            <div className="flex items-center space-x-4">
              <Input
                id="logo"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('logo')?.click()}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload Logo
              </Button>
              {logoPreview && (
                <div className="flex items-center gap-2">
                  <img src={logoPreview} alt="Logo Preview" className="w-10 h-10 object-cover rounded border" />
                  <span className="text-sm text-muted-foreground">Logo uploaded</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="app_name">App Name</Label>
              <Input
                id="app_name"
                value={formData.branding?.app_name || ''}
                onChange={(e) => handleBrandingChange('app_name', e.target.value)}
                placeholder="KisanShakti AI"
                className="h-11 focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="app_tagline">App Tagline</Label>
              <Input
                id="app_tagline"
                value={formData.branding?.app_tagline || ''}
                onChange={(e) => handleBrandingChange('app_tagline', e.target.value)}
                placeholder="Empowering Farmers with AI Technology"
                className="h-11 focus-visible:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ColorPicker
              color={formData.branding?.primary_color || '#10B981'}
              onChange={(color) => handleBrandingChange('primary_color', color)}
              label="Primary Color"
            />
            <ColorPicker
              color={formData.branding?.secondary_color || '#065F46'}
              onChange={(color) => handleBrandingChange('secondary_color', color)}
              label="Secondary Color"
            />
          </div>
        </CardContent>
      </Card>

      <BrandingPreview
        logoUrl={logoPreview || undefined}
        primaryColor={formData.branding?.primary_color || '#10B981'}
        secondaryColor={formData.branding?.secondary_color || '#065F46'}
        appName={formData.branding?.app_name || formData.name || 'KisanShakti AI'}
        appTagline={formData.branding?.app_tagline || 'Empowering Farmers with AI Technology'}
      />
    </div>
  );
};

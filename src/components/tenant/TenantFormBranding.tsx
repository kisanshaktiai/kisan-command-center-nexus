import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from 'lucide-react';
import { TenantFormData } from '@/types/tenant';
import { BrandingPreview } from './BrandingPreview';
import { ColorPicker } from './ColorPicker';

interface TenantFormBrandingProps {
  formData: TenantFormData;
}

export const TenantFormBranding: React.FC<TenantFormBrandingProps> = ({ formData }) => {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#10B981');
  const [secondaryColor, setSecondaryColor] = useState('#065F46');
  const [appName, setAppName] = useState('');
  const [appTagline, setAppTagline] = useState('');

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Brand Configuration</CardTitle>
          <CardDescription>Customize your organization's branding</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Logo
              </Button>
              {logoPreview && (
                <img src={logoPreview} alt="Logo Preview" className="w-10 h-10 object-cover rounded" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="app_name">App Name</Label>
              <Input
                id="app_name"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="KisanShakti AI"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="app_tagline">App Tagline</Label>
              <Input
                id="app_tagline"
                value={appTagline}
                onChange={(e) => setAppTagline(e.target.value)}
                placeholder="Empowering Farmers with AI Technology"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ColorPicker
              color={primaryColor}
              onChange={setPrimaryColor}
              label="Primary Color"
            />
            <ColorPicker
              color={secondaryColor}
              onChange={setSecondaryColor}
              label="Secondary Color"
            />
          </div>
        </CardContent>
      </Card>

      <BrandingPreview
        logoUrl={logoPreview || undefined}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        appName={appName || formData.name || 'KisanShakti AI'}
        appTagline={appTagline || 'Empowering Farmers with AI Technology'}
      />
    </div>
  );
};
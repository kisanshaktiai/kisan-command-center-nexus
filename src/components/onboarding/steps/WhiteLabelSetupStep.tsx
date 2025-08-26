
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Palette, Upload, CheckCircle, Eye } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

interface WhiteLabelSetupStepProps {
  stepData: any;
  onComplete: (data: any) => void;
  onNext: () => void;
  isCompleted: boolean;
}

export const WhiteLabelSetupStep: React.FC<WhiteLabelSetupStepProps> = ({
  stepData,
  onComplete,
  onNext,
  isCompleted
}) => {
  const [brandingData, setBrandingData] = useState({
    appName: stepData?.app_name || '',
    tagline: stepData?.tagline || '',
    primaryColor: stepData?.primary_color || '#3B82F6',
    secondaryColor: stepData?.secondary_color || '#10B981',
    accentColor: stepData?.accent_color || '#F59E0B',
    logoUrl: stepData?.logo_url || '',
    faviconUrl: stepData?.favicon_url || '',
    metaDescription: stepData?.meta_description || '',
    footerText: stepData?.footer_text || '',
    copyrightText: stepData?.copyright_text || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const { showSuccess, showError } = useNotifications();

  const colorPresets = [
    { name: 'Professional Blue', primary: '#3B82F6', secondary: '#10B981', accent: '#F59E0B' },
    { name: 'Forest Green', primary: '#059669', secondary: '#0D9488', accent: '#F97316' },
    { name: 'Royal Purple', primary: '#7C3AED', secondary: '#EC4899', accent: '#F59E0B' },
    { name: 'Modern Gray', primary: '#6B7280', secondary: '#374151', accent: '#EF4444' },
    { name: 'Ocean Blue', primary: '#0EA5E9', secondary: '#06B6D4', accent: '#8B5CF6' },
  ];

  const handleColorPreset = (preset: typeof colorPresets[0]) => {
    setBrandingData(prev => ({
      ...prev,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
      accentColor: preset.accent,
    }));
  };

  const handleInputChange = (field: string, value: string) => {
    setBrandingData(prev => ({ ...prev, [field]: value }));
  };

  const handleComplete = async () => {
    if (!brandingData.appName) {
      showError('App name is required');
      return;
    }

    setIsLoading(true);
    try {
      const completionData = {
        app_name: brandingData.appName,
        tagline: brandingData.tagline,
        primary_color: brandingData.primaryColor,
        secondary_color: brandingData.secondaryColor,
        accent_color: brandingData.accentColor,
        logo_url: brandingData.logoUrl,
        favicon_url: brandingData.faviconUrl,
        meta_description: brandingData.metaDescription,
        footer_text: brandingData.footerText,
        copyright_text: brandingData.copyrightText,
        setup_completed_at: new Date().toISOString(),
      };

      await onComplete(completionData);
      showSuccess('White-label setup completed successfully');
      onNext();
    } catch (error) {
      showError('Failed to complete white-label setup');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCompleted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            White-Label Setup - Completed
          </CardTitle>
          <CardDescription>Your brand customization is active</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>App Name</Label>
                <div className="font-medium">{stepData?.app_name}</div>
              </div>
              <div>
                <Label>Tagline</Label>
                <div className="text-muted-foreground">{stepData?.tagline || 'Not set'}</div>
              </div>
            </div>
            <div>
              <Label>Brand Colors</Label>
              <div className="flex gap-2 mt-2">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded border" 
                    style={{ backgroundColor: stepData?.primary_color }}
                  />
                  <span className="text-sm">Primary</span>
                </div>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded border" 
                    style={{ backgroundColor: stepData?.secondary_color }}
                  />
                  <span className="text-sm">Secondary</span>
                </div>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded border" 
                    style={{ backgroundColor: stepData?.accent_color }}
                  />
                  <span className="text-sm">Accent</span>
                </div>
              </div>
            </div>
            {stepData?.logo_url && (
              <div>
                <Label>Logo</Label>
                <img src={stepData.logo_url} alt="Logo" className="h-12 mt-2" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          White-Label Setup
        </CardTitle>
        <CardDescription>
          Customize your application's branding and appearance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="appName">Application Name *</Label>
            <Input
              id="appName"
              placeholder="Your App Name"
              value={brandingData.appName}
              onChange={(e) => handleInputChange('appName', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              placeholder="Your app's tagline"
              value={brandingData.tagline}
              onChange={(e) => handleInputChange('tagline', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium">Brand Colors</Label>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {colorPresets.map((preset, index) => (
                <Card 
                  key={index}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleColorPreset(preset)}
                >
                  <CardContent className="p-3">
                    <div className="flex gap-1 mb-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: preset.primary }} />
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: preset.secondary }} />
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: preset.accent }} />
                    </div>
                    <p className="text-xs font-medium">{preset.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={brandingData.primaryColor}
                  onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                  className="w-16 h-10 p-1 rounded"
                />
                <Input
                  value={brandingData.primaryColor}
                  onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={brandingData.secondaryColor}
                  onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                  className="w-16 h-10 p-1 rounded"
                />
                <Input
                  value={brandingData.secondaryColor}
                  onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accentColor">Accent Color</Label>
              <div className="flex gap-2">
                <Input
                  id="accentColor"
                  type="color"
                  value={brandingData.accentColor}
                  onChange={(e) => handleInputChange('accentColor', e.target.value)}
                  className="w-16 h-10 p-1 rounded"
                />
                <Input
                  value={brandingData.accentColor}
                  onChange={(e) => handleInputChange('accentColor', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="border-2 border-dashed border-muted rounded-lg p-4 text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Upload your logo</p>
              <p className="text-xs text-muted-foreground mt-1">Recommended: 200x50px, PNG format</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Favicon</Label>
            <div className="border-2 border-dashed border-muted rounded-lg p-4 text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Upload favicon</p>
              <p className="text-xs text-muted-foreground mt-1">Recommended: 32x32px, ICO format</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="metaDescription">Meta Description</Label>
            <Textarea
              id="metaDescription"
              placeholder="Brief description of your application for search engines"
              value={brandingData.metaDescription}
              onChange={(e) => handleInputChange('metaDescription', e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="footerText">Footer Text</Label>
              <Input
                id="footerText"
                placeholder="© 2024 Your Company Name"
                value={brandingData.footerText}
                onChange={(e) => handleInputChange('footerText', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="copyrightText">Copyright Text</Label>
              <Input
                id="copyrightText"
                placeholder="All rights reserved"
                value={brandingData.copyrightText}
                onChange={(e) => handleInputChange('copyrightText', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Brand Preview</h4>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setPreviewMode(!previewMode)}
            >
              <Eye className="w-4 h-4 mr-2" />
              {previewMode ? 'Hide' : 'Show'} Preview
            </Button>
          </div>
          {previewMode && (
            <div 
              className="bg-white border rounded-lg p-4"
              style={{ 
                borderColor: brandingData.primaryColor,
                background: `linear-gradient(135deg, ${brandingData.primaryColor}10, ${brandingData.secondaryColor}10)`
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: brandingData.primaryColor }}
                >
                  {brandingData.appName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-lg" style={{ color: brandingData.primaryColor }}>
                    {brandingData.appName || 'Your App Name'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {brandingData.tagline || 'Your app tagline'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" style={{ backgroundColor: brandingData.primaryColor }}>
                  Primary Button
                </Button>
                <Button size="sm" variant="outline" style={{ borderColor: brandingData.secondaryColor, color: brandingData.secondaryColor }}>
                  Secondary
                </Button>
                <Button size="sm" variant="outline" style={{ borderColor: brandingData.accentColor, color: brandingData.accentColor }}>
                  Accent
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button 
            onClick={handleComplete} 
            disabled={isLoading || !brandingData.appName}
          >
            {isLoading ? 'Saving...' : 'Complete Branding Setup'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};


import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, CheckCircle, Palette, Image } from 'lucide-react';
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
  const [formData, setFormData] = useState({
    appName: stepData?.app_name || '',
    tagline: stepData?.tagline || '',
    primaryColor: stepData?.primary_color || '#3B82F6',
    secondaryColor: stepData?.secondary_color || '#10B981',
    logoUrl: stepData?.logo_url || '',
    faviconUrl: stepData?.favicon_url || '',
    customCss: stepData?.custom_css || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useNotifications();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleComplete = async () => {
    if (!formData.appName) {
      showError('Application name is required');
      return;
    }

    setIsLoading(true);
    try {
      const completionData = {
        app_name: formData.appName,
        tagline: formData.tagline,
        primary_color: formData.primaryColor,
        secondary_color: formData.secondaryColor,
        logo_url: formData.logoUrl,
        favicon_url: formData.faviconUrl,
        custom_css: formData.customCss,
        branding_completed_at: new Date().toISOString(),
      };

      await onComplete(completionData);
      showSuccess('Brand customization saved successfully');
      onNext();
    } catch (error) {
      showError('Failed to save brand customization');
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
          <CardDescription>Your brand customization has been applied</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Application Name</Label>
                <div className="font-medium">{stepData?.app_name}</div>
              </div>
              <div>
                <Label>Tagline</Label>
                <div className="text-sm text-muted-foreground">{stepData?.tagline || 'Not set'}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Primary Color</Label>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: stepData?.primary_color }}
                  />
                  <span className="font-mono text-sm">{stepData?.primary_color}</span>
                </div>
              </div>
              <div>
                <Label>Secondary Color</Label>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: stepData?.secondary_color }}
                  />
                  <span className="font-mono text-sm">{stepData?.secondary_color}</span>
                </div>
              </div>
            </div>
            {(stepData?.logo_url || stepData?.favicon_url) && (
              <div>
                <Label>Brand Assets</Label>
                <div className="text-sm">
                  {stepData?.logo_url && <div>• Logo uploaded</div>}
                  {stepData?.favicon_url && <div>• Favicon uploaded</div>}
                </div>
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
              placeholder="My Company Portal"
              value={formData.appName}
              onChange={(e) => handleInputChange('appName', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              placeholder="Your success is our mission"
              value={formData.tagline}
              onChange={(e) => handleInputChange('tagline', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Primary Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="primaryColor"
                value={formData.primaryColor}
                onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                className="w-12 h-10 rounded border cursor-pointer"
              />
              <Input
                value={formData.primaryColor}
                onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                placeholder="#3B82F6"
                className="font-mono"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondaryColor">Secondary Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="secondaryColor"
                value={formData.secondaryColor}
                onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                className="w-12 h-10 rounded border cursor-pointer"
              />
              <Input
                value={formData.secondaryColor}
                onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                placeholder="#10B981"
                className="font-mono"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Logo Upload</Label>
            <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
              <Image className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">Upload your logo</p>
              <p className="text-xs text-muted-foreground">PNG, JPG up to 2MB</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Favicon Upload</Label>
            <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
              <Upload className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">Upload favicon</p>
              <p className="text-xs text-muted-foreground">ICO, PNG 32x32px</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="customCss">Custom CSS (Optional)</Label>
          <Textarea
            id="customCss"
            placeholder="/* Add your custom CSS here */"
            value={formData.customCss}
            onChange={(e) => handleInputChange('customCss', e.target.value)}
            className="font-mono text-sm"
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Add custom CSS to further customize your application's appearance
          </p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <h4 className="font-medium text-purple-900 mb-2">Preview</h4>
          <div className="border rounded-lg p-4 bg-white">
            <div className="flex items-center gap-3 mb-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: formData.primaryColor }}
              >
                {formData.appName.charAt(0) || 'A'}
              </div>
              <div>
                <div className="font-semibold">{formData.appName || 'Your App Name'}</div>
                {formData.tagline && (
                  <div className="text-sm text-muted-foreground">{formData.tagline}</div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <div 
                className="px-3 py-1 rounded text-white text-sm"
                style={{ backgroundColor: formData.primaryColor }}
              >
                Primary Button
              </div>
              <div 
                className="px-3 py-1 rounded text-white text-sm"
                style={{ backgroundColor: formData.secondaryColor }}
              >
                Secondary Button
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button 
            onClick={handleComplete} 
            disabled={isLoading || !formData.appName}
          >
            {isLoading ? 'Saving...' : 'Complete Brand Setup'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

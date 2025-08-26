
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Palette, Upload, Type, Smartphone, Monitor } from 'lucide-react';

interface EnhancedBrandingStepProps {
  onComplete: (data: any) => void;
  onSave: (data: any) => void;
  tenantId: string;
  stepData?: any;
  isLoading?: boolean;
  canProceed?: boolean;
}

export const EnhancedBrandingStep: React.FC<EnhancedBrandingStepProps> = ({
  onComplete,
  onSave,
  tenantId,
  stepData = {},
  isLoading = false,
  canProceed = true
}) => {
  const [formData, setFormData] = useState({
    // Basic branding
    appName: stepData.appName || '',
    appTagline: stepData.appTagline || '',
    logoUrl: stepData.logoUrl || '',
    
    // Colors
    primaryColor: stepData.primaryColor || '#22c55e',
    secondaryColor: stepData.secondaryColor || '#16a34a',
    accentColor: stepData.accentColor || '#65a30d',
    backgroundColor: stepData.backgroundColor || '#ffffff',
    textColor: stepData.textColor || '#1f2937',
    
    // Typography
    fontFamily: stepData.fontFamily || 'Inter',
    customFonts: stepData.customFonts || false,
    
    // Theme settings
    theme: stepData.theme || 'light',
    darkModeSupport: stepData.darkModeSupport || false,
    
    // Layout preferences
    layout: stepData.layout || 'modern',
    sidebarStyle: stepData.sidebarStyle || 'default',
    
    // Advanced settings
    customCss: stepData.customCss || '',
    faviconUrl: stepData.faviconUrl || '',
    
    // Mobile app branding
    mobileAppIcon: stepData.mobileAppIcon || '',
    splashScreenConfig: stepData.splashScreenConfig || {
      backgroundColor: '#22c55e',
      logoUrl: '',
      text: ''
    },
    
    // Email branding
    emailTemplate: stepData.emailTemplate || {
      headerColor: '#22c55e',
      footerText: '',
      logoUrl: ''
    }
  });

  const [previewMode, setPreviewMode] = useState('desktop');

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Auto-save periodically
  useEffect(() => {
    const timer = setTimeout(() => {
      if (Object.keys(formData).some(key => formData[key] !== stepData[key])) {
        onSave(formData);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [formData, onSave, stepData]);

  const handleComplete = () => {
    onComplete(formData);
  };

  const handleSaveAndContinue = () => {
    onSave(formData);
  };

  const colorPresets = [
    { name: 'Green Agriculture', primary: '#22c55e', secondary: '#16a34a', accent: '#65a30d' },
    { name: 'Blue Professional', primary: '#3b82f6', secondary: '#1d4ed8', accent: '#1e40af' },
    { name: 'Orange Vibrant', primary: '#f97316', secondary: '#ea580c', accent: '#dc2626' },
    { name: 'Purple Modern', primary: '#8b5cf6', secondary: '#7c3aed', accent: '#6d28d9' },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Enhanced Branding</h2>
        <p className="text-muted-foreground">
          Create a comprehensive brand identity for your platform
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Configuration */}
        <div className="space-y-6">
          {/* Basic Branding */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="w-5 h-5" />
                Basic Information
              </CardTitle>
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
                <Label htmlFor="appTagline">App Tagline</Label>
                <Input
                  id="appTagline"
                  value={formData.appTagline}
                  onChange={(e) => handleInputChange('appTagline', e.target.value)}
                  placeholder="Your inspiring tagline"
                />
              </div>

              <div>
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  value={formData.logoUrl}
                  onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </CardContent>
          </Card>

          {/* Color Scheme */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Color Scheme
              </CardTitle>
              <CardDescription>
                Choose colors that represent your brand
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={formData.primaryColor}
                      onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                      placeholder="#22c55e"
                      className="flex-1"
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
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={formData.secondaryColor}
                      onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                      placeholder="#16a34a"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accentColor">Accent Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accentColor"
                      type="color"
                      value={formData.accentColor}
                      onChange={(e) => handleInputChange('accentColor', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={formData.accentColor}
                      onChange={(e) => handleInputChange('accentColor', e.target.value)}
                      placeholder="#65a30d"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="backgroundColor">Background Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="backgroundColor"
                      type="color"
                      value={formData.backgroundColor}
                      onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={formData.backgroundColor}
                      onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                      placeholder="#ffffff"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Color Presets</Label>
                <div className="grid grid-cols-2 gap-2">
                  {colorPresets.map((preset) => (
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
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: preset.primary }}
                        />
                        <span className="text-xs">{preset.name}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Typography & Layout */}
          <Card>
            <CardHeader>
              <CardTitle>Typography & Layout</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="fontFamily">Font Family</Label>
                <select
                  id="fontFamily"
                  value={formData.fontFamily}
                  onChange={(e) => handleInputChange('fontFamily', e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Poppins">Poppins</option>
                  <option value="Lato">Lato</option>
                </select>
              </div>

              <div>
                <Label htmlFor="layout">Layout Style</Label>
                <select
                  id="layout"
                  value={formData.layout}
                  onChange={(e) => handleInputChange('layout', e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="modern">Modern</option>
                  <option value="classic">Classic</option>
                  <option value="minimal">Minimal</option>
                  <option value="compact">Compact</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="darkModeSupport">Dark Mode Support</Label>
                <Switch
                  id="darkModeSupport"
                  checked={formData.darkModeSupport}
                  onCheckedChange={(checked) => handleInputChange('darkModeSupport', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Advanced Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="faviconUrl">Favicon URL</Label>
                <Input
                  id="faviconUrl"
                  value={formData.faviconUrl}
                  onChange={(e) => handleInputChange('faviconUrl', e.target.value)}
                  placeholder="https://example.com/favicon.ico"
                />
              </div>

              <div>
                <Label htmlFor="customCss">Custom CSS</Label>
                <Textarea
                  id="customCss"
                  value={formData.customCss}
                  onChange={(e) => handleInputChange('customCss', e.target.value)}
                  placeholder="/* Your custom CSS */&#10;.custom-class {&#10;  /* styles */&#10;}"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={previewMode === 'desktop' ? 'default' : 'outline'}
                  onClick={() => setPreviewMode('desktop')}
                >
                  <Monitor className="w-4 h-4 mr-1" />
                  Desktop
                </Button>
                <Button
                  size="sm"
                  variant={previewMode === 'mobile' ? 'default' : 'outline'}
                  onClick={() => setPreviewMode('mobile')}
                >
                  <Smartphone className="w-4 h-4 mr-1" />
                  Mobile
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className={`border rounded-lg overflow-hidden ${
                  previewMode === 'mobile' ? 'max-w-sm mx-auto' : ''
                }`}
                style={{ backgroundColor: formData.backgroundColor }}
              >
                {/* Preview Header */}
                <div
                  className="p-4 text-white"
                  style={{ backgroundColor: formData.primaryColor }}
                >
                  <div className="flex items-center gap-3">
                    {formData.logoUrl && (
                      <img
                        src={formData.logoUrl}
                        alt="Logo"
                        className="w-8 h-8 rounded"
                      />
                    )}
                    <div>
                      <h3 className="font-semibold">
                        {formData.appName || 'Your App Name'}
                      </h3>
                      {formData.appTagline && (
                        <p className="text-sm opacity-90">{formData.appTagline}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Preview Content */}
                <div className="p-4 space-y-4" style={{ color: formData.textColor }}>
                  <div className="flex gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: formData.primaryColor }}
                    />
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: formData.secondaryColor }}
                    />
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: formData.accentColor }}
                    />
                  </div>

                  <div className="space-y-2">
                    <div
                      className="h-2 rounded"
                      style={{ backgroundColor: formData.primaryColor, opacity: 0.8 }}
                    />
                    <div
                      className="h-2 rounded w-3/4"
                      style={{ backgroundColor: formData.secondaryColor, opacity: 0.6 }}
                    />
                    <div
                      className="h-2 rounded w-1/2"
                      style={{ backgroundColor: formData.accentColor, opacity: 0.4 }}
                    />
                  </div>

                  <div
                    className="p-3 rounded border"
                    style={{
                      borderColor: formData.primaryColor,
                      fontFamily: formData.fontFamily
                    }}
                  >
                    <p className="text-sm">
                      Preview content with {formData.fontFamily} font
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-between">
        <Button
          onClick={handleSaveAndContinue}
          variant="outline"
          disabled={isLoading}
        >
          Save Progress
        </Button>

        <Button
          onClick={handleComplete}
          disabled={isLoading || !canProceed}
        >
          {isLoading ? 'Saving...' : 'Complete & Continue'}
        </Button>
      </div>
    </div>
  );
};

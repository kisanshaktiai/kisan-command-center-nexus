
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Palette, Smartphone, Sparkles, Loader2 } from 'lucide-react';
import { BrandingPreview } from './BrandingPreview';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BrandingSuggestionsDialog } from '@/components/white-label/BrandingSuggestionsDialog';

interface TenantFormBrandingProps {
  formData: any;
  onChange?: (field: string, value: any) => void;
}

// 5 World-class mobile app color themes
const colorThemes = [
  {
    name: 'Ocean Blue',
    primary: '#0ea5e9',
    secondary: '#0284c7',
    description: 'Professional and trustworthy'
  },
  {
    name: 'Forest Green',
    primary: '#10b981',
    secondary: '#059669',
    description: 'Natural and growth-focused'
  },
  {
    name: 'Royal Purple',
    primary: '#8b5cf6',
    secondary: '#7c3aed',
    description: 'Premium and innovative'
  },
  {
    name: 'Sunset Orange',
    primary: '#f97316',
    secondary: '#ea580c',
    description: 'Energetic and creative'
  },
  {
    name: 'Rose Pink',
    primary: '#ec4899',
    secondary: '#db2777',
    description: 'Modern and friendly'
  }
];

export const TenantFormBranding: React.FC<TenantFormBrandingProps> = ({ formData, onChange }) => {
  const [logoPreview, setLogoPreview] = useState<string | null>(formData.branding?.logo_url || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuggestionsDialog, setShowSuggestionsDialog] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ appName: string; tagLine: string }>>([]);

  const MAX_APP_NAME_LENGTH = 15;
  const MAX_TAGLINE_LENGTH = 26;

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

  const applyTheme = (theme: typeof colorThemes[0]) => {
    onChange?.('branding.primary_color', theme.primary);
    onChange?.('branding.secondary_color', theme.secondary);
  };

  const handleGenerateSuggestions = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-branding-suggestions', {
        body: {
          companyName: formData.name || formData.branding?.company_name || '',
          industry: 'Agriculture/AgriTech',
          description: formData.description || 'A platform empowering farmers with technology'
        }
      });

      if (error) throw error;

      if (data?.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
        setShowSuggestionsDialog(true);
      } else {
        toast.error('No suggestions generated');
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast.error('Failed to generate suggestions', {
        description: error instanceof Error ? error.message : 'Please try again'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectSuggestion = (suggestion: { appName: string; tagLine: string }) => {
    onChange?.('branding.app_name', suggestion.appName);
    onChange?.('branding.app_tagline', suggestion.tagLine);
    toast.success('Suggestion applied!', {
      description: `${suggestion.appName} - ${suggestion.tagLine}`
    });
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
          {/* Logo Upload Section */}
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

          {/* App Name and Tagline with AI Suggestions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">App Identity</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateSuggestions}
                disabled={isGenerating}
                className="flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    AI Suggest
                  </>
                )}
              </Button>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="app_name">App Name</Label>
                  <span className={`text-xs ${
                    (formData.branding?.app_name || '').length > MAX_APP_NAME_LENGTH 
                      ? 'text-destructive' 
                      : 'text-muted-foreground'
                  }`}>
                    {(formData.branding?.app_name || '').length}/{MAX_APP_NAME_LENGTH}
                  </span>
                </div>
                <Input
                  id="app_name"
                  value={formData.branding?.app_name || ''}
                  onChange={(e) => {
                    const value = e.target.value.substring(0, MAX_APP_NAME_LENGTH);
                    handleBrandingChange('app_name', value);
                  }}
                  placeholder="KisanShakti AI"
                  className="h-11 focus-visible:ring-primary"
                  maxLength={MAX_APP_NAME_LENGTH}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="app_tagline">Tag Line</Label>
                  <span className={`text-xs ${
                    (formData.branding?.app_tagline || '').length > MAX_TAGLINE_LENGTH 
                      ? 'text-destructive' 
                      : 'text-muted-foreground'
                  }`}>
                    {(formData.branding?.app_tagline || '').length}/{MAX_TAGLINE_LENGTH}
                  </span>
                </div>
                <Input
                  id="app_tagline"
                  value={formData.branding?.app_tagline || ''}
                  onChange={(e) => {
                    const value = e.target.value.substring(0, MAX_TAGLINE_LENGTH);
                    handleBrandingChange('app_tagline', value);
                  }}
                  placeholder="Empowering Farmers with AI"
                  className="h-11 focus-visible:ring-primary"
                  maxLength={MAX_TAGLINE_LENGTH}
                />
              </div>
            </div>
          </div>

          {/* Color Theme Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              <Label className="text-sm font-semibold">Mobile App Color Themes</Label>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {colorThemes.map((theme, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => applyTheme(theme)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: theme.primary }}
                      />
                      <div
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: theme.secondary }}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{theme.name}</p>
                      <p className="text-xs text-muted-foreground">{theme.description}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      applyTheme(theme);
                    }}
                  >
                    Apply
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Color Selection */}
          <div className="space-y-4">
            <Label className="text-sm font-semibold">Custom Colors</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary_color" className="text-sm">Primary Color</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="primary_color"
                    type="color"
                    value={formData.branding?.primary_color || '#10B981'}
                    onChange={(e) => handleBrandingChange('primary_color', e.target.value)}
                    className="w-12 h-11 p-1 border rounded cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={formData.branding?.primary_color || '#10B981'}
                    onChange={(e) => handleBrandingChange('primary_color', e.target.value)}
                    placeholder="#10B981"
                    className="flex-1 h-11 font-mono text-sm focus-visible:ring-primary"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondary_color" className="text-sm">Secondary Color</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="secondary_color"
                    type="color"
                    value={formData.branding?.secondary_color || '#065F46'}
                    onChange={(e) => handleBrandingChange('secondary_color', e.target.value)}
                    className="w-12 h-11 p-1 border rounded cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={formData.branding?.secondary_color || '#065F46'}
                    onChange={(e) => handleBrandingChange('secondary_color', e.target.value)}
                    placeholder="#065F46"
                    className="flex-1 h-11 font-mono text-sm focus-visible:ring-primary"
                  />
                </div>
              </div>
            </div>
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

      {/* Branding Suggestions Dialog */}
      <BrandingSuggestionsDialog
        open={showSuggestionsDialog}
        onOpenChange={setShowSuggestionsDialog}
        suggestions={suggestions}
        onSelectSuggestion={handleSelectSuggestion}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Palette, Smartphone, Wand2, Settings, CheckCircle, AlertCircle, Copy, Sparkles, Monitor, Tablet } from 'lucide-react';
import { toast } from 'sonner';
import { MobileAppPreview } from './MobileAppPreview';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { WhiteLabelConfigData } from '@/hooks/useWhiteLabelConfig';
import { useMasterThemes } from '@/hooks/useMasterThemes';
import { expandPresetToFullConfig } from '@/lib/whitelabel-types/themeMapping';

interface Modern2025Theme {
  core: {
    primary: string;
    primary_variant: string;
    secondary: string;
    secondary_variant: string;
    tertiary: string;
    accent: string;
  };
  neutral: {
    background: string;
    surface: string;
    on_background: string;
    on_surface: string;
    border: string;
  };
  status: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  support: {
    disabled: string;
    overlay: string;
  };
  typography?: {
    font_family: string;
    font_size_base: number;
    font_weight_regular: number;
    font_weight_medium: number;
    font_weight_bold: number;
  };
  spacing?: {
    unit: number;
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  border_radius?: {
    sm: number;
    md: number;
    lg: number;
    full: number;
  };
  shadows?: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

interface EnhancedMobileThemePanelProps {
  config: any;
  updateConfig: (section: string, field: string, value: any) => void;
  tenantId?: string;
  appName?: string;
  logoUrl?: string;
}

const defaultTheme: Modern2025Theme = {
  core: {
    primary: "210 100% 50%",
    primary_variant: "210 100% 40%",
    secondary: "160 60% 45%",
    secondary_variant: "160 60% 35%",
    tertiary: "280 60% 50%",
    accent: "45 90% 50%"
  },
  neutral: {
    background: "0 0% 98%",
    surface: "0 0% 100%",
    on_background: "0 0% 10%",
    on_surface: "0 0% 15%",
    border: "0 0% 90%"
  },
  status: {
    success: "142 71% 45%",
    warning: "38 92% 50%",
    error: "0 84% 60%",
    info: "199 89% 48%"
  },
  support: {
    disabled: "0 0% 60%",
    overlay: "0 0% 0%"
  },
  typography: {
    font_family: "Inter",
    font_size_base: 16,
    font_weight_regular: 400,
    font_weight_medium: 500,
    font_weight_bold: 700
  },
  spacing: {
    unit: 4,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  },
  border_radius: {
    sm: 4,
    md: 8,
    lg: 12,
    full: 9999
  },
  shadows: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
  }
};

// Quick Start themes are no longer hardcoded here. They come from the
// platform catalogue table public.master_themes (managed on the Master
// Themes page) via useMasterThemes(tenantId), which returns only the themes
// the selected tenant's subscription plan allows.
export const EnhancedMobileThemePanel: React.FC<EnhancedMobileThemePanelProps> = ({
  config,
  updateConfig,
  tenantId,
  appName,
  logoUrl
}) => {
  // Quick Start themes for the selected tenant, read from public.master_themes
  const { presetThemes, isLoading: presetsLoading, error: presetsError } = useMasterThemes(tenantId);

  // Get theme from config or use default - ensure complete structure
  const getThemeFromConfig = () => {
    // First check if we have mobile_theme with proper structure
    if (config?.mobile_theme && typeof config.mobile_theme === 'object') {
      const mobileTheme = config.mobile_theme as any;
      if (mobileTheme.core) {
        console.log('Loading saved mobile_theme from config:', mobileTheme);
        return {
          core: { ...defaultTheme.core, ...(mobileTheme.core || {}) },
          neutral: { ...defaultTheme.neutral, ...(mobileTheme.neutral || {}) },
          status: { ...defaultTheme.status, ...(mobileTheme.status || {}) },
          support: { ...defaultTheme.support, ...(mobileTheme.support || {}) },
          typography: mobileTheme.typography || defaultTheme.typography,
          spacing: mobileTheme.spacing || defaultTheme.spacing,
          border_radius: mobileTheme.border_radius || defaultTheme.border_radius,
          shadows: mobileTheme.shadows || defaultTheme.shadows,
        };
      }
    }
    
    // Check app_store_config mobile theme
    if (config?.app_store_config?.mobile_theme) {
      const appTheme = config.app_store_config.mobile_theme;
      if (appTheme.core) {
        console.log('Loading mobile_theme from app_store_config:', appTheme);
        return {
          core: { ...defaultTheme.core, ...(appTheme.core || {}) },
          neutral: { ...defaultTheme.neutral, ...(appTheme.neutral || {}) },
          status: { ...defaultTheme.status, ...(appTheme.status || {}) },
          support: { ...defaultTheme.support, ...(appTheme.support || {}) },
          typography: appTheme.typography || defaultTheme.typography,
          spacing: appTheme.spacing || defaultTheme.spacing,
          border_radius: appTheme.border_radius || defaultTheme.border_radius,
          shadows: appTheme.shadows || defaultTheme.shadows,
        };
      }
    }
    
    // Convert from theme_colors (web format) to mobile format if available
    if (config?.theme_colors && config.theme_colors.core) {
      console.log('Converting theme_colors to mobile format:', config.theme_colors);
      const webTheme = config.theme_colors;
      
      // Map web theme to mobile theme structure
      return {
        core: {
          primary: webTheme.core?.primary || defaultTheme.core.primary,
          primary_variant: webTheme.core?.primary?.replace('36%', '30%') || defaultTheme.core.primary_variant,
          secondary: webTheme.core?.secondary || defaultTheme.core.secondary,
          secondary_variant: webTheme.core?.secondary?.replace('48%', '40%') || defaultTheme.core.secondary_variant,
          tertiary: webTheme.core?.accent || defaultTheme.core.tertiary,
          accent: webTheme.core?.accent || defaultTheme.core.accent,
        },
        neutral: {
          background: webTheme.core?.background || defaultTheme.neutral.background,
          surface: webTheme.core?.card || defaultTheme.neutral.surface,
          on_background: webTheme.core?.foreground || defaultTheme.neutral.on_background,
          on_surface: webTheme.core?.card_foreground || defaultTheme.neutral.on_surface,
          border: webTheme.core?.border || defaultTheme.neutral.border,
        },
        status: {
          success: webTheme.core?.success || defaultTheme.status.success,
          warning: webTheme.weather?.sunny || '38 92% 50%',
          error: webTheme.core?.destructive || defaultTheme.status.error,
          info: webTheme.core?.accent || defaultTheme.status.info,
        },
        support: defaultTheme.support,
        typography: defaultTheme.typography,
        spacing: defaultTheme.spacing,
        border_radius: defaultTheme.border_radius,
        shadows: defaultTheme.shadows,
      };
    }
    
    console.log('Using default theme - no config found');
    return defaultTheme;
  };

  const [currentTheme, setCurrentTheme] = useState<Modern2025Theme>(getThemeFromConfig());
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [lastLoadedTenantId, setLastLoadedTenantId] = useState<string | null>(null);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);

  // Keep theme in sync with config changes ONLY when tenant changes
  useEffect(() => {
    // Only reload theme if tenant changed, not on every config update
    if (tenantId !== lastLoadedTenantId) {
      const configTheme = getThemeFromConfig();
      setCurrentTheme(configTheme);
      setSelectedPreset(null); // Reset preset when tenant changes
      setValidationErrors([]); // Clear validation errors
      setHasLocalChanges(false); // Reset local changes flag
      setLastLoadedTenantId(tenantId);
      console.log('Theme loaded for new tenant:', tenantId, configTheme);
    }
  }, [tenantId]); // Only depend on tenantId, not the entire config

  const validateTheme = (theme: Modern2025Theme): string[] => {
    const errors: string[] = [];
    
    // Validate required color sections
    if (!theme.core || Object.keys(theme.core).length < 6) {
      errors.push('Core colors are incomplete');
    }
    if (!theme.neutral || Object.keys(theme.neutral).length < 5) {
      errors.push('Neutral colors are incomplete');
    }
    if (!theme.status || Object.keys(theme.status).length < 4) {
      errors.push('Status colors are incomplete');
    }
    if (!theme.support || Object.keys(theme.support).length < 2) {
      errors.push('Support colors are incomplete');
    }

    // Validate HSL format (should be like "210 100% 50%")
    const validateHSL = (value: string, name: string) => {
      const hslPattern = /^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/;
      if (!hslPattern.test(value)) {
        errors.push(`${name} is not in valid HSL format`);
      }
    };

    // Check all color values
    Object.entries(theme.core || {}).forEach(([key, value]) => {
      validateHSL(value, `Core.${key}`);
    });
    Object.entries(theme.neutral || {}).forEach(([key, value]) => {
      validateHSL(value, `Neutral.${key}`);
    });
    Object.entries(theme.status || {}).forEach(([key, value]) => {
      validateHSL(value, `Status.${key}`);
    });
    Object.entries(theme.support || {}).forEach(([key, value]) => {
      if (key !== 'overlay') { // Overlay can have alpha
        validateHSL(value, `Support.${key}`);
      }
    });

    return errors;
  };

  const handleColorChange = (category: keyof Modern2025Theme, field: string, value: string) => {
    const updatedTheme = {
      ...currentTheme,
      [category]: {
        ...(currentTheme[category] as any),
        [field]: value
      }
    };
    setCurrentTheme(updatedTheme);
    setHasLocalChanges(true); // Track local changes
  };

  const applyPresetTheme = (presetId: string) => {
    const preset = presetThemes.find(t => t.id === presetId);
    if (preset) {
      setCurrentTheme(preset.theme);
      setSelectedPreset(presetId);
      setHasLocalChanges(true); // Track local changes
      toast.success(`Applied ${preset.name} theme`);
    }
  };

  const generateVariant = (baseColor: string, darker: boolean = true): string => {
    // Parse HSL values
    const parts = baseColor.split(' ');
    if (parts.length !== 3) return baseColor;
    
    const h = parseInt(parts[0]);
    const s = parseInt(parts[1]);
    const l = parseInt(parts[2]);
    
    // Adjust lightness for variant
    const newL = darker ? Math.max(10, l - 10) : Math.min(90, l + 10);
    
    return `${h} ${s}% ${newL}%`;
  };

  const autoGenerateVariants = () => {
    const updated = {
      ...currentTheme,
      core: {
        ...currentTheme.core,
        primary_variant: generateVariant(currentTheme.core.primary, true),
        secondary_variant: generateVariant(currentTheme.core.secondary, true)
      }
    };
    setCurrentTheme(updated);
    setHasLocalChanges(true); // Track local changes
    toast.success('Generated color variants');
  };

  const saveTheme = () => {
    const errors = validateTheme(currentTheme);
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast.error('Please fix validation errors before saving');
      return;
    }

    console.log('Saving mobile theme:', {
      themeKeys: Object.keys(currentTheme),
      primaryColor: currentTheme.core?.primary,
      tenantId: config?.tenant_id
    });

    // Expand the theme into every JSONB group the mobile app reads
    // (brand_identity / mobile_theme / theme_colors / app_customization) and
    // stage them in ONE write. Without the expansion the mobile app only saw
    // mobile_theme change while theme_colors / brand_identity kept old values.
    // One write matters: updateConfig() spreads the page's `config` closure,
    // so several calls in a row each overwrote the previous one.
    const bundle = expandPresetToFullConfig(currentTheme, {
      existingBrandIdentity: config?.brand_identity,
    });
    updateConfig('__bulk_theme__', '', {
      ...bundle,
      // keep app_store_config.mobile_theme in step for backward compatibility
      app_store_config_mobile_theme: currentTheme,
      api_version: 'v1',
      is_validated: true,
      validation_errors: [],
    });
    setHasLocalChanges(false); // Reset local changes flag after save
    setValidationErrors([]);
    toast.success('Mobile theme staged. Click "Save Theme Configuration" to persist changes.');
  };

  const copyThemeJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(currentTheme, null, 2));
    toast.success('Theme JSON copied to clipboard');
  };

  const ColorInput: React.FC<{
    label: string;
    value: string;
    onChange: (value: string) => void;
    helperText?: string;
  }> = ({ label, value, onChange, helperText }) => (
    <div className="space-y-2">
      <Label htmlFor={label}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="H S% L%"
          className="font-mono text-sm"
        />
        <div 
          className="w-10 h-10 rounded border"
          style={{ backgroundColor: `hsl(${value})` }}
        />
      </div>
      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc pl-4">
              {validationErrors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* All configuration in a single view */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Configuration */}
        <div className="space-y-6">
          {/* Preset Themes */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Start Themes</CardTitle>
              <CardDescription>Select a preset theme to start with</CardDescription>
            </CardHeader>
            <CardContent>
              {presetsLoading && (
                <p className="text-sm text-muted-foreground">Loading themes...</p>
              )}
              {presetsError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Could not load the theme catalogue for this tenant.</AlertDescription>
                </Alert>
              )}
              {!presetsLoading && !presetsError && presetThemes.length === 0 && (
                <p className="text-sm text-muted-foreground">No themes available for this tenant's plan.</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                {presetThemes.map(preset => (
                  <Button
                    key={preset.id}
                    variant={selectedPreset === preset.id ? "default" : "outline"}
                    className="h-auto flex items-center gap-3 p-3 justify-start"
                    onClick={() => applyPresetTheme(preset.id)}
                  >
                    <div className="flex gap-1 flex-shrink-0">
                      <div 
                        className="w-4 h-4 rounded-full border border-border" 
                        style={{ backgroundColor: `hsl(${preset.theme.core.primary})` }}
                      />
                      <div 
                        className="w-4 h-4 rounded-full border border-border" 
                        style={{ backgroundColor: `hsl(${preset.theme.core.secondary})` }}
                      />
                      <div 
                        className="w-4 h-4 rounded-full border border-border" 
                        style={{ backgroundColor: `hsl(${preset.theme.core.accent})` }}
                      />
                    </div>
                    <span className="text-sm font-medium truncate">{preset.name}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Core Colors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Core Theme Colors
              </CardTitle>
              <CardDescription>Main brand colors for your mobile app</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <ColorInput
                  label="Primary"
                  value={currentTheme.core.primary}
                  onChange={(v) => handleColorChange('core', 'primary', v)}
                  helperText="Main brand color"
                />
                <ColorInput
                  label="Primary Variant"
                  value={currentTheme.core.primary_variant}
                  onChange={(v) => handleColorChange('core', 'primary_variant', v)}
                  helperText="Hover/active state"
                />
                <ColorInput
                  label="Secondary"
                  value={currentTheme.core.secondary}
                  onChange={(v) => handleColorChange('core', 'secondary', v)}
                  helperText="Supporting accent"
                />
                <ColorInput
                  label="Secondary Variant"
                  value={currentTheme.core.secondary_variant}
                  onChange={(v) => handleColorChange('core', 'secondary_variant', v)}
                  helperText="Hover/contrast shade"
                />
                <ColorInput
                  label="Tertiary"
                  value={currentTheme.core.tertiary}
                  onChange={(v) => handleColorChange('core', 'tertiary', v)}
                  helperText="Creative elements"
                />
                <ColorInput
                  label="Accent"
                  value={currentTheme.core.accent}
                  onChange={(v) => handleColorChange('core', 'accent', v)}
                  helperText="Highlights, chips"
                />
              </div>
              <Button onClick={autoGenerateVariants} variant="secondary" size="sm">
                <Wand2 className="h-4 w-4 mr-2" />
                Auto-generate Variants
              </Button>
            </CardContent>
          </Card>

          {/* Neutral Colors */}
          <Card>
            <CardHeader>
              <CardTitle>Neutral Colors</CardTitle>
              <CardDescription>Background and surface colors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <ColorInput
                  label="Background"
                  value={currentTheme.neutral.background}
                  onChange={(v) => handleColorChange('neutral', 'background', v)}
                  helperText="Default screen background"
                />
                <ColorInput
                  label="Surface"
                  value={currentTheme.neutral.surface}
                  onChange={(v) => handleColorChange('neutral', 'surface', v)}
                  helperText="Card/panel backgrounds"
                />
                <ColorInput
                  label="On Background"
                  value={currentTheme.neutral.on_background}
                  onChange={(v) => handleColorChange('neutral', 'on_background', v)}
                  helperText="Text on background"
                />
                <ColorInput
                  label="On Surface"
                  value={currentTheme.neutral.on_surface}
                  onChange={(v) => handleColorChange('neutral', 'on_surface', v)}
                  helperText="Text on surfaces"
                />
                <ColorInput
                  label="Border"
                  value={currentTheme.neutral.border}
                  onChange={(v) => handleColorChange('neutral', 'border', v)}
                  helperText="Dividers, lines"
                />
              </div>
            </CardContent>
          </Card>

          {/* Status Colors */}
          <Card>
            <CardHeader>
              <CardTitle>Status/Feedback Colors</CardTitle>
              <CardDescription>Colors for system feedback</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <ColorInput
                  label="Success"
                  value={currentTheme.status.success}
                  onChange={(v) => handleColorChange('status', 'success', v)}
                  helperText="Confirmations"
                />
                <ColorInput
                  label="Warning"
                  value={currentTheme.status.warning}
                  onChange={(v) => handleColorChange('status', 'warning', v)}
                  helperText="Caution messages"
                />
                <ColorInput
                  label="Error"
                  value={currentTheme.status.error}
                  onChange={(v) => handleColorChange('status', 'error', v)}
                  helperText="Validation errors"
                />
                <ColorInput
                  label="Info"
                  value={currentTheme.status.info}
                  onChange={(v) => handleColorChange('status', 'info', v)}
                  helperText="General notices"
                />
              </div>
            </CardContent>
          </Card>

          {/* Support Colors */}
          <Card>
            <CardHeader>
              <CardTitle>Support Colors</CardTitle>
              <CardDescription>Additional UI states</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <ColorInput
                  label="Disabled"
                  value={currentTheme.support.disabled}
                  onChange={(v) => handleColorChange('support', 'disabled', v)}
                  helperText="Inactive elements"
                />
                <ColorInput
                  label="Overlay"
                  value={currentTheme.support.overlay}
                  onChange={(v) => handleColorChange('support', 'overlay', v)}
                  helperText="Modal backgrounds"
                />
              </div>
            </CardContent>
          </Card>

          {/* Typography Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Typography Settings</CardTitle>
              <CardDescription>Font configuration for mobile app</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Font Family</Label>
                <Input
                  value={currentTheme.typography?.font_family || 'Inter'}
                  onChange={(e) => handleColorChange('typography' as any, 'font_family', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Base Size (px)</Label>
                  <Input
                    type="number"
                    value={currentTheme.typography?.font_size_base || 16}
                    onChange={(e) => handleColorChange('typography' as any, 'font_size_base', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Regular Weight</Label>
                  <Input
                    type="number"
                    value={currentTheme.typography?.font_weight_regular || 400}
                    onChange={(e) => handleColorChange('typography' as any, 'font_weight_regular', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Bold Weight</Label>
                  <Input
                    type="number"
                    value={currentTheme.typography?.font_weight_bold || 700}
                    onChange={(e) => handleColorChange('typography' as any, 'font_weight_bold', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Spacing System */}
          <Card>
            <CardHeader>
              <CardTitle>Spacing System</CardTitle>
              <CardDescription>Consistent spacing values</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {['xs', 'sm', 'md', 'lg', 'xl'].map(size => (
                  <div key={size}>
                    <Label>{size.toUpperCase()}</Label>
                    <Input
                      type="number"
                      value={(currentTheme.spacing as any)?.[size] || 8}
                      onChange={(e) => handleColorChange('spacing' as any, size, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Preview */}
        <div className="lg:sticky lg:top-4 lg:h-fit">
          <Card>
            <CardHeader>
              <CardTitle>Mobile App Preview</CardTitle>
              <CardDescription>See how your theme looks on a real mobile app</CardDescription>
            </CardHeader>
            <CardContent>
              <MobileAppPreview 
                theme={currentTheme}
                deviceType="iphone"
                appName={appName || config?.app_store_config?.app_name || "Your App"}
                logoUrl={logoUrl || config?.brand_identity?.logo_url}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-between">
        <Button onClick={copyThemeJSON} variant="outline">
          <Copy className="h-4 w-4 mr-2" />
          Copy JSON
        </Button>
        <div className="flex gap-2">
          <Button 
            onClick={() => setIsPreviewMode(!isPreviewMode)} 
            variant="outline"
          >
            {isPreviewMode ? 'Exit Preview' : 'Preview Mode'}
          </Button>
          <Button onClick={saveTheme}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Save Theme Configuration
          </Button>
        </div>
      </div>
    </div>
  );
};
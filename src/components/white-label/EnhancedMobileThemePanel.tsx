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

const presetThemes = [
  {
    id: 'neo-minimal',
    name: 'Neo Minimal',
    description: 'Clean white/gray with subtle blue accents',
    theme: {
      ...defaultTheme,
      core: {
        primary: "220 93% 60%",
        primary_variant: "220 93% 50%",
        secondary: "0 0% 96%",
        secondary_variant: "0 0% 90%",
        tertiary: "220 14% 71%",
        accent: "220 83% 54%"
      },
      neutral: {
        background: "0 0% 100%",
        surface: "0 0% 98%",
        on_background: "222 47% 11%",
        on_surface: "222 47% 20%",
        border: "220 13% 91%"
      }
    }
  },
  {
    id: 'dark-elegance',
    name: 'Dark Elegance',
    description: 'Professional dark mode with purple accents',
    theme: {
      ...defaultTheme,
      core: {
        primary: "271 91% 65%",
        primary_variant: "271 91% 55%",
        secondary: "290 87% 47%",
        secondary_variant: "290 87% 37%",
        tertiary: "250 84% 67%",
        accent: "271 76% 71%"
      },
      neutral: {
        background: "222 47% 11%",
        surface: "222 47% 15%",
        on_background: "210 40% 98%",
        on_surface: "210 40% 95%",
        border: "217 19% 27%"
      }
    }
  },
  {
    id: 'nature-fresh',
    name: 'Nature Fresh',
    description: 'Green earth tones for agriculture apps',
    theme: {
      ...defaultTheme,
      core: {
        primary: "142 76% 36%",
        primary_variant: "142 76% 26%",
        secondary: "88 61% 47%",
        secondary_variant: "88 61% 37%",
        tertiary: "55 83% 64%",
        accent: "25 95% 53%"
      },
      neutral: {
        background: "60 20% 99%",
        surface: "60 7% 97%",
        on_background: "222 47% 11%",
        on_surface: "222 47% 20%",
        border: "142 16% 90%"
      }
    }
  },
  {
    id: 'sunrise-warmth',
    name: 'Sunrise Warmth',
    description: 'Orange/coral gradients with warm tones',
    theme: {
      ...defaultTheme,
      core: {
        primary: "24 95% 53%",
        primary_variant: "24 95% 43%",
        secondary: "11 91% 71%",
        secondary_variant: "11 91% 61%",
        tertiary: "48 96% 53%",
        accent: "346 77% 55%"
      },
      neutral: {
        background: "20 14% 99%",
        surface: "24 24% 97%",
        on_background: "222 47% 11%",
        on_surface: "222 47% 20%",
        border: "24 11% 91%"
      }
    }
  },
  {
    id: 'ocean-depth',
    name: 'Ocean Depth',
    description: 'Deep blues and teals with aqua accents',
    theme: {
      ...defaultTheme,
      core: {
        primary: "199 89% 48%",
        primary_variant: "199 89% 38%",
        secondary: "187 94% 43%",
        secondary_variant: "187 94% 33%",
        tertiary: "174 72% 56%",
        accent: "166 76% 49%"
      },
      neutral: {
        background: "199 18% 98%",
        surface: "199 32% 96%",
        on_background: "222 47% 11%",
        on_surface: "222 47% 20%",
        border: "199 18% 89%"
      }
    }
  }
];

export const EnhancedMobileThemePanel: React.FC<EnhancedMobileThemePanelProps> = ({
  config,
  updateConfig,
  tenantId,
  appName,
  logoUrl
}) => {
  const [currentTheme, setCurrentTheme] = useState<Modern2025Theme>(defaultTheme);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Initialize theme from config when it changes
  useEffect(() => {
    if (config?.mobile_theme) {
      console.log('Loading mobile theme from config:', config.mobile_theme);
      setCurrentTheme(config.mobile_theme);
    } else if (config?.app_store_config?.mobile_theme) {
      console.log('Loading mobile theme from app_store_config:', config.app_store_config.mobile_theme);
      setCurrentTheme(config.app_store_config.mobile_theme);
    } else {
      console.log('No saved theme found, using default theme');
      setCurrentTheme(defaultTheme);
    }
  }, [config, tenantId]);

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
  };

  const applyPresetTheme = (presetId: string) => {
    const preset = presetThemes.find(t => t.id === presetId);
    if (preset) {
      setCurrentTheme(preset.theme);
      setSelectedPreset(presetId);
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
    toast.success('Generated color variants');
  };

  const saveTheme = () => {
    const errors = validateTheme(currentTheme);
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast.error('Please fix validation errors before saving');
      return;
    }

    updateConfig('mobile_theme', '', currentTheme);
    updateConfig('api_version', '', 'v1');
    updateConfig('is_validated', '', true);
    updateConfig('validation_errors', '', []);
    
    setValidationErrors([]);
    toast.success('Mobile theme configuration saved');
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
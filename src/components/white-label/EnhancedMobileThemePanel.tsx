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
import { Palette, Smartphone, Wand2, Settings, CheckCircle, AlertCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';

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
    id: 'agri-green',
    name: 'Agriculture Green',
    description: 'Fresh green theme for farming apps',
    theme: {
      ...defaultTheme,
      core: {
        primary: "142 71% 45%",
        primary_variant: "142 71% 35%",
        secondary: "84 60% 45%",
        secondary_variant: "84 60% 35%",
        tertiary: "47 90% 50%",
        accent: "25 95% 53%"
      }
    }
  },
  {
    id: 'sky-blue',
    name: 'Sky Blue',
    description: 'Clean modern blue theme',
    theme: {
      ...defaultTheme,
      core: {
        primary: "199 89% 48%",
        primary_variant: "199 89% 38%",
        secondary: "217 91% 60%",
        secondary_variant: "217 91% 50%",
        tertiary: "174 62% 56%",
        accent: "45 93% 47%"
      }
    }
  },
  {
    id: 'earth-brown',
    name: 'Earth Brown',
    description: 'Natural earth tones',
    theme: {
      ...defaultTheme,
      core: {
        primary: "30 41% 32%",
        primary_variant: "30 41% 22%",
        secondary: "25 45% 48%",
        secondary_variant: "25 45% 38%",
        tertiary: "38 92% 50%",
        accent: "15 75% 51%"
      },
      neutral: {
        background: "39 39% 95%",
        surface: "39 24% 98%",
        on_background: "30 41% 15%",
        on_surface: "30 41% 20%",
        border: "30 20% 85%"
      }
    }
  }
];

export const EnhancedMobileThemePanel: React.FC<EnhancedMobileThemePanelProps> = ({
  config,
  updateConfig,
  tenantId
}) => {
  const [currentTheme, setCurrentTheme] = useState<Modern2025Theme>(
    config?.mobile_theme || defaultTheme
  );
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Initialize theme from config
  useEffect(() => {
    if (config?.mobile_theme) {
      setCurrentTheme(config.mobile_theme);
    }
  }, [config]);

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

      <Tabs defaultValue="colors" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="spacing">Spacing</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="colors" className="space-y-6">
          {/* Preset Themes */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Start Themes</CardTitle>
              <CardDescription>Apply a preset theme and customize</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {presetThemes.map(preset => (
                  <Button
                    key={preset.id}
                    variant={selectedPreset === preset.id ? "default" : "outline"}
                    className="h-auto flex-col p-4"
                    onClick={() => applyPresetTheme(preset.id)}
                  >
                    <span className="font-medium">{preset.name}</span>
                    <span className="text-xs text-muted-foreground mt-1">
                      {preset.description}
                    </span>
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
        </TabsContent>

        <TabsContent value="typography" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="spacing" className="space-y-6">
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

          <Card>
            <CardHeader>
              <CardTitle>Border Radius</CardTitle>
              <CardDescription>Corner rounding values</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {['sm', 'md', 'lg', 'full'].map(size => (
                  <div key={size}>
                    <Label>{size.toUpperCase()}</Label>
                    <Input
                      type="number"
                      value={(currentTheme.border_radius as any)?.[size] || 8}
                      onChange={(e) => handleColorChange('border_radius' as any, size, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Theme Preview</CardTitle>
              <CardDescription>Preview your mobile theme configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-6">
                <div className="max-w-sm mx-auto space-y-4">
                  {/* Preview UI Elements */}
                  <div 
                    className="p-4 rounded-lg"
                    style={{ 
                      backgroundColor: `hsl(${currentTheme.neutral.surface})`,
                      color: `hsl(${currentTheme.neutral.on_surface})`
                    }}
                  >
                    <h3 className="font-bold mb-2">Card Title</h3>
                    <p className="text-sm">This is how a card would look with your theme.</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      className="px-4 py-2 rounded"
                      style={{ 
                        backgroundColor: `hsl(${currentTheme.core.primary})`,
                        color: 'white'
                      }}
                    >
                      Primary Button
                    </button>
                    <button
                      className="px-4 py-2 rounded"
                      style={{ 
                        backgroundColor: `hsl(${currentTheme.core.secondary})`,
                        color: 'white'
                      }}
                    >
                      Secondary
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <div 
                      className="px-3 py-1 rounded text-white text-sm"
                      style={{ backgroundColor: `hsl(${currentTheme.status.success})` }}
                    >
                      Success
                    </div>
                    <div 
                      className="px-3 py-1 rounded text-white text-sm"
                      style={{ backgroundColor: `hsl(${currentTheme.status.warning})` }}
                    >
                      Warning
                    </div>
                    <div 
                      className="px-3 py-1 rounded text-white text-sm"
                      style={{ backgroundColor: `hsl(${currentTheme.status.error})` }}
                    >
                      Error
                    </div>
                    <div 
                      className="px-3 py-1 rounded text-white text-sm"
                      style={{ backgroundColor: `hsl(${currentTheme.status.info})` }}
                    >
                      Info
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
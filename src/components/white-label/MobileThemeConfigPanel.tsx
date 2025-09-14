import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Palette, Smartphone, Monitor, Wand2, Settings, CheckCircle } from 'lucide-react';

interface MobileTheme {
  id: string;
  name: string;
  description: string;
  category: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  appIcon: string;
  splashScreen: string;
  displayMode: string;
  orientation: string;
}

interface MobileThemeConfigPanelProps {
  config: any;
  updateConfig: (section: string, field: string, value: any) => void;
}

export const MobileThemeConfigPanel: React.FC<MobileThemeConfigPanelProps> = ({
  config,
  updateConfig
}) => {
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet'>('mobile');
  const [appliedTheme, setAppliedTheme] = useState<string | null>(null);

  const mobileThemes: MobileTheme[] = [
    {
      id: 'agri-green',
      name: 'Agriculture Green',
      description: 'Fresh green theme perfect for agricultural apps',
      category: 'Agriculture',
      colors: {
        primary: '#16a34a',
        secondary: '#65a30d',
        accent: '#84cc16',
        background: '#ffffff',
        text: '#1f2937'
      },
      appIcon: '/themes/agri-green/icon.png',
      splashScreen: '/themes/agri-green/splash.png',
      displayMode: 'standalone',
      orientation: 'portrait'
    },
    {
      id: 'earth-brown',
      name: 'Earth Brown',
      description: 'Natural earth tones for farming applications',
      category: 'Agriculture',
      colors: {
        primary: '#92400e',
        secondary: '#78350f',
        accent: '#d97706',
        background: '#fef3c7',
        text: '#451a03'
      },
      appIcon: '/themes/earth-brown/icon.png',
      splashScreen: '/themes/earth-brown/splash.png',
      displayMode: 'standalone',
      orientation: 'portrait'
    },
    {
      id: 'sky-blue',
      name: 'Sky Blue',
      description: 'Clean and modern blue theme',
      category: 'Technology',
      colors: {
        primary: '#0ea5e9',
        secondary: '#0284c7',
        accent: '#38bdf8',
        background: '#f0f9ff',
        text: '#0c4a6e'
      },
      appIcon: '/themes/sky-blue/icon.png',
      splashScreen: '/themes/sky-blue/splash.png',
      displayMode: 'standalone',
      orientation: 'any'
    },
    {
      id: 'harvest-gold',
      name: 'Harvest Gold',
      description: 'Warm golden theme for harvest season',
      category: 'Agriculture',
      colors: {
        primary: '#f59e0b',
        secondary: '#d97706',
        accent: '#fbbf24',
        background: '#fffbeb',
        text: '#78350f'
      },
      appIcon: '/themes/harvest-gold/icon.png',
      splashScreen: '/themes/harvest-gold/splash.png',
      displayMode: 'fullscreen',
      orientation: 'portrait'
    },
    {
      id: 'ocean-teal',
      name: 'Ocean Teal',
      description: 'Deep teal theme for aquaculture and marine apps',
      category: 'Aquaculture',
      colors: {
        primary: '#0891b2',
        secondary: '#0e7490',
        accent: '#06b6d4',
        background: '#f0fdfa',
        text: '#134e4a'
      },
      appIcon: '/themes/ocean-teal/icon.png',
      splashScreen: '/themes/ocean-teal/splash.png',
      displayMode: 'standalone',
      orientation: 'any'
    },
    {
      id: 'sunset-orange',
      name: 'Sunset Orange',
      description: 'Vibrant orange theme for energy and vitality',
      category: 'Technology',
      colors: {
        primary: '#ea580c',
        secondary: '#dc2626',
        accent: '#fb923c',
        background: '#fff7ed',
        text: '#7c2d12'
      },
      appIcon: '/themes/sunset-orange/icon.png',
      splashScreen: '/themes/sunset-orange/splash.png',
      displayMode: 'fullscreen',
      orientation: 'portrait'
    }
  ];

  const handleApplyTheme = (theme: MobileTheme) => {
    setAppliedTheme(theme.id);
    
    // Store complete mobile theme configuration for mobile app
    const mobileThemeConfig = {
      id: theme.id,
      name: theme.name,
      colors: {
        primary: theme.colors.primary,
        secondary: theme.colors.secondary,
        accent: theme.colors.accent,
        background: theme.colors.background,
        text: theme.colors.text,
        // Additional mobile-specific colors
        statusBar: theme.colors.primary,
        navigationBar: theme.colors.background,
        cardBackground: '#ffffff',
        borderColor: '#e5e7eb',
        successColor: '#10b981',
        warningColor: '#f59e0b',
        errorColor: '#ef4444',
        infoColor: '#3b82f6'
      },
      typography: {
        fontFamily: 'Inter, system-ui, sans-serif',
        headingFontFamily: 'Inter, system-ui, sans-serif',
        fontSize: {
          xs: '12px',
          sm: '14px',
          base: '16px',
          lg: '18px',
          xl: '20px',
          '2xl': '24px',
          '3xl': '30px'
        }
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px'
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        full: '9999px'
      },
      shadows: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }
    };
    
    // Store the complete mobile theme configuration
    updateConfig('pwa_config', 'mobile_theme', mobileThemeConfig);
    updateConfig('pwa_config', 'theme_color', theme.colors.primary);
    updateConfig('pwa_config', 'background_color', theme.colors.background);
    updateConfig('pwa_config', 'display', theme.displayMode);
    updateConfig('pwa_config', 'orientation', theme.orientation);
    
    // Update brand identity with theme colors for consistency
    updateConfig('brand_identity', 'primary_color', theme.colors.primary);
    updateConfig('brand_identity', 'secondary_color', theme.colors.secondary);
    updateConfig('brand_identity', 'accent_color', theme.colors.accent);
    updateConfig('brand_identity', 'background_color', theme.colors.background);
    updateConfig('brand_identity', 'text_color', theme.colors.text);
    
    // Update app icon and splash screen with proper structure
    updateConfig('app_store_config', 'app_icon', theme.appIcon);
    updateConfig('splash_screens', 'default', theme.splashScreen);
    updateConfig('splash_screens', 'ios', {
      url: theme.splashScreen,
      backgroundColor: theme.colors.primary
    });
    updateConfig('splash_screens', 'android', {
      url: theme.splashScreen,
      backgroundColor: theme.colors.primary
    });
  };

  // Get the currently selected or applied theme for preview
  const getPreviewTheme = () => {
    const themeId = selectedTheme || appliedTheme;
    if (themeId) {
      return mobileThemes.find(t => t.id === themeId);
    }
    return null;
  };

  const previewTheme = getPreviewTheme();
  const previewColors = previewTheme ? previewTheme.colors : {
    primary: config.brand_identity?.primary_color || '#3b82f6',
    secondary: config.brand_identity?.secondary_color || '#64748b',
    accent: config.brand_identity?.accent_color || '#10b981',
    background: config.pwa_config?.background_color || '#ffffff',
    text: '#1f2937'
  };

  const MobilePreview = () => (
    <div className={`relative mx-auto transition-all duration-300 ${previewDevice === 'mobile' ? 'w-[280px]' : 'w-[400px]'}`}>
      {/* Device Frame */}
      <div className="relative bg-gray-900 rounded-[2rem] p-1.5 shadow-2xl">
        <div className="absolute top-1/2 -translate-y-1/2 -left-0.5 w-0.5 h-12 bg-gray-800 rounded-l-lg" />
        <div className="absolute top-1/2 -translate-y-1/2 -right-0.5 w-0.5 h-16 bg-gray-800 rounded-r-lg" />
        
        {/* Screen */}
        <div 
          className={`bg-white rounded-[1.5rem] overflow-hidden ${
            previewDevice === 'mobile' ? 'h-[560px]' : 'h-[600px]'
          }`}
          style={{ backgroundColor: previewColors.background }}
        >
          {/* Status Bar */}
          <div className="h-8 bg-black/5 flex items-center justify-between px-4 text-xs">
            <span className="font-medium" style={{ color: previewColors.text }}>9:41</span>
            <div className="flex gap-0.5">
              <div className="w-3 h-2 bg-black/60 rounded-sm" />
              <div className="w-3 h-2 bg-black/60 rounded-sm" />
              <div className="w-3 h-2 bg-black/60 rounded-sm" />
            </div>
          </div>
          
          {/* App Header */}
          <div 
            className="h-14 px-4 flex items-center justify-between shadow-sm"
            style={{ backgroundColor: previewColors.primary }}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white/20 rounded-lg" />
              <span className="text-white font-semibold">
                {config.app_store_config?.app_name || 'Your App'}
              </span>
            </div>
            <div className="flex gap-1.5">
              <div className="w-5 h-5 bg-white/20 rounded-full" />
              <div className="w-5 h-5 bg-white/20 rounded-full" />
            </div>
          </div>
          
          {/* Content Area */}
          <div className="p-4 space-y-3">
            {/* Hero Card */}
            <div 
              className="h-24 rounded-lg p-3 shadow-sm"
              style={{ backgroundColor: previewColors.secondary }}
            >
              <div className="h-1.5 bg-white/60 rounded w-3/4 mb-2" />
              <div className="h-1.5 bg-white/40 rounded w-1/2" />
            </div>
            
            {/* Grid Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div 
                className="h-16 rounded-lg p-2 shadow-sm"
                style={{ backgroundColor: previewColors.accent }}
              >
                <div className="h-1.5 bg-white/60 rounded w-full mb-1.5" />
                <div className="h-1.5 bg-white/40 rounded w-2/3" />
              </div>
              <div 
                className="h-16 rounded-lg p-2 shadow-sm"
                style={{ backgroundColor: previewColors.accent }}
              >
                <div className="h-1.5 bg-white/60 rounded w-full mb-1.5" />
                <div className="h-1.5 bg-white/40 rounded w-2/3" />
              </div>
            </div>
            
            {/* List Items */}
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-2 p-2 bg-gray-50/50 rounded-lg">
                <div 
                  className="w-8 h-8 rounded-full"
                  style={{ backgroundColor: previewColors.primary }}
                />
                <div className="flex-1">
                  <div className="h-1.5 bg-gray-300 rounded w-3/4 mb-1" />
                  <div className="h-1.5 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
          
          {/* Bottom Navigation */}
          <div className="absolute bottom-0 left-0 right-0 h-14 bg-white border-t flex items-center justify-around">
            {[1, 2, 3, 4].map(i => (
              <div 
                key={i}
                className="w-5 h-5 rounded"
                style={{ 
                  backgroundColor: i === 1 
                    ? previewColors.primary
                    : '#e5e7eb'
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mobile & PWA Configuration</CardTitle>
        <CardDescription>
          Choose from pre-designed themes and see live preview of your mobile app appearance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="themes" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="themes">
              <Palette className="w-4 h-4 mr-2" />
              Themes & Preview
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              PWA Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="themes" className="space-y-4">
            <div className="grid lg:grid-cols-[1fr,400px] gap-6">
              {/* Themes Selection */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Select Theme</h3>
                  <div className="flex gap-2">
                    <Button
                      variant={previewDevice === 'mobile' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPreviewDevice('mobile')}
                    >
                      <Smartphone className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={previewDevice === 'tablet' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPreviewDevice('tablet')}
                    >
                      <Monitor className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-[600px] pr-4">
                  <div className="grid gap-3">
                    {mobileThemes.map(theme => (
                      <div
                        key={theme.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          selectedTheme === theme.id 
                            ? 'border-primary ring-2 ring-primary/20 bg-primary/5' 
                            : 'hover:border-primary/50 hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedTheme(theme.id)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{theme.name}</h4>
                              {appliedTheme === theme.id && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{theme.description}</p>
                          </div>
                          <Badge variant="outline" className="ml-2">{theme.category}</Badge>
                        </div>
                        
                        {/* Color Preview */}
                        <div className="flex gap-1.5 mb-3">
                          {Object.entries(theme.colors).slice(0, 5).map(([key, color]) => (
                            <div
                              key={key}
                              className="flex-1 h-6 rounded border border-border"
                              style={{ backgroundColor: color }}
                              title={key}
                            />
                          ))}
                        </div>
                        
                        <Button
                          size="sm"
                          className="w-full"
                          variant={appliedTheme === theme.id ? 'secondary' : 'default'}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyTheme(theme);
                          }}
                        >
                          {appliedTheme === theme.id ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Applied
                            </>
                          ) : (
                            <>
                              <Wand2 className="w-4 h-4 mr-2" />
                              Apply Theme
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Live Preview */}
              <div className="lg:sticky lg:top-4">
                <Card className="bg-muted/30">
                  <CardHeader className="pb-3">
                    <h3 className="text-lg font-semibold">Live Preview</h3>
                    {selectedTheme && (
                      <p className="text-sm text-muted-foreground">
                        Previewing: {mobileThemes.find(t => t.id === selectedTheme)?.name}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="flex justify-center py-4">
                    <MobilePreview />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="grid gap-6 max-w-2xl">
              {/* App Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">App Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="app_name">App Name</Label>
                    <Input
                      id="app_name"
                      value={config.app_store_config?.app_name || ''}
                      onChange={(e) => updateConfig('app_store_config', 'app_name', e.target.value)}
                      placeholder="Your App Name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="short_name">Short Name (Home Screen)</Label>
                    <Input
                      id="short_name"
                      value={config.pwa_config?.short_name || ''}
                      onChange={(e) => updateConfig('pwa_config', 'short_name', e.target.value)}
                      placeholder="Short Name"
                    />
                  </div>
                </div>
              </div>

              {/* PWA Features */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">PWA Features</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>Enable PWA Features</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow users to install as a Progressive Web App
                      </p>
                    </div>
                    <Switch
                      checked={config.distribution?.pwa_enabled || false}
                      onCheckedChange={(checked) => updateConfig('distribution', 'pwa_enabled', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>Offline Support</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable offline functionality with service workers
                      </p>
                    </div>
                    <Switch
                      checked={config.distribution?.pwa_offline_support || false}
                      onCheckedChange={(checked) => updateConfig('distribution', 'pwa_offline_support', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>Auto Updates</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically update the app when new versions are available
                      </p>
                    </div>
                    <Switch
                      checked={config.distribution?.auto_updates || false}
                      onCheckedChange={(checked) => updateConfig('distribution', 'auto_updates', checked)}
                    />
                  </div>
                </div>
              </div>

              {/* Display Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Display Settings</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Display Mode</Label>
                    <select
                      className="w-full p-2 border rounded-md bg-background"
                      value={config.pwa_config?.display || 'standalone'}
                      onChange={(e) => updateConfig('pwa_config', 'display', e.target.value)}
                    >
                      <option value="standalone">Standalone (No Browser UI)</option>
                      <option value="fullscreen">Fullscreen</option>
                      <option value="minimal-ui">Minimal UI</option>
                      <option value="browser">Browser</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Orientation</Label>
                    <select
                      className="w-full p-2 border rounded-md bg-background"
                      value={config.pwa_config?.orientation || 'portrait'}
                      onChange={(e) => updateConfig('pwa_config', 'orientation', e.target.value)}
                    >
                      <option value="portrait">Portrait Only</option>
                      <option value="landscape">Landscape Only</option>
                      <option value="any">Any Orientation</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
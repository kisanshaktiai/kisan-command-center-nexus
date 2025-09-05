import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Palette, Smartphone, Monitor, Wand2, Eye, Upload } from 'lucide-react';

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
    }
  ];

  const handleApplyTheme = (theme: MobileTheme) => {
    // Apply theme to brand identity
    updateConfig('brand_identity', 'primary_color', theme.colors.primary);
    updateConfig('brand_identity', 'secondary_color', theme.colors.secondary);
    updateConfig('brand_identity', 'accent_color', theme.colors.accent);
    
    // Apply to PWA config
    updateConfig('pwa_config', 'theme_color', theme.colors.primary);
    updateConfig('pwa_config', 'background_color', theme.colors.background);
    updateConfig('pwa_config', 'display', theme.displayMode);
    updateConfig('pwa_config', 'orientation', theme.orientation);
    
    // Apply to app store config
    updateConfig('app_store_config', 'app_icon', theme.appIcon);
    updateConfig('splash_screens', 'mobile_splash', theme.splashScreen);
    
    setSelectedTheme(theme.id);
  };

  const MobilePreview = () => (
    <div className={`relative mx-auto ${previewDevice === 'mobile' ? 'w-[375px]' : 'w-[768px]'}`}>
      {/* Device Frame */}
      <div className="relative bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl">
        <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-1 h-16 bg-gray-800 rounded-l-lg" />
        <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-1 h-20 bg-gray-800 rounded-r-lg" />
        
        {/* Screen */}
        <div 
          className={`bg-white rounded-[2rem] overflow-hidden ${
            previewDevice === 'mobile' ? 'h-[812px]' : 'h-[1024px]'
          }`}
          style={{ backgroundColor: config.pwa_config?.background_color || '#ffffff' }}
        >
          {/* Status Bar */}
          <div className="h-11 bg-black/5 flex items-center justify-between px-6">
            <span className="text-xs font-medium">9:41</span>
            <div className="flex gap-1">
              <div className="w-4 h-3 bg-black/60 rounded-sm" />
              <div className="w-4 h-3 bg-black/60 rounded-sm" />
              <div className="w-4 h-3 bg-black/60 rounded-sm" />
            </div>
          </div>
          
          {/* App Header */}
          <div 
            className="h-16 px-6 flex items-center justify-between"
            style={{ backgroundColor: config.brand_identity?.primary_color || '#3b82f6' }}
          >
            <div className="flex items-center gap-3">
              {config.app_store_config?.app_icon && (
                <img 
                  src={config.app_store_config.app_icon} 
                  alt="App Icon" 
                  className="w-8 h-8 rounded-lg"
                />
              )}
              <span className="text-white font-semibold text-lg">
                {config.app_store_config?.app_name || 'Your App'}
              </span>
            </div>
            <div className="flex gap-2">
              <div className="w-6 h-6 bg-white/20 rounded-full" />
              <div className="w-6 h-6 bg-white/20 rounded-full" />
            </div>
          </div>
          
          {/* Content Area */}
          <div className="p-6 space-y-4">
            <div 
              className="h-32 rounded-lg p-4"
              style={{ backgroundColor: config.brand_identity?.secondary_color || '#64748b' }}
            >
              <div className="h-2 bg-white/60 rounded w-3/4 mb-3" />
              <div className="h-2 bg-white/40 rounded w-1/2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div 
                className="h-24 rounded-lg p-3"
                style={{ backgroundColor: config.brand_identity?.accent_color || '#10b981' }}
              >
                <div className="h-2 bg-white/60 rounded w-full mb-2" />
                <div className="h-2 bg-white/40 rounded w-2/3" />
              </div>
              <div 
                className="h-24 rounded-lg p-3"
                style={{ backgroundColor: config.brand_identity?.accent_color || '#10b981' }}
              >
                <div className="h-2 bg-white/60 rounded w-full mb-2" />
                <div className="h-2 bg-white/40 rounded w-2/3" />
              </div>
            </div>
            
            {/* List Items */}
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div 
                  className="w-10 h-10 rounded-full"
                  style={{ backgroundColor: config.brand_identity?.primary_color || '#3b82f6' }}
                />
                <div className="flex-1">
                  <div className="h-2 bg-gray-300 rounded w-3/4 mb-2" />
                  <div className="h-2 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
          
          {/* Bottom Navigation */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-white border-t flex items-center justify-around">
            {[1, 2, 3, 4].map(i => (
              <div 
                key={i}
                className="w-6 h-6 rounded"
                style={{ 
                  backgroundColor: i === 1 
                    ? config.brand_identity?.primary_color || '#3b82f6'
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
          Choose from pre-designed themes or customize your mobile app appearance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="themes">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="themes">
              <Palette className="w-4 h-4 mr-2" />
              Themes
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Smartphone className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="themes" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {mobileThemes.map(theme => (
                <div
                  key={theme.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedTheme === theme.id 
                      ? 'border-primary ring-2 ring-primary/20' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedTheme(theme.id)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium">{theme.name}</h4>
                      <p className="text-sm text-muted-foreground">{theme.description}</p>
                    </div>
                    <Badge variant="outline">{theme.category}</Badge>
                  </div>
                  
                  {/* Color Preview */}
                  <div className="flex gap-2 mb-3">
                    {Object.entries(theme.colors).slice(0, 4).map(([key, color]) => (
                      <div
                        key={key}
                        className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: color }}
                        title={key}
                      />
                    ))}
                  </div>
                  
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApplyTheme(theme);
                    }}
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    Apply Theme
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <div className="flex justify-center gap-2 mb-4">
              <Button
                variant={previewDevice === 'mobile' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewDevice('mobile')}
              >
                <Smartphone className="w-4 h-4 mr-2" />
                Phone
              </Button>
              <Button
                variant={previewDevice === 'tablet' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewDevice('tablet')}
              >
                <Monitor className="w-4 h-4 mr-2" />
                Tablet
              </Button>
            </div>
            
            <div className="overflow-x-auto pb-4">
              <MobilePreview />
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="app_name">App Name</Label>
                <Input
                  id="app_name"
                  value={config.app_store_config?.app_name || ''}
                  onChange={(e) => updateConfig('app_store_config', 'app_name', e.target.value)}
                  placeholder="Your App Name"
                />
              </div>
              
              <div>
                <Label htmlFor="short_name">Short Name (Home Screen)</Label>
                <Input
                  id="short_name"
                  value={config.pwa_config?.short_name || ''}
                  onChange={(e) => updateConfig('pwa_config', 'short_name', e.target.value)}
                  placeholder="Short Name"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
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

              <div className="flex items-center justify-between">
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

              <div className="flex items-center justify-between">
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

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Display Mode</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={config.pwa_config?.display || 'standalone'}
                  onChange={(e) => updateConfig('pwa_config', 'display', e.target.value)}
                >
                  <option value="standalone">Standalone (No Browser UI)</option>
                  <option value="fullscreen">Fullscreen</option>
                  <option value="minimal-ui">Minimal UI</option>
                  <option value="browser">Browser</option>
                </select>
              </div>
              
              <div>
                <Label>Orientation</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={config.pwa_config?.orientation || 'portrait'}
                  onChange={(e) => updateConfig('pwa_config', 'orientation', e.target.value)}
                >
                  <option value="portrait">Portrait Only</option>
                  <option value="landscape">Landscape Only</option>
                  <option value="any">Any Orientation</option>
                </select>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
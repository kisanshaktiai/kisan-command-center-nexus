
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Smartphone, Menu, Eye, Zap, Upload, Settings } from 'lucide-react';

interface AdvancedAppCustomizationPanelProps {
  config: any;
  updateConfig: (section: string, field: string, value: any) => void;
}

export function AdvancedAppCustomizationPanel({ config, updateConfig }: AdvancedAppCustomizationPanelProps) {
  const handleMenuItemUpdate = (index: number, field: string, value: any) => {
    const currentMenu = config.app_customization?.custom_menu || [];
    const newMenu = [...currentMenu];
    newMenu[index] = { ...newMenu[index], [field]: value };
    updateConfig('app_customization', 'custom_menu', newMenu);
  };

  const addMenuItem = () => {
    const currentMenu = config.app_customization?.custom_menu || [];
    const newMenuItem = {
      id: `custom_${Date.now()}`,
      title: 'New Menu Item',
      icon: 'menu',
      route: '/custom-route',
      visible: true,
      order: currentMenu.length
    };
    updateConfig('app_customization', 'custom_menu', [...currentMenu, newMenuItem]);
  };

  const removeMenuItem = (index: number) => {
    const currentMenu = config.app_customization?.custom_menu || [];
    const newMenu = currentMenu.filter((_, i) => i !== index);
    updateConfig('app_customization', 'custom_menu', newMenu);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Advanced App Customization
        </CardTitle>
        <CardDescription>
          Deep customization of app behavior, UI, and user experience
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="bundle" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="bundle" className="flex items-center gap-1">
              <Settings className="w-4 h-4" />
              Bundle
            </TabsTrigger>
            <TabsTrigger value="menu" className="flex items-center gap-1">
              <Menu className="w-4 h-4" />
              Menu
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-1">
              <Zap className="w-4 h-4" />
              Features
            </TabsTrigger>
            <TabsTrigger value="animations" className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              Animations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bundle" className="space-y-4">
            <div>
              <Label htmlFor="bundle_id">Bundle ID</Label>
              <Input
                id="bundle_id"
                value={config.app_customization?.bundle_id || ''}
                onChange={(e) => updateConfig('app_customization', 'bundle_id', e.target.value)}
                placeholder="com.yourcompany.kisanshakti"
              />
              <p className="text-sm text-gray-500 mt-1">
                Unique identifier for your app. Cannot be changed after publishing.
              </p>
            </div>

            <div>
              <Label htmlFor="app_version">App Version</Label>
              <Input
                id="app_version"
                value={config.app_customization?.app_version || ''}
                onChange={(e) => updateConfig('app_customization', 'app_version', e.target.value)}
                placeholder="1.0.0"
              />
            </div>

            <div>
              <Label htmlFor="build_number">Build Number</Label>
              <Input
                id="build_number"
                type="number"
                value={config.app_customization?.build_number || ''}
                onChange={(e) => updateConfig('app_customization', 'build_number', parseInt(e.target.value))}
                placeholder="1"
              />
            </div>

            <div>
              <Label htmlFor="minimum_os_version">Minimum OS Version</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={config.app_customization?.minimum_ios_version || ''}
                  onChange={(e) => updateConfig('app_customization', 'minimum_ios_version', e.target.value)}
                  placeholder="iOS 13.0"
                />
                <Input
                  value={config.app_customization?.minimum_android_version || ''}
                  onChange={(e) => updateConfig('app_customization', 'minimum_android_version', e.target.value)}
                  placeholder="Android 8.0 (API 26)"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="supported_languages">Supported Languages (comma-separated)</Label>
              <Input
                id="supported_languages"
                value={config.app_customization?.supported_languages || ''}
                onChange={(e) => updateConfig('app_customization', 'supported_languages', e.target.value)}
                placeholder="en, hi, mr, gu, ta, te"
              />
            </div>
          </TabsContent>

          <TabsContent value="menu" className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Custom Menu Items</Label>
              <Button onClick={addMenuItem} size="sm" variant="outline">
                Add Menu Item
              </Button>
            </div>

            <div className="space-y-3">
              {(config.app_customization?.custom_menu || []).map((item: any, index: number) => (
                <div key={index} className="border rounded-md p-4">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={item.title || ''}
                        onChange={(e) => handleMenuItemUpdate(index, 'title', e.target.value)}
                        placeholder="Menu Title"
                      />
                    </div>
                    <div>
                      <Label>Icon</Label>
                      <Input
                        value={item.icon || ''}
                        onChange={(e) => handleMenuItemUpdate(index, 'icon', e.target.value)}
                        placeholder="menu"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <Label>Route</Label>
                      <Input
                        value={item.route || ''}
                        onChange={(e) => handleMenuItemUpdate(index, 'route', e.target.value)}
                        placeholder="/custom-route"
                      />
                    </div>
                    <div>
                      <Label>Order</Label>
                      <Input
                        type="number"
                        value={item.order || 0}
                        onChange={(e) => handleMenuItemUpdate(index, 'order', parseInt(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={item.visible !== false}
                        onCheckedChange={(checked) => handleMenuItemUpdate(index, 'visible', checked)}
                      />
                      <Label>Visible</Label>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeMenuItem(index)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            <div>
              <Label>Module Visibility Controls</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                {[
                  { key: 'weather', label: 'Weather Data' },
                  { key: 'satellite', label: 'Satellite Imagery' },
                  { key: 'market_prices', label: 'Market Prices' },
                  { key: 'crop_advisory', label: 'Crop Advisory' },
                  { key: 'financial_tracking', label: 'Financial Tracking' },
                  { key: 'land_management', label: 'Land Management' },
                  { key: 'analytics', label: 'Analytics Dashboard' },
                  { key: 'notifications', label: 'Push Notifications' }
                ].map((module) => (
                  <div key={module.key} className="flex items-center space-x-2">
                    <Switch
                      checked={config.app_customization?.visible_modules?.[module.key] !== false}
                      onCheckedChange={(checked) => {
                        const current = config.app_customization?.visible_modules || {};
                        updateConfig('app_customization', 'visible_modules', {
                          ...current,
                          [module.key]: checked
                        });
                      }}
                    />
                    <Label>{module.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="custom_fields">Custom Fields Configuration (JSON)</Label>
              <Textarea
                id="custom_fields"
                value={config.app_customization?.custom_fields || ''}
                onChange={(e) => updateConfig('app_customization', 'custom_fields', e.target.value)}
                placeholder={`{
  "farmer_profile": [
    {"name": "cooperative_member", "type": "boolean", "label": "Cooperative Member"},
    {"name": "certification", "type": "select", "label": "Organic Certification", "options": ["None", "In Progress", "Certified"]}
  ]
}`}
                rows={8}
              />
            </div>

            <div>
              <Label htmlFor="business_rules">Business Rules (JSON)</Label>
              <Textarea
                id="business_rules"
                value={config.app_customization?.business_rules || ''}
                onChange={(e) => updateConfig('app_customization', 'business_rules', e.target.value)}
                placeholder={`{
  "max_land_size_acres": 1000,
  "require_soil_test": true,
  "auto_approve_small_farmers": true,
  "minimum_age": 18
}`}
                rows={6}
              />
            </div>
          </TabsContent>

          <TabsContent value="animations" className="space-y-4">
            <div>
              <Label htmlFor="loading_animation_url">Custom Loading Animation URL</Label>
              <div className="flex gap-2">
                <Input
                  id="loading_animation_url"
                  value={config.app_customization?.loading_animation_url || ''}
                  onChange={(e) => updateConfig('app_customization', 'loading_animation_url', e.target.value)}
                  placeholder="https://example.com/loading.gif"
                />
                <Button variant="outline">
                  <Upload className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="transition_duration">Transition Duration (ms)</Label>
              <Input
                id="transition_duration"
                type="number"
                value={config.app_customization?.transition_duration || 300}
                onChange={(e) => updateConfig('app_customization', 'transition_duration', parseInt(e.target.value))}
                min="100"
                max="1000"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="enable_animations"
                checked={config.app_customization?.animations_enabled !== false}
                onCheckedChange={(checked) => updateConfig('app_customization', 'animations_enabled', checked)}
              />
              <Label htmlFor="enable_animations">Enable Animations</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="reduce_motion"
                checked={config.app_customization?.respect_reduce_motion || true}
                onCheckedChange={(checked) => updateConfig('app_customization', 'respect_reduce_motion', checked)}
              />
              <Label htmlFor="reduce_motion">Respect User's Reduce Motion Preference</Label>
            </div>

            <div>
              <Label htmlFor="animation_preset">Animation Preset</Label>
              <select
                className="w-full p-2 border rounded-md"
                value={config.app_customization?.animation_preset || 'standard'}
                onChange={(e) => updateConfig('app_customization', 'animation_preset', e.target.value)}
              >
                <option value="minimal">Minimal</option>
                <option value="standard">Standard</option>
                <option value="smooth">Smooth</option>
                <option value="playful">Playful</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

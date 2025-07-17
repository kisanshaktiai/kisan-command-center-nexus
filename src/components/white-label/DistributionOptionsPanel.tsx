
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Smartphone, Globe, Package, Link, Download, Settings } from 'lucide-react';

interface DistributionOptionsPanelProps {
  config: any;
  updateConfig: (section: string, field: string, value: any) => void;
}

export function DistributionOptionsPanel({ config, updateConfig }: DistributionOptionsPanelProps) {
  const generateManifest = () => {
    const manifest = {
      name: config.app_store_config?.app_name || 'KisanShaktiAI',
      short_name: config.pwa_config?.short_name || 'KisanShakti',
      description: config.pwa_config?.description || 'Agricultural management platform',
      start_url: '/',
      display: config.pwa_config?.display || 'standalone',
      background_color: config.pwa_config?.background_color || '#ffffff',
      theme_color: config.pwa_config?.theme_color || '#3b82f6',
      orientation: config.pwa_config?.orientation || 'portrait',
      icons: config.pwa_config?.icons || [
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    };

    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'manifest.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Distribution Options
        </CardTitle>
        <CardDescription>
          Configure app distribution, updates, and deployment options
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pwa" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pwa" className="flex items-center gap-1">
              <Globe className="w-4 h-4" />
              PWA
            </TabsTrigger>
            <TabsTrigger value="private-store" className="flex items-center gap-1">
              <Package className="w-4 h-4" />
              Private Store
            </TabsTrigger>
            <TabsTrigger value="deep-links" className="flex items-center gap-1">
              <Link className="w-4 h-4" />
              Deep Links
            </TabsTrigger>
            <TabsTrigger value="updates" className="flex items-center gap-1">
              <Download className="w-4 h-4" />
              Updates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pwa" className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="enable_pwa"
                checked={config.distribution?.pwa_enabled || false}
                onCheckedChange={(checked) => updateConfig('distribution', 'pwa_enabled', checked)}
              />
              <Label htmlFor="enable_pwa">Enable Progressive Web App</Label>
              <Badge variant="secondary">Recommended</Badge>
            </div>

            {config.distribution?.pwa_enabled && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="pwa_install_prompt">Custom Install Prompt Text</Label>
                  <Input
                    id="pwa_install_prompt"
                    value={config.distribution?.pwa_install_prompt || ''}
                    onChange={(e) => updateConfig('distribution', 'pwa_install_prompt', e.target.value)}
                    placeholder="Install our app for a better experience!"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="pwa_offline_support"
                    checked={config.distribution?.pwa_offline_support || false}
                    onCheckedChange={(checked) => updateConfig('distribution', 'pwa_offline_support', checked)}
                  />
                  <Label htmlFor="pwa_offline_support">Enable Offline Support</Label>
                </div>

                <div>
                  <Label htmlFor="pwa_cache_strategy">Cache Strategy</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={config.distribution?.pwa_cache_strategy || 'network-first'}
                    onChange={(e) => updateConfig('distribution', 'pwa_cache_strategy', e.target.value)}
                  >
                    <option value="cache-first">Cache First</option>
                    <option value="network-first">Network First</option>
                    <option value="cache-only">Cache Only</option>
                    <option value="network-only">Network Only</option>
                    <option value="stale-while-revalidate">Stale While Revalidate</option>
                  </select>
                </div>

                <Button onClick={generateManifest} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download Manifest
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="private-store" className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="enable_private_store"
                checked={config.distribution?.private_store_enabled || false}
                onCheckedChange={(checked) => updateConfig('distribution', 'private_store_enabled', checked)}
              />
              <Label htmlFor="enable_private_store">Enable Private App Store</Label>
              <Badge variant="outline">Enterprise</Badge>
            </div>

            {config.distribution?.private_store_enabled && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="store_url">Private Store URL</Label>
                  <Input
                    id="store_url"
                    value={config.distribution?.store_url || ''}
                    onChange={(e) => updateConfig('distribution', 'store_url', e.target.value)}
                    placeholder="https://apps.yourcompany.com"
                  />
                </div>

                <div>
                  <Label htmlFor="store_name">Store Name</Label>
                  <Input
                    id="store_name"
                    value={config.distribution?.store_name || ''}
                    onChange={(e) => updateConfig('distribution', 'store_name', e.target.value)}
                    placeholder="Your Company App Store"
                  />
                </div>

                <div>
                  <Label htmlFor="distribution_groups">Distribution Groups (comma-separated)</Label>
                  <Input
                    id="distribution_groups"
                    value={config.distribution?.distribution_groups || ''}
                    onChange={(e) => updateConfig('distribution', 'distribution_groups', e.target.value)}
                    placeholder="beta-testers, internal-team, enterprise-customers"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="require_authentication"
                    checked={config.distribution?.require_authentication || false}
                    onCheckedChange={(checked) => updateConfig('distribution', 'require_authentication', checked)}
                  />
                  <Label htmlFor="require_authentication">Require Authentication for Download</Label>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="deep-links" className="space-y-4">
            <div>
              <Label htmlFor="url_scheme">Custom URL Scheme</Label>
              <Input
                id="url_scheme"
                value={config.distribution?.url_scheme || ''}
                onChange={(e) => updateConfig('distribution', 'url_scheme', e.target.value)}
                placeholder="yourapp://"
              />
            </div>

            <div>
              <Label htmlFor="universal_links_domain">Universal Links Domain</Label>
              <Input
                id="universal_links_domain"
                value={config.distribution?.universal_links_domain || ''}
                onChange={(e) => updateConfig('distribution', 'universal_links_domain', e.target.value)}
                placeholder="app.yourcompany.com"
              />
            </div>

            <div>
              <Label htmlFor="deep_link_routes">Deep Link Routes (JSON)</Label>
              <Textarea
                id="deep_link_routes"
                value={config.distribution?.deep_link_routes || ''}
                onChange={(e) => updateConfig('distribution', 'deep_link_routes', e.target.value)}
                placeholder={`{
  "/farm/{id}": "FarmDetailsScreen",
  "/weather/{location}": "WeatherScreen",
  "/market-prices": "MarketPricesScreen"
}`}
                rows={6}
              />
            </div>
          </TabsContent>

          <TabsContent value="updates" className="space-y-4">
            <div>
              <Label htmlFor="update_channel">Update Channel</Label>
              <select
                className="w-full p-2 border rounded-md"
                value={config.distribution?.update_channel || 'stable'}
                onChange={(e) => updateConfig('distribution', 'update_channel', e.target.value)}
              >
                <option value="stable">Stable</option>
                <option value="beta">Beta</option>
                <option value="alpha">Alpha</option>
                <option value="development">Development</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="auto_updates"
                checked={config.distribution?.auto_updates || true}
                onCheckedChange={(checked) => updateConfig('distribution', 'auto_updates', checked)}
              />
              <Label htmlFor="auto_updates">Enable Automatic Updates</Label>
            </div>

            <div>
              <Label htmlFor="update_check_interval">Update Check Interval (hours)</Label>
              <Input
                id="update_check_interval"
                type="number"
                value={config.distribution?.update_check_interval || 24}
                onChange={(e) => updateConfig('distribution', 'update_check_interval', parseInt(e.target.value))}
                min="1"
                max="168"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="force_update"
                checked={config.distribution?.force_update || false}
                onCheckedChange={(checked) => updateConfig('distribution', 'force_update', checked)}
              />
              <Label htmlFor="force_update">Force Critical Updates</Label>
            </div>

            <div>
              <Label htmlFor="minimum_version">Minimum Supported Version</Label>
              <Input
                id="minimum_version"
                value={config.distribution?.minimum_version || ''}
                onChange={(e) => updateConfig('distribution', 'minimum_version', e.target.value)}
                placeholder="1.0.0"
              />
            </div>

            <div>
              <Label htmlFor="update_message">Update Notification Message</Label>
              <Textarea
                id="update_message"
                value={config.distribution?.update_message || ''}
                onChange={(e) => updateConfig('distribution', 'update_message', e.target.value)}
                placeholder="A new version is available with improved features and bug fixes."
                rows={3}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

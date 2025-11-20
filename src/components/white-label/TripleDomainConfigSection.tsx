import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Globe, 
  Users, 
  Smartphone, 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  Cloud,
  ExternalLink
} from 'lucide-react';
import { DomainValidationSection } from './DomainValidationSection';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

// URL validation schema
const urlSchema = z.string().refine(
  (val) => {
    if (!val) return true; // Allow empty
    // Domain regex: alphanumeric, hyphens, dots, minimum 2-char TLD
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    return domainRegex.test(val);
  },
  { message: 'Invalid domain format (e.g., example.com or sub.example.com)' }
);

interface DomainPortalConfig {
  subdomain?: string | null;
  custom_domain?: string | null;
  ssl_enabled: boolean;
  dns_verified: boolean;
  status: 'not_configured' | 'pending' | 'active' | 'failed' | 'verifying';
}

interface CloudflareConfig {
  enabled: boolean;
  zone_id?: string | null;
  api_token?: string | null;
  auto_dns: boolean;
  proxied: boolean;
}

interface DomainConfig {
  public_website: DomainPortalConfig;
  tenant_portal: DomainPortalConfig;
  farmer_app: DomainPortalConfig;
  cloudflare: CloudflareConfig;
}

type PortalType = 'public_website' | 'tenant_portal' | 'farmer_app';

interface TripleDomainConfigSectionProps {
  domainConfig: Partial<DomainConfig>;
  tenantId: string;
  onUpdate: (updates: any) => void;
  isLoading?: boolean;
}

export const TripleDomainConfigSection: React.FC<TripleDomainConfigSectionProps> = ({
  domainConfig,
  tenantId,
  onUpdate,
  isLoading = false
}) => {
  const [activeTab, setActiveTab] = useState<PortalType>('public_website');
  const [cloudflareConfig, setCloudflareConfig] = useState<CloudflareConfig>(
    domainConfig?.cloudflare || {
      enabled: false,
      auto_dns: false,
      proxied: true
    }
  );
  const [isTesting, setIsTesting] = useState(false);

  // Initialize domain configs with defaults
  const publicWebsite = domainConfig?.public_website || { 
    ssl_enabled: true, 
    dns_verified: false, 
    status: 'not_configured' as const 
  };
  const tenantPortal = domainConfig?.tenant_portal || { 
    ssl_enabled: true, 
    dns_verified: false, 
    status: 'not_configured' as const 
  };
  const farmerApp = domainConfig?.farmer_app || { 
    ssl_enabled: true, 
    dns_verified: false, 
    status: 'not_configured' as const 
  };

  const handleDomainUpdate = (portalType: PortalType, field: 'subdomain' | 'custom_domain', value: string) => {
    // Validate URL if it's a custom_domain
    if (field === 'custom_domain' && value) {
      const validation = urlSchema.safeParse(value);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }
    }

    const currentConfig = portalType === 'public_website' ? publicWebsite : 
                         portalType === 'tenant_portal' ? tenantPortal : farmerApp;
    
    // Pass the updated domainConfig object directly (not wrapped)
    onUpdate({
      ...domainConfig,
      [portalType]: {
        ...currentConfig,
        [field]: value || null
      }
    });
  };

  const handleCloudflareUpdate = (field: keyof CloudflareConfig, value: any) => {
    const updated = {
      ...cloudflareConfig,
      [field]: value
    };
    setCloudflareConfig(updated);
    
    // Pass the updated domainConfig object directly (not wrapped)
    onUpdate({
      ...domainConfig,
      cloudflare: updated
    });
  };

  const testCloudflareConnection = async () => {
    if (!cloudflareConfig.zone_id || !cloudflareConfig.api_token) {
      toast.error('Please enter both Zone ID and API Token');
      return;
    }

    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-utilities', {
        body: {
          action: 'cloudflare_dns',
          operation: 'list_records',
          tenant_id: tenantId,
          cloudflare_config: {
            zone_id: cloudflareConfig.zone_id,
            api_token: cloudflareConfig.api_token,
            proxied: cloudflareConfig.proxied
          }
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Cloudflare connection successful!');
      } else {
        toast.error(data?.error || 'Failed to connect to Cloudflare');
      }
    } catch (error: any) {
      console.error('Cloudflare test error:', error);
      toast.error(`Connection failed: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const getPortalIcon = (portalType: PortalType) => {
    const icons = {
      public_website: Globe,
      tenant_portal: Users,
      farmer_app: Smartphone
    };
    const Icon = icons[portalType];
    return <Icon className="h-4 w-4" />;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string; icon: any }> = {
      active: { variant: 'default', label: 'Active', icon: CheckCircle },
      pending: { variant: 'secondary', label: 'Pending', icon: Loader2 },
      failed: { variant: 'destructive', label: 'Failed', icon: XCircle },
      verifying: { variant: 'secondary', label: 'Verifying', icon: Loader2 },
      not_configured: { variant: 'outline', label: 'Not Configured', icon: AlertCircle }
    };
    
    const config = variants[status] || variants.not_configured;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPortalTypeDescription = (portalType: PortalType): string => {
    const descriptions: Record<PortalType, string> = {
      public_website: 'Main website for public access (e.g., www.kisanai.com)',
      tenant_portal: 'Partner/tenant management portal (e.g., partner.kisanai.com)',
      farmer_app: 'Mobile app and farmer interface (e.g., app.kisanai.com)'
    };
    return descriptions[portalType];
  };

  const getPortalTypeLabel = (portalType: PortalType): string => {
    const labels: Record<PortalType, string> = {
      public_website: 'Public Website',
      tenant_portal: 'Tenant Portal',
      farmer_app: 'Farmer App'
    };
    return labels[portalType];
  };

  const renderDomainPortalConfig = (portalType: PortalType) => {
    const config = portalType === 'public_website' ? publicWebsite :
                   portalType === 'tenant_portal' ? tenantPortal : farmerApp;
    
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            {getPortalIcon(portalType)}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{getPortalTypeLabel(portalType)}</h3>
            <p className="text-sm text-muted-foreground">{getPortalTypeDescription(portalType)}</p>
          </div>
          {getStatusBadge(config.status)}
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>Subdomain</Label>
          <p className="text-xs text-muted-foreground">
            Example: {portalType === 'public_website' ? 'www' : portalType === 'tenant_portal' ? 'partner' : 'app'}.yourdomain.com
          </p>
          <DomainValidationSection
            domain={config.subdomain || ''}
            onDomainChange={(value) => handleDomainUpdate(portalType, 'subdomain', value)}
            type="subdomain"
            tenantId={tenantId}
          />
        </div>

        <div className="space-y-2">
          <Label>Custom Domain</Label>
          <p className="text-xs text-muted-foreground">
            Full domain (e.g., {portalType === 'public_website' ? 'www.yourdomain.com' : portalType === 'tenant_portal' ? 'partner.yourdomain.com' : 'app.yourdomain.com'})
          </p>
          <DomainValidationSection
            domain={config.custom_domain || ''}
            onDomainChange={(value) => handleDomainUpdate(portalType, 'custom_domain', value)}
            type="custom_domain"
            tenantId={tenantId}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium">SSL Certificate</p>
              <p className="text-xs text-muted-foreground">
                {config.ssl_enabled ? 'Enabled and active' : 'Not configured'}
              </p>
            </div>
          </div>
          <Switch checked={config.ssl_enabled} disabled />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium">DNS Verification</p>
              <p className="text-xs text-muted-foreground">
                {config.dns_verified ? 'Verified' : 'Pending verification'}
              </p>
            </div>
          </div>
          {config.dns_verified ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-500" />
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Triple Domain Configuration
        </CardTitle>
        <CardDescription>
          Configure three separate domains: Public Website, Partner Portal, and Farmer App
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cloud className="h-4 w-4" />
              Cloudflare DNS Integration
            </CardTitle>
            <CardDescription>
              Automatically manage DNS records via Cloudflare
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Cloudflare</Label>
                <p className="text-xs text-muted-foreground">
                  Automatic DNS management and SSL provisioning
                </p>
              </div>
              <Switch
                checked={cloudflareConfig.enabled}
                onCheckedChange={(checked) => handleCloudflareUpdate('enabled', checked)}
              />
            </div>

            {cloudflareConfig.enabled && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cloudflare-zone-id">Zone ID</Label>
                    <Input
                      id="cloudflare-zone-id"
                      placeholder="Enter your Cloudflare Zone ID"
                      value={cloudflareConfig.zone_id || ''}
                      onChange={(e) => handleCloudflareUpdate('zone_id', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cloudflare-api-token">API Token</Label>
                    <Input
                      id="cloudflare-api-token"
                      type="password"
                      placeholder="Enter your Cloudflare API Token"
                      value={cloudflareConfig.api_token || ''}
                      onChange={(e) => handleCloudflareUpdate('api_token', e.target.value)}
                    />
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={testCloudflareConnection}
                    disabled={isTesting || !cloudflareConfig.zone_id || !cloudflareConfig.api_token}
                  >
                    {isTesting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Test Connection
                  </Button>

                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <a 
                      href="https://dash.cloudflare.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open Cloudflare Dashboard
                    </a>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Separator />

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as PortalType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="public_website" className="gap-2">
              <Globe className="h-4 w-4" />
              Public
            </TabsTrigger>
            <TabsTrigger value="tenant_portal" className="gap-2">
              <Users className="h-4 w-4" />
              Partner
            </TabsTrigger>
            <TabsTrigger value="farmer_app" className="gap-2">
              <Smartphone className="h-4 w-4" />
              Farmer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="public_website" className="mt-6">
            {renderDomainPortalConfig('public_website')}
          </TabsContent>

          <TabsContent value="tenant_portal" className="mt-6">
            {renderDomainPortalConfig('tenant_portal')}
          </TabsContent>

          <TabsContent value="farmer_app" className="mt-6">
            {renderDomainPortalConfig('farmer_app')}
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Domain Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Public Website:</span>
              <span className="font-mono">
                {publicWebsite.custom_domain || publicWebsite.subdomain || 'Not configured'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Partner Portal:</span>
              <span className="font-mono">
                {tenantPortal.custom_domain || tenantPortal.subdomain || 'Not configured'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Farmer App:</span>
              <span className="font-mono">
                {farmerApp.custom_domain || farmerApp.subdomain || 'Not configured'}
              </span>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

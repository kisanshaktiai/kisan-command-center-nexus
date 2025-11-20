import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import type { DomainConfig, PortalType, CloudflareConfig } from '@/types/whiteLabelConfig';
import { getPortalTypeLabel, getPortalTypeDescription, getDomainExample } from '@/types/whiteLabelConfig';

interface TripleDomainConfigSectionProps {
  domainConfig: DomainConfig;
  tenantId: string;
  onUpdate: (updates: Partial<DomainConfig>) => void;
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

  const handleDomainUpdate = (portalType: PortalType, field: 'subdomain' | 'custom_domain', value: string) => {
    onUpdate({
      [portalType]: {
        ...domainConfig[portalType],
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
    onUpdate({
      cloudflare: updated
    });
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

  const renderDomainPortalConfig = (portalType: PortalType) => {
    const config = domainConfig[portalType];
    
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
          {getStatusBadge(config?.status || 'not_configured')}
        </div>

        <Separator />

        {/* Subdomain Configuration */}
        <div className="space-y-2">
          <Label htmlFor={`${portalType}-subdomain`}>Subdomain</Label>
          <p className="text-xs text-muted-foreground">
            Example: {portalType === 'public_website' ? 'www' : portalType === 'tenant_portal' ? 'partner' : 'app'}.yourdomain.com
          </p>
          <DomainValidationSection
            domain={config?.subdomain || ''}
            onDomainChange={(value) => handleDomainUpdate(portalType, 'subdomain', value)}
            type="subdomain"
            tenantId={tenantId}
            domainPurpose={portalType}
          />
        </div>

        {/* Custom Domain Configuration */}
        <div className="space-y-2">
          <Label htmlFor={`${portalType}-custom-domain`}>Custom Domain</Label>
          <p className="text-xs text-muted-foreground">
            Example: {getDomainExample(portalType)}
          </p>
          <DomainValidationSection
            domain={config?.custom_domain || ''}
            onDomainChange={(value) => handleDomainUpdate(portalType, 'custom_domain', value)}
            type="custom_domain"
            tenantId={tenantId}
            domainPurpose={portalType}
          />
        </div>

        {/* SSL Status */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium">SSL Certificate</p>
              <p className="text-xs text-muted-foreground">
                {config?.ssl_enabled ? 'Enabled and active' : 'Not configured'}
              </p>
            </div>
          </div>
          <Switch
            checked={config?.ssl_enabled || false}
            disabled
          />
        </div>

        {/* DNS Verification Status */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium">DNS Verification</p>
              <p className="text-xs text-muted-foreground">
                {config?.dns_verified ? 'Verified' : 'Pending verification'}
              </p>
            </div>
          </div>
          {config?.dns_verified ? (
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Triple Domain Configuration
            </CardTitle>
            <CardDescription>
              Configure three separate domains for different portals: Public Website, Tenant Portal, and Farmer App
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cloudflare Integration Section */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cloud className="h-4 w-4" />
              Cloudflare DNS Integration
            </CardTitle>
            <CardDescription>
              Automatically manage DNS records and SSL certificates via Cloudflare
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
                    <p className="text-xs text-muted-foreground">
                      Token will be encrypted and stored securely
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto DNS Management</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically create and update DNS records
                      </p>
                    </div>
                    <Switch
                      checked={cloudflareConfig.auto_dns}
                      onCheckedChange={(checked) => handleCloudflareUpdate('auto_dns', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Use Cloudflare Proxy</Label>
                      <p className="text-xs text-muted-foreground">
                        Route traffic through Cloudflare (orange cloud)
                      </p>
                    </div>
                    <Switch
                      checked={cloudflareConfig.proxied}
                      onCheckedChange={(checked) => handleCloudflareUpdate('proxied', checked)}
                    />
                  </div>

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

        {/* Domain Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as PortalType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="public_website" className="gap-2">
              <Globe className="h-4 w-4" />
              Public Website
            </TabsTrigger>
            <TabsTrigger value="tenant_portal" className="gap-2">
              <Users className="h-4 w-4" />
              Tenant Portal
            </TabsTrigger>
            <TabsTrigger value="farmer_app" className="gap-2">
              <Smartphone className="h-4 w-4" />
              Farmer App
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

        {/* Domain Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Domain Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Public Website:</span>
              <span className="font-mono">
                {domainConfig.public_website?.custom_domain || domainConfig.public_website?.subdomain || 'Not configured'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tenant Portal:</span>
              <span className="font-mono">
                {domainConfig.tenant_portal?.custom_domain || domainConfig.tenant_portal?.subdomain || 'Not configured'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Farmer App:</span>
              <span className="font-mono">
                {domainConfig.farmer_app?.custom_domain || domainConfig.farmer_app?.subdomain || 'Not configured'}
              </span>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

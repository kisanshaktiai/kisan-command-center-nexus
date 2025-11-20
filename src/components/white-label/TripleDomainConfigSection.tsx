import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { 
  Globe, 
  Users, 
  Smartphone, 
  Shield, 
  Loader2,
  Cloud,
  ExternalLink,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

// Domain validation schema
const domainSchema = z.string().refine(
  (val) => {
    if (!val) return true;
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    return domainRegex.test(val);
  },
  { message: 'Invalid domain format (e.g., example.com or www.example.com)' }
);

// Subdomain prefix validation
const subdomainPrefixSchema = z.string().refine(
  (val) => {
    if (!val) return true;
    const prefixRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
    return prefixRegex.test(val);
  },
  { message: 'Invalid subdomain prefix (use only letters, numbers, and hyphens)' }
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
  // Extract base domain from public_website custom_domain
  const getBaseDomain = () => {
    return domainConfig?.public_website?.custom_domain || '';
  };

  // Extract subdomain prefixes
  const getSubdomainPrefix = (portalType: 'tenant_portal' | 'farmer_app') => {
    const fullDomain = domainConfig?.[portalType]?.custom_domain || '';
    const baseDomain = getBaseDomain();
    if (!fullDomain || !baseDomain) return '';
    // Extract prefix (e.g., "partner" from "partner.kisanai.com")
    return fullDomain.replace(`.${baseDomain}`, '');
  };

  const [mainDomain, setMainDomain] = useState(getBaseDomain());
  const [tenantPrefix, setTenantPrefix] = useState(getSubdomainPrefix('tenant_portal'));
  const [farmerPrefix, setFarmerPrefix] = useState(getSubdomainPrefix('farmer_app'));
  
  const [cloudflareConfig, setCloudflareConfig] = useState<CloudflareConfig>(
    domainConfig?.cloudflare || {
      enabled: false,
      auto_dns: false,
      proxied: true
    }
  );
  const [isTesting, setIsTesting] = useState(false);

  // Sync state when domainConfig changes
  useEffect(() => {
    setMainDomain(getBaseDomain());
    setTenantPrefix(getSubdomainPrefix('tenant_portal'));
    setFarmerPrefix(getSubdomainPrefix('farmer_app'));
  }, [domainConfig]);

  const handleMainDomainUpdate = (value: string) => {
    setMainDomain(value);
    
    // Validate domain
    if (value) {
      const validation = domainSchema.safeParse(value);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }
    }

    // Update all three portals
    onUpdate({
      ...domainConfig,
      public_website: {
        ...(domainConfig?.public_website || {}),
        custom_domain: value || null,
        ssl_enabled: true,
        dns_verified: false,
        status: value ? 'pending' : 'not_configured'
      },
      tenant_portal: {
        ...(domainConfig?.tenant_portal || {}),
        custom_domain: tenantPrefix && value ? `${tenantPrefix}.${value}` : null,
        ssl_enabled: true,
        dns_verified: false,
        status: tenantPrefix && value ? 'pending' : 'not_configured'
      },
      farmer_app: {
        ...(domainConfig?.farmer_app || {}),
        custom_domain: farmerPrefix && value ? `${farmerPrefix}.${value}` : null,
        ssl_enabled: true,
        dns_verified: false,
        status: farmerPrefix && value ? 'pending' : 'not_configured'
      }
    });
  };

  const handleSubdomainPrefixUpdate = (portalType: 'tenant_portal' | 'farmer_app', prefix: string) => {
    // Validate prefix
    if (prefix) {
      const validation = subdomainPrefixSchema.safeParse(prefix);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }
    }

    if (portalType === 'tenant_portal') {
      setTenantPrefix(prefix);
    } else {
      setFarmerPrefix(prefix);
    }

    // Update domain config
    onUpdate({
      ...domainConfig,
      [portalType]: {
        ...(domainConfig?.[portalType] || {}),
        custom_domain: prefix && mainDomain ? `${prefix}.${mainDomain}` : null,
        ssl_enabled: true,
        dns_verified: false,
        status: prefix && mainDomain ? 'pending' : 'not_configured'
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

  const getFullDomain = (prefix: string) => {
    if (!mainDomain) return '';
    return prefix ? `${prefix}.${mainDomain}` : mainDomain;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Domain Configuration
        </CardTitle>
        <CardDescription>
          Set up your main domain and subdomain prefixes for tenant portal and farmer app
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cloudflare Integration */}
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

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={testCloudflareConnection}
                      disabled={isTesting || !cloudflareConfig.zone_id || !cloudflareConfig.api_token}
                    >
                      {isTesting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Test Connection
                    </Button>

                    <Button variant="outline" size="sm" asChild>
                      <a 
                        href="https://dash.cloudflare.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Cloudflare Dashboard
                      </a>
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Main Domain Configuration */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Main Domain
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your primary domain (this will be used for the public website)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="main-domain">Main Domain *</Label>
            <Input
              id="main-domain"
              placeholder="www.kisanai.com"
              value={mainDomain}
              onChange={(e) => handleMainDomainUpdate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Example: www.kisanai.com or kisanai.com
            </p>
          </div>
        </div>

        <Separator />

        {/* Subdomain Prefixes */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Subdomain Prefixes
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Enter prefixes for tenant portal and farmer app (they will use the main domain)
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Tenant Portal Prefix */}
            <div className="space-y-2">
              <Label htmlFor="tenant-prefix" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Tenant Portal Prefix
              </Label>
              <Input
                id="tenant-prefix"
                placeholder="partner"
                value={tenantPrefix}
                onChange={(e) => handleSubdomainPrefixUpdate('tenant_portal', e.target.value)}
                disabled={!mainDomain}
              />
              <div className="flex items-center gap-1 text-xs">
                <span className="text-muted-foreground">Full domain:</span>
                <code className="bg-muted px-2 py-0.5 rounded font-mono">
                  {getFullDomain(tenantPrefix) || 'Enter prefix'}
                </code>
              </div>
            </div>

            {/* Farmer App Prefix */}
            <div className="space-y-2">
              <Label htmlFor="farmer-prefix" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Farmer App Prefix
              </Label>
              <Input
                id="farmer-prefix"
                placeholder="app"
                value={farmerPrefix}
                onChange={(e) => handleSubdomainPrefixUpdate('farmer_app', e.target.value)}
                disabled={!mainDomain}
              />
              <div className="flex items-center gap-1 text-xs">
                <span className="text-muted-foreground">Full domain:</span>
                <code className="bg-muted px-2 py-0.5 rounded font-mono">
                  {getFullDomain(farmerPrefix) || 'Enter prefix'}
                </code>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Domain Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Domain Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between gap-4 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Public Website</p>
                  <p className="text-xs text-muted-foreground">Main domain</p>
                </div>
              </div>
              <code className="text-sm font-mono bg-background px-2 py-1 rounded">
                {mainDomain || 'Not configured'}
              </code>
            </div>

            <div className="flex items-start justify-between gap-4 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Tenant Portal</p>
                  <p className="text-xs text-muted-foreground">Partner management</p>
                </div>
              </div>
              <code className="text-sm font-mono bg-background px-2 py-1 rounded">
                {getFullDomain(tenantPrefix) || 'Not configured'}
              </code>
            </div>

            <div className="flex items-start justify-between gap-4 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Farmer App</p>
                  <p className="text-xs text-muted-foreground">Mobile interface</p>
                </div>
              </div>
              <code className="text-sm font-mono bg-background px-2 py-1 rounded">
                {getFullDomain(farmerPrefix) || 'Not configured'}
              </code>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

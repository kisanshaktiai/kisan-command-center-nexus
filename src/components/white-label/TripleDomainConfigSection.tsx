import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { 
  Globe, 
  Users, 
  Smartphone, 
  CheckCircle,
  XCircle,
  Loader2,
  Copy,
  Server,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';
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

interface DomainConfig {
  public_website: DomainPortalConfig;
  tenant_portal: DomainPortalConfig;
  farmer_app: DomainPortalConfig;
}

interface DNSInfo {
  nameservers: string[];
  dns_records: any[];
  cname_target: string;
  configured: boolean;
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
  const { showSuccess, showError, showInfo } = useNotifications();
  
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
  
  // Validation states
  const [mainDomainValid, setMainDomainValid] = useState<boolean | null>(null);
  const [tenantPrefixValid, setTenantPrefixValid] = useState<boolean | null>(null);
  const [farmerPrefixValid, setFarmerPrefixValid] = useState<boolean | null>(null);
  const [mainDomainError, setMainDomainError] = useState<string>('');
  const [tenantPrefixError, setTenantPrefixError] = useState<string>('');
  const [farmerPrefixError, setFarmerPrefixError] = useState<string>('');

  // DNS Info state
  const [dnsInfo, setDnsInfo] = useState<DNSInfo | null>(null);
  const [loadingDNS, setLoadingDNS] = useState(false);
  const [dnsError, setDnsError] = useState<string>('');

  // Sync state when domainConfig changes
  useEffect(() => {
    setMainDomain(getBaseDomain());
    setTenantPrefix(getSubdomainPrefix('tenant_portal'));
    setFarmerPrefix(getSubdomainPrefix('farmer_app'));
  }, [domainConfig]);

  // Fetch DNS info on mount
  useEffect(() => {
    fetchDNSInfo();
  }, []);

  const fetchDNSInfo = async () => {
    setLoadingDNS(true);
    setDnsError('');
    try {
      const { data, error } = await supabase.functions.invoke('admin-utilities', {
        body: {
          action: 'cloudflare-dns',
          operation: 'get_zone_info',
          tenant_id: tenantId
        }
      });

      if (error) throw error;

      if (data?.configured === false) {
        setDnsError('Cloudflare integration not configured. Please add CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID secrets.');
        setDnsInfo(null);
      } else if (data?.success) {
        setDnsInfo({
          nameservers: data.nameservers || [],
          dns_records: data.dns_records || [],
          cname_target: data.cname_target || 'your-app.lovable.app',
          configured: true
        });
      } else {
        throw new Error(data?.error || 'Failed to fetch DNS info');
      }
    } catch (error: any) {
      console.error('Error fetching DNS info:', error);
      setDnsError(error.message || 'Failed to fetch DNS information');
    } finally {
      setLoadingDNS(false);
    }
  };

  const validateMainDomain = (value: string) => {
    if (!value) {
      setMainDomainValid(null);
      setMainDomainError('');
      return true;
    }
    
    const validation = domainSchema.safeParse(value);
    if (!validation.success) {
      setMainDomainValid(false);
      setMainDomainError(validation.error.errors[0].message);
      return false;
    }
    
    setMainDomainValid(true);
    setMainDomainError('');
    return true;
  };

  const validateSubdomainPrefix = (value: string, type: 'tenant' | 'farmer') => {
    if (!value) {
      if (type === 'tenant') {
        setTenantPrefixValid(null);
        setTenantPrefixError('');
      } else {
        setFarmerPrefixValid(null);
        setFarmerPrefixError('');
      }
      return true;
    }
    
    const validation = subdomainPrefixSchema.safeParse(value);
    const isValid = validation.success;
    const errorMsg = isValid ? '' : validation.error.errors[0].message;
    
    if (type === 'tenant') {
      setTenantPrefixValid(isValid);
      setTenantPrefixError(errorMsg);
    } else {
      setFarmerPrefixValid(isValid);
      setFarmerPrefixError(errorMsg);
    }
    
    return isValid;
  };

  const handleMainDomainBlur = () => {
    const isValid = validateMainDomain(mainDomain);
    if (isValid && mainDomain) {
      // Update domain config
      const updates = {
        public_website: {
          ...domainConfig.public_website,
          custom_domain: mainDomain,
          status: 'pending' as const
        },
        tenant_portal: {
          ...domainConfig.tenant_portal,
          custom_domain: tenantPrefix ? `${tenantPrefix}.${mainDomain}` : '',
          status: tenantPrefix ? 'pending' as const : 'not_configured' as const
        },
        farmer_app: {
          ...domainConfig.farmer_app,
          custom_domain: farmerPrefix ? `${farmerPrefix}.${mainDomain}` : '',
          status: farmerPrefix ? 'pending' as const : 'not_configured' as const
        }
      };
      onUpdate(updates);
      showSuccess('Main domain updated');
    }
  };

  const handleSubdomainBlur = (type: 'tenant' | 'farmer') => {
    const prefix = type === 'tenant' ? tenantPrefix : farmerPrefix;
    const isValid = validateSubdomainPrefix(prefix, type);
    
    if (isValid && mainDomain) {
      const portalType = type === 'tenant' ? 'tenant_portal' : 'farmer_app';
      const updates = {
        [portalType]: {
          ...domainConfig[portalType],
          custom_domain: prefix ? `${prefix}.${mainDomain}` : '',
          status: prefix ? 'pending' as const : 'not_configured' as const
        }
      };
      onUpdate(updates);
      showSuccess(`${type === 'tenant' ? 'Tenant Portal' : 'Farmer App'} subdomain updated`);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showSuccess(`${label} copied to clipboard`);
  };

  const getValidationIcon = (valid: boolean | null) => {
    if (valid === null) return null;
    return valid ? (
      <CheckCircle className="h-5 w-5 text-success" />
    ) : (
      <XCircle className="h-5 w-5 text-destructive" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Main Domain Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Domain Configuration
          </CardTitle>
          <CardDescription>
            Configure your main domain and subdomains for different portal types
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Domain */}
          <div className="space-y-2">
            <Label htmlFor="main-domain" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Main Domain (Public Website)
            </Label>
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <Input
                  id="main-domain"
                  placeholder="example.com or www.example.com"
                  value={mainDomain}
                  onChange={(e) => {
                    setMainDomain(e.target.value);
                    setMainDomainValid(null); // Reset validation on change
                  }}
                  onBlur={handleMainDomainBlur}
                  disabled={isLoading}
                  className={mainDomainValid === false ? 'border-destructive' : ''}
                />
                {mainDomainError && (
                  <p className="text-sm text-destructive mt-1">{mainDomainError}</p>
                )}
              </div>
              {getValidationIcon(mainDomainValid)}
            </div>
          </div>

          <Separator />

          {/* Tenant Portal Subdomain */}
          <div className="space-y-2">
            <Label htmlFor="tenant-prefix" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Tenant Portal Subdomain Prefix
            </Label>
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <div className="flex gap-2">
                  <Input
                    id="tenant-prefix"
                    placeholder="partner, portal, etc."
                    value={tenantPrefix}
                    onChange={(e) => {
                      setTenantPrefix(e.target.value);
                      setTenantPrefixValid(null);
                    }}
                    onBlur={() => handleSubdomainBlur('tenant')}
                    disabled={isLoading || !mainDomain}
                    className={tenantPrefixValid === false ? 'border-destructive' : ''}
                  />
                  {mainDomain && (
                    <div className="flex items-center px-3 bg-muted rounded-md text-sm text-muted-foreground">
                      .{mainDomain}
                    </div>
                  )}
                </div>
                {tenantPrefixError && (
                  <p className="text-sm text-destructive mt-1">{tenantPrefixError}</p>
                )}
                {tenantPrefix && mainDomain && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Full domain: <span className="font-medium">{tenantPrefix}.{mainDomain}</span>
                  </p>
                )}
              </div>
              {getValidationIcon(tenantPrefixValid)}
            </div>
          </div>

          <Separator />

          {/* Farmer App Subdomain */}
          <div className="space-y-2">
            <Label htmlFor="farmer-prefix" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Farmer App Subdomain Prefix
            </Label>
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <div className="flex gap-2">
                  <Input
                    id="farmer-prefix"
                    placeholder="app, farmer, mobile, etc."
                    value={farmerPrefix}
                    onChange={(e) => {
                      setFarmerPrefix(e.target.value);
                      setFarmerPrefixValid(null);
                    }}
                    onBlur={() => handleSubdomainBlur('farmer')}
                    disabled={isLoading || !mainDomain}
                    className={farmerPrefixValid === false ? 'border-destructive' : ''}
                  />
                  {mainDomain && (
                    <div className="flex items-center px-3 bg-muted rounded-md text-sm text-muted-foreground">
                      .{mainDomain}
                    </div>
                  )}
                </div>
                {farmerPrefixError && (
                  <p className="text-sm text-destructive mt-1">{farmerPrefixError}</p>
                )}
                {farmerPrefix && mainDomain && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Full domain: <span className="font-medium">{farmerPrefix}.{mainDomain}</span>
                  </p>
                )}
              </div>
              {getValidationIcon(farmerPrefixValid)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Domain Summary */}
      {mainDomain && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Domain Summary
            </CardTitle>
            <CardDescription>
              Overview of your configured domains
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Public Website</p>
                    <p className="text-sm text-muted-foreground">{mainDomain}</p>
                  </div>
                </div>
                <Badge variant={mainDomainValid ? 'default' : 'secondary'}>
                  {domainConfig?.public_website?.status || 'Not Configured'}
                </Badge>
              </div>

              {tenantPrefix && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Tenant Portal</p>
                      <p className="text-sm text-muted-foreground">{tenantPrefix}.{mainDomain}</p>
                    </div>
                  </div>
                  <Badge variant={tenantPrefixValid ? 'default' : 'secondary'}>
                    {domainConfig?.tenant_portal?.status || 'Not Configured'}
                  </Badge>
                </div>
              )}

              {farmerPrefix && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Farmer App</p>
                      <p className="text-sm text-muted-foreground">{farmerPrefix}.{mainDomain}</p>
                    </div>
                  </div>
                  <Badge variant={farmerPrefixValid ? 'default' : 'secondary'}>
                    {domainConfig?.farmer_app?.status || 'Not Configured'}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* DNS Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                DNS Configuration
              </CardTitle>
              <CardDescription>
                DNS records and nameservers for Cloudflare setup
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDNSInfo}
              disabled={loadingDNS}
            >
              {loadingDNS ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Refresh'
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {dnsError ? (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{dnsError}</p>
            </div>
          ) : loadingDNS ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : dnsInfo?.configured ? (
            <>
              {/* Nameservers */}
              {dnsInfo.nameservers.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Cloudflare Nameservers</Label>
                  <p className="text-sm text-muted-foreground">
                    Update your domain's nameservers at your domain registrar to these values:
                  </p>
                  <div className="space-y-2">
                    {dnsInfo.nameservers.map((ns, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <code className="flex-1 text-sm font-mono">{ns}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(ns, 'Nameserver')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Required DNS Records */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Required DNS Records</Label>
                <p className="text-sm text-muted-foreground">
                  Ensure these DNS records are configured in Cloudflare:
                </p>
                <div className="space-y-3">
                  {/* A Record for main domain */}
                  {mainDomain && (
                    <div className="p-3 bg-muted rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">A Record</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard('185.158.133.1', 'IP Address')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">Name:</span> {mainDomain}</p>
                        <p><span className="font-medium">Value:</span> <code>185.158.133.1</code></p>
                      </div>
                    </div>
                  )}

                  {/* CNAME for subdomains */}
                  {tenantPrefix && mainDomain && (
                    <div className="p-3 bg-muted rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">CNAME Record</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(dnsInfo.cname_target, 'CNAME Target')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">Name:</span> {tenantPrefix}.{mainDomain}</p>
                        <p><span className="font-medium">Value:</span> <code>{dnsInfo.cname_target}</code></p>
                      </div>
                    </div>
                  )}

                  {farmerPrefix && mainDomain && (
                    <div className="p-3 bg-muted rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">CNAME Record</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(dnsInfo.cname_target, 'CNAME Target')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">Name:</span> {farmerPrefix}.{mainDomain}</p>
                        <p><span className="font-medium">Value:</span> <code>{dnsInfo.cname_target}</code></p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* DNS Setup Guide */}
              <div className="p-4 bg-info/10 border border-info/20 rounded-lg">
                <div className="flex gap-3">
                  <ExternalLink className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">DNS Setup Instructions</p>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Update nameservers at your domain registrar</li>
                      <li>Wait for DNS propagation (can take up to 48 hours)</li>
                      <li>Verify DNS records are properly configured in Cloudflare</li>
                      <li>SSL certificates will be automatically provisioned</li>
                    </ol>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">No DNS information available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

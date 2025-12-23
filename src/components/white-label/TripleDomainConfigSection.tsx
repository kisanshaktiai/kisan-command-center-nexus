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
  Copy,
  Server,
  ExternalLink
} from 'lucide-react';
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
  const { showSuccess } = useNotifications();
  
  // Safely normalize domain config to expected structure
  const normalizedConfig = React.useMemo(() => {
    if (!domainConfig) {
      return {
        public_website: { ssl_enabled: true, dns_verified: false, status: 'not_configured' as const },
        tenant_portal: { ssl_enabled: true, dns_verified: false, status: 'not_configured' as const },
        farmer_app: { ssl_enabled: true, dns_verified: false, status: 'not_configured' as const }
      };
    }
    
    // If already in correct format, return as is
    if ('public_website' in domainConfig) {
      return domainConfig as DomainConfig;
    }
    
    // Convert old flat format to new nested format
    const flatConfig = domainConfig as any;
    return {
      public_website: {
        custom_domain: flatConfig.custom_domain || '',
        ssl_enabled: flatConfig.ssl_enabled !== false,
        dns_verified: false,
        status: flatConfig.custom_domain ? 'pending' as const : 'not_configured' as const
      },
      tenant_portal: {
        custom_domain: '',
        ssl_enabled: true,
        dns_verified: false,
        status: 'not_configured' as const
      },
      farmer_app: {
        custom_domain: '',
        ssl_enabled: true,
        dns_verified: false,
        status: 'not_configured' as const
      }
    };
  }, [domainConfig]);
  
  // Extract base domain from public_website custom_domain
  const getBaseDomain = () => {
    return normalizedConfig.public_website?.custom_domain || '';
  };

  // Extract subdomain prefixes
  const getSubdomainPrefix = (portalType: 'tenant_portal' | 'farmer_app') => {
    const fullDomain = normalizedConfig[portalType]?.custom_domain || '';
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

  // Sync state when domainConfig changes
  useEffect(() => {
    setMainDomain(getBaseDomain());
    setTenantPrefix(getSubdomainPrefix('tenant_portal'));
    setFarmerPrefix(getSubdomainPrefix('farmer_app'));
  }, [normalizedConfig]);

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
          ...normalizedConfig.public_website,
          custom_domain: mainDomain,
          status: 'pending' as const
        },
        tenant_portal: {
          ...normalizedConfig.tenant_portal,
          custom_domain: tenantPrefix ? `${tenantPrefix}.${mainDomain}` : '',
          status: tenantPrefix ? 'pending' as const : 'not_configured' as const
        },
        farmer_app: {
          ...normalizedConfig.farmer_app,
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
        ...normalizedConfig,
        [portalType]: {
          ...normalizedConfig[portalType],
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
                    setMainDomainValid(null);
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
                  {normalizedConfig.public_website?.status || 'Not Configured'}
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
                    {normalizedConfig.tenant_portal?.status || 'Not Configured'}
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
                    {normalizedConfig.farmer_app?.status || 'Not Configured'}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* DNS Configuration Guide */}
      {mainDomain && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              DNS Configuration Guide
            </CardTitle>
            <CardDescription>
              Follow these steps to configure DNS for your custom domain
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Step 1: Point your domain to Lovable
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Add these DNS records at your domain registrar or DNS provider:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-background rounded">
                    <div className="flex-1">
                      <span className="text-sm font-mono">Type: A</span>
                      <span className="text-sm font-mono ml-4">Name: @</span>
                      <span className="text-sm font-mono ml-4">Value: 185.158.133.1</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard('185.158.133.1', 'IP address')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-background rounded">
                    <div className="flex-1">
                      <span className="text-sm font-mono">Type: A</span>
                      <span className="text-sm font-mono ml-4">Name: www</span>
                      <span className="text-sm font-mono ml-4">Value: 185.158.133.1</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard('185.158.133.1', 'IP address')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  {tenantPrefix && (
                    <div className="flex items-center justify-between p-2 bg-background rounded">
                      <div className="flex-1">
                        <span className="text-sm font-mono">Type: A</span>
                        <span className="text-sm font-mono ml-4">Name: {tenantPrefix}</span>
                        <span className="text-sm font-mono ml-4">Value: 185.158.133.1</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard('185.158.133.1', 'IP address')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {farmerPrefix && (
                    <div className="flex items-center justify-between p-2 bg-background rounded">
                      <div className="flex-1">
                        <span className="text-sm font-mono">Type: A</span>
                        <span className="text-sm font-mono ml-4">Name: {farmerPrefix}</span>
                        <span className="text-sm font-mono ml-4">Value: 185.158.133.1</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard('185.158.133.1', 'IP address')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Step 2: SSL Certificate</h4>
                <p className="text-sm text-muted-foreground">
                  SSL certificates will be automatically provisioned by Lovable once DNS records are properly configured and propagated (can take up to 72 hours).
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Step 3: Verify Domain</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  After adding the DNS records, wait for DNS propagation (usually 15-60 minutes) and verify your domain is accessible.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={`https://${mainDomain}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Test {mainDomain}
                    </a>
                  </Button>
                  {tenantPrefix && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a href={`https://${tenantPrefix}.${mainDomain}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Test {tenantPrefix}.{mainDomain}
                      </a>
                    </Button>
                  )}
                  {farmerPrefix && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a href={`https://${farmerPrefix}.${mainDomain}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Test {farmerPrefix}.{mainDomain}
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

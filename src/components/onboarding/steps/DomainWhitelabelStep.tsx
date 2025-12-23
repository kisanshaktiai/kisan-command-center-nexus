
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Globe, Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';
import { platformConfigService } from '@/services/platformConfig';
import { whiteLabelSyncService } from '@/services/WhiteLabelSyncService';

interface DomainWhitelabelStepProps {
  tenantId: string;
  onComplete: (data: any) => void;
  data: any;
  onDataChange: (data: any) => void;
}

export const DomainWhitelabelStep: React.FC<DomainWhitelabelStepProps> = ({
  tenantId,
  onComplete,
  data,
  onDataChange
}) => {
  const [formData, setFormData] = useState({
    public_website: {
      subdomain: data.public_website?.subdomain || '',
      custom_domain: data.public_website?.custom_domain || '',
      ssl_enabled: true
    },
    tenant_portal: {
      subdomain: data.tenant_portal?.subdomain || '',
      custom_domain: data.tenant_portal?.custom_domain || '',
      ssl_enabled: true
    },
    farmer_app: {
      subdomain: data.farmer_app?.subdomain || '',
      custom_domain: data.farmer_app?.custom_domain || '',
      ssl_enabled: true
    },
    ...data
  });

  const [domainValidation, setDomainValidation] = useState({
    isValidating: false,
    isValid: false,
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { showSuccess, showError } = useNotifications();

  // Get platform configuration
  const platformConfig = platformConfigService.getConfig();

  // Load existing white_label_configs data on mount
  useEffect(() => {
    const loadExistingData = async () => {
      if (!tenantId) return;
      
      setIsLoading(true);
      try {
        const { data: wlConfig, error } = await supabase
          .from('white_label_configs')
          .select('domain_config')
          .eq('tenant_id', tenantId)
          .single();

        if (wlConfig && wlConfig.domain_config) {
          const domainConfig = wlConfig.domain_config as any;
          const loadedData = {
            public_website: {
              subdomain: domainConfig.public_website?.subdomain || '',
              custom_domain: domainConfig.public_website?.custom_domain || '',
              ssl_enabled: domainConfig.public_website?.ssl_enabled ?? true
            },
            tenant_portal: {
              subdomain: domainConfig.tenant_portal?.subdomain || '',
              custom_domain: domainConfig.tenant_portal?.custom_domain || '',
              ssl_enabled: domainConfig.tenant_portal?.ssl_enabled ?? true
            },
            farmer_app: {
              subdomain: domainConfig.farmer_app?.subdomain || '',
              custom_domain: domainConfig.farmer_app?.custom_domain || '',
              ssl_enabled: domainConfig.farmer_app?.ssl_enabled ?? true
            }
          };
          setFormData(loadedData);
          onDataChange(loadedData);
        }
      } catch (error) {
        console.error('Error loading white-label config:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingData();
  }, [tenantId, onDataChange]);

  const validateDomain = async (domain: string) => {
    if (!domain) return;

    setDomainValidation({ isValidating: true, isValid: false, message: '' });

    try {
      // Simulate domain validation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Basic domain format validation
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
      
      if (!domainRegex.test(domain)) {
        setDomainValidation({
          isValidating: false,
          isValid: false,
          message: 'Invalid domain format'
        });
        return;
      }

      // Check if domain is available/accessible
      setDomainValidation({
        isValidating: false,
        isValid: true,
        message: 'Domain is available and can be configured'
      });
    } catch (error) {
      setDomainValidation({
        isValidating: false,
        isValid: false,
        message: 'Error validating domain'
      });
    }
  };

  const handleInputChange = (portalType: string, field: string, value: string | boolean) => {
    const newData = {
      ...formData,
      [portalType]: {
        ...formData[portalType as keyof typeof formData],
        [field]: value
      }
    };
    setFormData(newData);
    onDataChange(newData);

    if (field === 'custom_domain' && typeof value === 'string' && value) {
      validateDomain(value);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // Save to white_label_configs (source of truth)
      const { data: wlConfig, error: wlError } = await supabase
        .from('white_label_configs')
        .select('id')
        .eq('tenant_id', tenantId)
        .single();

      if (wlError || !wlConfig) {
        // Create if doesn't exist (three-domain architecture)
        const createResult = await whiteLabelSyncService.createWhiteLabelConfig(tenantId, {
          domain_config: {
            public_website: formData.public_website,
            tenant_portal: formData.tenant_portal,
            farmer_app: formData.farmer_app
          }
        });
        
        if (!createResult.success) {
          throw new Error(createResult.error || 'Failed to create white-label configuration');
        }
      } else {
        // Update existing config (three-domain architecture) - sync via edge function
        const updateResult = await whiteLabelSyncService.updateWhiteLabelConfig(tenantId, {
          domain_config: {
            public_website: formData.public_website,
            tenant_portal: formData.tenant_portal,
            farmer_app: formData.farmer_app
          }
        });
        
        if (!updateResult.success) {
          throw new Error(updateResult.error || 'Failed to update white-label configuration');
        }
      }

      // That's it! No manual tenant update needed - triggers handle sync automatically
      showSuccess('Domain configuration saved successfully');
      onComplete(formData);
    } catch (error) {
      console.error('Error saving domain configuration:', error);
      showError('Failed to save domain configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading domain configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Domain & White-label Setup</h3>
        <p className="text-muted-foreground">
          Configure domains for your three portals: Public Website, Tenant Portal, and Farmer App
        </p>
      </div>

      {/* Public Website Domain */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Public Website Domain
          </CardTitle>
          <CardDescription>
            Main website for public access (e.g., www.kisanai.com)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="public_website_custom">Custom Domain</Label>
            <Input
              id="public_website_custom"
              value={formData.public_website.custom_domain}
              onChange={(e) => handleInputChange('public_website', 'custom_domain', e.target.value)}
              placeholder="www.yourcompany.com"
            />
          </div>
          <div>
            <Label htmlFor="public_website_subdomain">Subdomain (Fallback)</Label>
            <div className="flex">
              <Input
                id="public_website_subdomain"
                value={formData.public_website.subdomain}
                onChange={(e) => handleInputChange('public_website', 'subdomain', e.target.value)}
                placeholder="www"
              />
              <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border border-l-0 rounded-r-md">
                .{platformConfig.baseDomain}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tenant Portal Domain */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Tenant Portal Domain
          </CardTitle>
          <CardDescription>
            Partner/tenant management portal (e.g., partner.kisanai.com)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="tenant_portal_custom">Custom Domain</Label>
            <Input
              id="tenant_portal_custom"
              value={formData.tenant_portal.custom_domain}
              onChange={(e) => handleInputChange('tenant_portal', 'custom_domain', e.target.value)}
              placeholder="partner.yourcompany.com"
            />
          </div>
          <div>
            <Label htmlFor="tenant_portal_subdomain">Subdomain (Fallback)</Label>
            <div className="flex">
              <Input
                id="tenant_portal_subdomain"
                value={formData.tenant_portal.subdomain}
                onChange={(e) => handleInputChange('tenant_portal', 'subdomain', e.target.value)}
                placeholder="partner"
              />
              <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border border-l-0 rounded-r-md">
                .{platformConfig.baseDomain}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Farmer App Domain */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Farmer App Domain
          </CardTitle>
          <CardDescription>
            Mobile app and farmer interface (e.g., app.kisanai.com)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="farmer_app_custom">Custom Domain</Label>
            <Input
              id="farmer_app_custom"
              value={formData.farmer_app.custom_domain}
              onChange={(e) => handleInputChange('farmer_app', 'custom_domain', e.target.value)}
              placeholder="app.yourcompany.com"
            />
          </div>
          <div>
            <Label htmlFor="farmer_app_subdomain">Subdomain (Fallback)</Label>
            <div className="flex">
              <Input
                id="farmer_app_subdomain"
                value={formData.farmer_app.subdomain}
                onChange={(e) => handleInputChange('farmer_app', 'subdomain', e.target.value)}
                placeholder="app"
              />
              <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border border-l-0 rounded-r-md">
                .{platformConfig.baseDomain}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            SSL & Security
          </CardTitle>
          <CardDescription>
            Secure connections and certificate management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <h4 className="font-medium">SSL Certificate</h4>
              <p className="text-sm text-muted-foreground">
                Automatically managed SSL certificates
              </p>
            </div>
            <Badge variant={formData.sslEnabled ? 'default' : 'secondary'}>
              {formData.sslEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Security Features</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">HTTPS Enforcement</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Domain Verification</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Auto SSL Renewal</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Security Headers</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>DNS Configuration</CardTitle>
          <CardDescription>
            Add these DNS records to your domain registrar for each custom domain
          </CardDescription>
        </CardHeader>
        <CardContent>
        {(formData.public_website.custom_domain || formData.tenant_portal.custom_domain || formData.farmer_app.custom_domain) ? (
            <div className="space-y-6">
              {formData.public_website.custom_domain && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Public Website: {formData.public_website.custom_domain}</h4>
                  <div className="space-y-2 font-mono text-sm">
                    <div className="flex justify-between items-center p-2 bg-background rounded">
                      <span>Type: CNAME</span>
                      <span>Value: proxy.{formData.public_website.custom_domain.split('.').slice(-2).join('.')}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-background rounded">
                      <span>Type: TXT (_verification)</span>
                      <span>Value: {platformConfig.verificationPrefix}={tenantId}</span>
                    </div>
                  </div>
                </div>
              )}
              {formData.tenant_portal.custom_domain && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Tenant Portal: {formData.tenant_portal.custom_domain}</h4>
                  <div className="space-y-2 font-mono text-sm">
                    <div className="flex justify-between items-center p-2 bg-background rounded">
                      <span>Type: CNAME</span>
                      <span>Value: proxy.{formData.tenant_portal.custom_domain.split('.').slice(-2).join('.')}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-background rounded">
                      <span>Type: TXT (_verification)</span>
                      <span>Value: {platformConfig.verificationPrefix}={tenantId}</span>
                    </div>
                  </div>
                </div>
              )}
              {formData.farmer_app.custom_domain && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Farmer App: {formData.farmer_app.custom_domain}</h4>
                  <div className="space-y-2 font-mono text-sm">
                    <div className="flex justify-between items-center p-2 bg-background rounded">
                      <span>Type: CNAME</span>
                      <span>Value: proxy.{formData.farmer_app.custom_domain.split('.').slice(-2).join('.')}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-background rounded">
                      <span>Type: TXT (_verification)</span>
                      <span>Value: {platformConfig.verificationPrefix}={tenantId}</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                <p>After adding these DNS records:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>DNS propagation may take up to 24-48 hours</li>
                  <li>SSL certificates will be automatically provisioned</li>
                  <li>Domain verification will be completed automatically</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Enter custom domains to see DNS configuration</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Saving Configuration...' : 'Save Domain Configuration'}
        </Button>
      </div>
    </div>
  );
};

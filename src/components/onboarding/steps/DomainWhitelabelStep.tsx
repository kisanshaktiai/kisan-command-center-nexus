
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Globe, Shield, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

interface DomainWhitelabelStepProps {
  onComplete: (data: any) => void;
  onSave: (data: any) => void;
  tenantId: string;
  stepData?: any;
  isLoading?: boolean;
  canProceed?: boolean;
}

export const DomainWhitelabelStep: React.FC<DomainWhitelabelStepProps> = ({
  onComplete,
  onSave,
  tenantId,
  stepData = {},
  isLoading = false,
  canProceed = true
}) => {
  const [formData, setFormData] = useState({
    // Domain settings
    subdomain: stepData.subdomain || '',
    customDomain: stepData.customDomain || '',
    sslEnabled: stepData.sslEnabled || true,
    
    // Whitelabel settings
    enableWhitelabel: stepData.enableWhitelabel || false,
    hideCredits: stepData.hideCredits || false,
    customBranding: stepData.customBranding || false,
    customFavicon: stepData.customFavicon || '',
    
    // DNS settings (will be populated after verification)
    dnsRecords: stepData.dnsRecords || {},
    
    // Additional whitelabel settings
    whitelabelSettings: stepData.whitelabelSettings || {
      removeBranding: false,
      customSupportEmail: '',
      customTermsUrl: '',
      customPrivacyUrl: '',
      customHelpUrl: ''
    }
  });

  const [domainStatus, setDomainStatus] = useState({
    subdomain: { available: null, checking: false },
    customDomain: { verified: false, checking: false }
  });

  const [errors, setErrors] = useState<any>({});

  const validateSubdomain = (subdomain: string) => {
    if (!subdomain) return true;
    return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(subdomain) && subdomain.length >= 3;
  };

  const validateCustomDomain = (domain: string) => {
    if (!domain) return true;
    return /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/.test(domain);
  };

  const checkSubdomainAvailability = async (subdomain: string) => {
    if (!subdomain || !validateSubdomain(subdomain)) return;

    setDomainStatus(prev => ({
      ...prev,
      subdomain: { ...prev.subdomain, checking: true }
    }));

    try {
      // Simulate API call to check subdomain availability
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, mark as available if it's not common words
      const unavailable = ['www', 'api', 'admin', 'app', 'mail'];
      const available = !unavailable.includes(subdomain.toLowerCase());
      
      setDomainStatus(prev => ({
        ...prev,
        subdomain: { checking: false, available }
      }));
    } catch (error) {
      setDomainStatus(prev => ({
        ...prev,
        subdomain: { checking: false, available: null }
      }));
    }
  };

  const verifyCustomDomain = async (domain: string) => {
    if (!domain || !validateCustomDomain(domain)) return;

    setDomainStatus(prev => ({
      ...prev,
      customDomain: { ...prev.customDomain, checking: true }
    }));

    try {
      // Simulate domain verification
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setDomainStatus(prev => ({
        ...prev,
        customDomain: { checking: false, verified: true }
      }));

      // Set DNS records for user to configure
      handleInputChange('dnsRecords', {
        cname: {
          name: domain,
          value: `${formData.subdomain}.yourplatform.com`,
          type: 'CNAME'
        },
        txt: {
          name: `_verification.${domain}`,
          value: 'verification-token-123456',
          type: 'TXT'
        }
      });

    } catch (error) {
      setDomainStatus(prev => ({
        ...prev,
        customDomain: { checking: false, verified: false }
      }));
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    // Clear errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }

    // Auto-check domains
    if (field === 'subdomain' && value && validateSubdomain(value)) {
      checkSubdomainAvailability(value);
    }
  };

  // Auto-save
  useEffect(() => {
    const timer = setTimeout(() => {
      if (Object.keys(formData).some(key => formData[key] !== stepData[key])) {
        onSave(formData);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [formData, onSave, stepData]);

  const validateForm = () => {
    const newErrors: any = {};

    if (formData.subdomain && !validateSubdomain(formData.subdomain)) {
      newErrors.subdomain = 'Invalid subdomain format';
    }

    if (formData.customDomain && !validateCustomDomain(formData.customDomain)) {
      newErrors.customDomain = 'Invalid domain format';
    }

    if (domainStatus.subdomain.available === false) {
      newErrors.subdomain = 'Subdomain is not available';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleComplete = () => {
    if (validateForm()) {
      onComplete(formData);
    }
  };

  const handleSaveAndContinue = () => {
    onSave(formData);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Domain & Whitelabel</h2>
        <p className="text-muted-foreground">
          Configure your custom domain and branding options
        </p>
      </div>

      {/* Domain Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Domain Configuration
          </CardTitle>
          <CardDescription>
            Set up your custom domain and subdomain
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Subdomain */}
          <div>
            <Label htmlFor="subdomain">Subdomain</Label>
            <div className="flex items-center gap-2">
              <Input
                id="subdomain"
                value={formData.subdomain}
                onChange={(e) => handleInputChange('subdomain', e.target.value.toLowerCase())}
                placeholder="your-company"
                className={errors.subdomain ? 'border-red-500' : ''}
              />
              <span className="text-muted-foreground whitespace-nowrap">
                .yourplatform.com
              </span>
              {domainStatus.subdomain.checking && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              )}
              {domainStatus.subdomain.available === true && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
              {domainStatus.subdomain.available === false && (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
            </div>
            {errors.subdomain && (
              <p className="text-sm text-red-500 mt-1">{errors.subdomain}</p>
            )}
            {domainStatus.subdomain.available === true && (
              <p className="text-sm text-green-600 mt-1">Subdomain is available!</p>
            )}
            {domainStatus.subdomain.available === false && (
              <p className="text-sm text-red-600 mt-1">Subdomain is not available</p>
            )}
          </div>

          {/* Custom Domain */}
          <div>
            <Label htmlFor="customDomain">Custom Domain (Optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="customDomain"
                value={formData.customDomain}
                onChange={(e) => handleInputChange('customDomain', e.target.value.toLowerCase())}
                placeholder="app.yourcompany.com"
                className={errors.customDomain ? 'border-red-500' : ''}
              />
              <Button
                type="button"
                size="sm"
                onClick={() => verifyCustomDomain(formData.customDomain)}
                disabled={!formData.customDomain || domainStatus.customDomain.checking}
              >
                {domainStatus.customDomain.checking ? 'Verifying...' : 'Verify'}
              </Button>
            </div>
            {errors.customDomain && (
              <p className="text-sm text-red-500 mt-1">{errors.customDomain}</p>
            )}
            {domainStatus.customDomain.verified && (
              <Alert className="mt-2">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Domain verified! Configure the DNS records below.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* SSL Certificate */}
          <div className="flex items-center justify-between">
            <div>
              <Label>SSL Certificate</Label>
              <p className="text-sm text-muted-foreground">
                Automatically provision SSL certificates
              </p>
            </div>
            <Switch
              checked={formData.sslEnabled}
              onCheckedChange={(checked) => handleInputChange('sslEnabled', checked)}
            />
          </div>

          {/* DNS Records */}
          {formData.dnsRecords && Object.keys(formData.dnsRecords).length > 0 && (
            <div>
              <Label>DNS Configuration</Label>
              <div className="space-y-2 mt-2">
                {Object.entries(formData.dnsRecords).map(([key, record]: [string, any]) => (
                  <div key={key} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <Badge variant="outline">{record.type}</Badge>
                      <p className="font-mono text-sm mt-1">{record.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{record.value}</p>
                    </div>
                    <Button size="sm" variant="ghost">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Whitelabel Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Whitelabel Settings
          </CardTitle>
          <CardDescription>
            Customize the branding and remove third-party credits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Whitelabel</Label>
              <p className="text-sm text-muted-foreground">
                Remove platform branding and use your own
              </p>
            </div>
            <Switch
              checked={formData.enableWhitelabel}
              onCheckedChange={(checked) => handleInputChange('enableWhitelabel', checked)}
            />
          </div>

          {formData.enableWhitelabel && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Hide Platform Credits</Label>
                  <p className="text-sm text-muted-foreground">
                    Remove "Powered by" text and links
                  </p>
                </div>
                <Switch
                  checked={formData.hideCredits}
                  onCheckedChange={(checked) => handleInputChange('hideCredits', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Custom Branding</Label>
                  <p className="text-sm text-muted-foreground">
                    Use your own logos and colors throughout
                  </p>
                </div>
                <Switch
                  checked={formData.customBranding}
                  onCheckedChange={(checked) => handleInputChange('customBranding', checked)}
                />
              </div>

              <div>
                <Label htmlFor="customFavicon">Custom Favicon URL</Label>
                <Input
                  id="customFavicon"
                  value={formData.customFavicon}
                  onChange={(e) => handleInputChange('customFavicon', e.target.value)}
                  placeholder="https://yourcompany.com/favicon.ico"
                />
              </div>

              <div>
                <Label htmlFor="customSupportEmail">Custom Support Email</Label>
                <Input
                  id="customSupportEmail"
                  value={formData.whitelabelSettings.customSupportEmail}
                  onChange={(e) => handleInputChange('whitelabelSettings.customSupportEmail', e.target.value)}
                  placeholder="support@yourcompany.com"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customTermsUrl">Terms of Service URL</Label>
                  <Input
                    id="customTermsUrl"
                    value={formData.whitelabelSettings.customTermsUrl}
                    onChange={(e) => handleInputChange('whitelabelSettings.customTermsUrl', e.target.value)}
                    placeholder="https://yourcompany.com/terms"
                  />
                </div>

                <div>
                  <Label htmlFor="customPrivacyUrl">Privacy Policy URL</Label>
                  <Input
                    id="customPrivacyUrl"
                    value={formData.whitelabelSettings.customPrivacyUrl}
                    onChange={(e) => handleInputChange('whitelabelSettings.customPrivacyUrl', e.target.value)}
                    placeholder="https://yourcompany.com/privacy"
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      {(formData.subdomain || formData.customDomain) && (
        <Card>
          <CardHeader>
            <CardTitle>Domain Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {formData.subdomain && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Subdomain</Badge>
                  <span className="font-mono">
                    {formData.sslEnabled ? 'https://' : 'http://'}
                    {formData.subdomain}.yourplatform.com
                  </span>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
              )}
              
              {formData.customDomain && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Custom Domain</Badge>
                  <span className="font-mono">
                    {formData.sslEnabled ? 'https://' : 'http://'}
                    {formData.customDomain}
                  </span>
                  {domainStatus.customDomain.verified ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button
          onClick={handleSaveAndContinue}
          variant="outline"
          disabled={isLoading}
        >
          Save Progress
        </Button>

        <Button
          onClick={handleComplete}
          disabled={isLoading || !canProceed}
        >
          {isLoading ? 'Saving...' : 'Complete & Continue'}
        </Button>
      </div>
    </div>
  );
};


import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Globe, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

interface DomainSetupStepProps {
  stepData: any;
  onComplete: (data: any) => void;
  onNext: () => void;
  isCompleted: boolean;
}

export const DomainSetupStep: React.FC<DomainSetupStepProps> = ({
  stepData,
  onComplete,
  onNext,
  isCompleted
}) => {
  const [formData, setFormData] = useState({
    domainType: stepData?.domain_type || 'subdomain',
    subdomain: stepData?.subdomain || '',
    customDomain: stepData?.custom_domain || '',
    sslEnabled: stepData?.ssl_enabled || true,
    domainStatus: stepData?.domain_status || 'pending'
  });
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useNotifications();

  const validateDomain = (domain: string) => {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
    return domainRegex.test(domain);
  };

  const validateSubdomain = (subdomain: string) => {
    const subdomainRegex = /^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/;
    return subdomainRegex.test(subdomain);
  };

  const handleComplete = async () => {
    if (formData.domainType === 'subdomain' && !formData.subdomain) {
      showError('Please enter a subdomain');
      return;
    }

    if (formData.domainType === 'subdomain' && !validateSubdomain(formData.subdomain)) {
      showError('Please enter a valid subdomain (lowercase letters, numbers, and hyphens only)');
      return;
    }

    if (formData.domainType === 'custom' && !formData.customDomain) {
      showError('Please enter a custom domain');
      return;
    }

    if (formData.domainType === 'custom' && !validateDomain(formData.customDomain)) {
      showError('Please enter a valid domain name');
      return;
    }

    setIsLoading(true);
    try {
      const completionData = {
        domain_type: formData.domainType,
        subdomain: formData.subdomain,
        custom_domain: formData.customDomain,
        ssl_enabled: formData.sslEnabled,
        domain_status: 'configuring',
        setup_completed_at: new Date().toISOString(),
      };

      await onComplete(completionData);
      showSuccess('Domain configuration saved successfully');
      onNext();
    } catch (error) {
      showError('Failed to save domain configuration');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCompleted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Domain Setup - Completed
          </CardTitle>
          <CardDescription>Your domain has been configured successfully</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Domain Type</Label>
              <div className="text-sm">{stepData?.domain_type === 'subdomain' ? 'Subdomain' : 'Custom Domain'}</div>
            </div>
            {stepData?.domain_type === 'subdomain' && stepData?.subdomain && (
              <div>
                <Label>Subdomain URL</Label>
                <div className="font-mono text-sm flex items-center gap-2">
                  https://{stepData.subdomain}.yourdomain.com
                  <ExternalLink className="w-4 h-4" />
                </div>
              </div>
            )}
            {stepData?.domain_type === 'custom' && stepData?.custom_domain && (
              <div>
                <Label>Custom Domain</Label>
                <div className="font-mono text-sm flex items-center gap-2">
                  https://{stepData.custom_domain}
                  <ExternalLink className="w-4 h-4" />
                </div>
              </div>
            )}
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Status: {stepData?.domain_status || 'Active'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Domain Setup
        </CardTitle>
        <CardDescription>
          Configure your domain settings to make your application accessible
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label>Choose Domain Type</Label>
          <RadioGroup
            value={formData.domainType}
            onValueChange={(value) => setFormData(prev => ({ ...prev, domainType: value }))}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="subdomain" id="subdomain" />
              <Label htmlFor="subdomain">Use Subdomain (Recommended)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="custom" id="custom" />
              <Label htmlFor="custom">Use Custom Domain</Label>
            </div>
          </RadioGroup>
        </div>

        {formData.domainType === 'subdomain' && (
          <div className="space-y-2">
            <Label htmlFor="subdomain">Subdomain *</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">https://</span>
              <Input
                id="subdomain"
                placeholder="mycompany"
                value={formData.subdomain}
                onChange={(e) => setFormData(prev => ({ ...prev, subdomain: e.target.value.toLowerCase() }))}
                className={!validateSubdomain(formData.subdomain) && formData.subdomain ? 'border-red-500' : ''}
              />
              <span className="text-sm text-muted-foreground">.yourdomain.com</span>
            </div>
            {formData.subdomain && !validateSubdomain(formData.subdomain) && (
              <p className="text-sm text-red-500">Invalid subdomain format</p>
            )}
            <p className="text-xs text-muted-foreground">
              Choose a unique subdomain for your application (lowercase letters, numbers, and hyphens only)
            </p>
          </div>
        )}

        {formData.domainType === 'custom' && (
          <div className="space-y-2">
            <Label htmlFor="customDomain">Custom Domain *</Label>
            <Input
              id="customDomain"
              placeholder="myapp.example.com"
              value={formData.customDomain}
              onChange={(e) => setFormData(prev => ({ ...prev, customDomain: e.target.value.toLowerCase() }))}
              className={!validateDomain(formData.customDomain) && formData.customDomain ? 'border-red-500' : ''}
            />
            {formData.customDomain && !validateDomain(formData.customDomain) && (
              <p className="text-sm text-red-500">Invalid domain format</p>
            )}
            <p className="text-xs text-muted-foreground">
              Enter your fully qualified domain name (FQDN)
            </p>
          </div>
        )}

        {formData.domainType === 'custom' && (
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-900">DNS Configuration Required</h4>
                <p className="text-sm text-orange-800 mt-1">
                  You'll need to configure your DNS settings after setup:
                </p>
                <ul className="text-sm text-orange-800 mt-2 space-y-1">
                  <li>• Point your domain to our servers</li>
                  <li>• Add CNAME records as provided</li>
                  <li>• SSL certificate will be auto-generated</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <Globe className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Domain Features</h4>
              <ul className="text-sm text-blue-800 mt-1 space-y-1">
                <li>• Free SSL certificates (Let's Encrypt)</li>
                <li>• Global CDN for fast loading</li>
                <li>• Custom domain support</li>
                <li>• Subdomain provisioning in minutes</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button 
            onClick={handleComplete} 
            disabled={isLoading || 
              (formData.domainType === 'subdomain' && !formData.subdomain) ||
              (formData.domainType === 'custom' && !formData.customDomain)
            }
          >
            {isLoading ? 'Configuring...' : 'Complete Domain Setup'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

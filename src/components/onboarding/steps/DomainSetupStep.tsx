
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Globe, CheckCircle, AlertCircle, ExternalLink, Copy } from 'lucide-react';
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
  const [domainData, setDomainData] = useState({
    subdomain: stepData?.subdomain || '',
    customDomain: stepData?.custom_domain || '',
    sslEnabled: stepData?.ssl_enabled || false,
    domainType: stepData?.domain_type || 'subdomain'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [domainStatus, setDomainStatus] = useState(stepData?.domain_status || 'pending');
  const { showSuccess, showError } = useNotifications();

  const validateSubdomain = (subdomain: string) => {
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    return subdomainRegex.test(subdomain) && subdomain.length >= 3 && subdomain.length <= 63;
  };

  const validateCustomDomain = (domain: string) => {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showSuccess('Copied to clipboard');
  };

  const verifyDomain = async () => {
    setIsLoading(true);
    try {
      // Simulate domain verification
      await new Promise(resolve => setTimeout(resolve, 2000));
      setDomainStatus('verified');
      showSuccess('Domain verified successfully');
    } catch (error) {
      showError('Domain verification failed');
      setDomainStatus('failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    if (domainData.domainType === 'subdomain' && !validateSubdomain(domainData.subdomain)) {
      showError('Please enter a valid subdomain');
      return;
    }

    if (domainData.domainType === 'custom' && !validateCustomDomain(domainData.customDomain)) {
      showError('Please enter a valid custom domain');
      return;
    }

    setIsLoading(true);
    try {
      const completionData = {
        subdomain: domainData.subdomain,
        custom_domain: domainData.customDomain,
        domain_type: domainData.domainType,
        ssl_enabled: domainData.sslEnabled,
        domain_status: domainStatus,
        setup_completed_at: new Date().toISOString(),
      };

      await onComplete(completionData);
      showSuccess('Domain setup completed successfully');
      onNext();
    } catch (error) {
      showError('Failed to complete domain setup');
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
          <CardDescription>Your domain configuration is active</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Domain Type</Label>
                <div className="capitalize">{stepData?.domain_type}</div>
              </div>
              <div>
                <Label>Status</Label>
                <Badge variant={stepData?.domain_status === 'verified' ? 'default' : 'secondary'}>
                  {stepData?.domain_status}
                </Badge>
              </div>
            </div>
            {stepData?.subdomain && (
              <div>
                <Label>Subdomain</Label>
                <div className="flex items-center gap-2">
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    {stepData.subdomain}.yourdomain.com
                  </code>
                  <Button size="sm" variant="outline" onClick={() => window.open(`https://${stepData.subdomain}.yourdomain.com`, '_blank')}>
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
            {stepData?.custom_domain && (
              <div>
                <Label>Custom Domain</Label>
                <div className="flex items-center gap-2">
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    {stepData.custom_domain}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => window.open(`https://${stepData.custom_domain}`, '_blank')}>
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
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
          Configure your domain settings for your application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium">Choose Domain Type</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <Card 
                className={`cursor-pointer transition-colors ${
                  domainData.domainType === 'subdomain' ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setDomainData(prev => ({ ...prev, domainType: 'subdomain' }))}
              >
                <CardContent className="p-4">
                  <h4 className="font-medium">Subdomain</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Use our subdomain (recommended for quick setup)
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    yourname.yourdomain.com
                  </p>
                </CardContent>
              </Card>
              <Card 
                className={`cursor-pointer transition-colors ${
                  domainData.domainType === 'custom' ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setDomainData(prev => ({ ...prev, domainType: 'custom' }))}
              >
                <CardContent className="p-4">
                  <h4 className="font-medium">Custom Domain</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Use your own domain name
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    app.yourcompany.com
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {domainData.domainType === 'subdomain' && (
            <div className="space-y-2">
              <Label htmlFor="subdomain">Subdomain *</Label>
              <div className="flex items-center">
                <Input
                  id="subdomain"
                  placeholder="yourcompany"
                  value={domainData.subdomain}
                  onChange={(e) => setDomainData(prev => ({ ...prev, subdomain: e.target.value.toLowerCase() }))}
                  className={!validateSubdomain(domainData.subdomain) && domainData.subdomain ? 'border-red-500' : ''}
                />
                <span className="ml-2 text-muted-foreground">.yourdomain.com</span>
              </div>
              {domainData.subdomain && !validateSubdomain(domainData.subdomain) && (
                <p className="text-sm text-red-500">
                  Subdomain must be 3-63 characters, lowercase letters, numbers, and hyphens only
                </p>
              )}
              {validateSubdomain(domainData.subdomain) && (
                <p className="text-sm text-green-600">
                  Your app will be available at: https://{domainData.subdomain}.yourdomain.com
                </p>
              )}
            </div>
          )}

          {domainData.domainType === 'custom' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customDomain">Custom Domain *</Label>
                <Input
                  id="customDomain"
                  placeholder="app.yourcompany.com"
                  value={domainData.customDomain}
                  onChange={(e) => setDomainData(prev => ({ ...prev, customDomain: e.target.value.toLowerCase() }))}
                  className={!validateCustomDomain(domainData.customDomain) && domainData.customDomain ? 'border-red-500' : ''}
                />
                {domainData.customDomain && !validateCustomDomain(domainData.customDomain) && (
                  <p className="text-sm text-red-500">Please enter a valid domain name</p>
                )}
              </div>

              {validateCustomDomain(domainData.customDomain) && (
                <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                  <h4 className="font-medium text-blue-900">DNS Configuration Required</h4>
                  <p className="text-sm text-blue-800">
                    Add these DNS records to your domain provider:
                  </p>
                  <div className="space-y-2">
                    <div className="bg-white p-3 rounded border">
                      <div className="flex items-center justify-between">
                        <div className="font-mono text-sm">
                          <div><span className="font-semibold">Type:</span> CNAME</div>
                          <div><span className="font-semibold">Name:</span> {domainData.customDomain.split('.')[0]}</div>
                          <div><span className="font-semibold">Value:</span> proxy.yourdomain.com</div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => copyToClipboard('proxy.yourdomain.com')}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={verifyDomain} disabled={isLoading}>
                      {isLoading ? 'Verifying...' : 'Verify Domain'}
                    </Button>
                    <Badge variant={domainStatus === 'verified' ? 'default' : 'secondary'}>
                      {domainStatus === 'verified' ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </>
                      ) : domainStatus === 'failed' ? (
                        <>
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Failed
                        </>
                      ) : (
                        'Pending'
                      )}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-900">SSL Certificate</h4>
              <p className="text-sm text-green-800 mt-1">
                SSL certificate will be automatically generated and maintained for your domain
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button 
            onClick={handleComplete} 
            disabled={isLoading || (domainData.domainType === 'subdomain' && !validateSubdomain(domainData.subdomain)) || (domainData.domainType === 'custom' && (!validateCustomDomain(domainData.customDomain) || domainStatus !== 'verified'))}
          >
            {isLoading ? 'Setting up...' : 'Complete Domain Setup'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

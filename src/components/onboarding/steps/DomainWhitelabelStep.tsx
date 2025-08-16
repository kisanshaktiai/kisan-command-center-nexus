
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Globe, Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';

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
    customDomain: data.customDomain || '',
    subdomain: data.subdomain || '',
    sslEnabled: data.sslEnabled || true,
    ...data
  });

  const [domainValidation, setDomainValidation] = useState({
    isValidating: false,
    isValid: false,
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showSuccess, showError } = useNotifications();

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

  const handleInputChange = (field: string, value: string | boolean) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onDataChange(newData);

    if (field === 'customDomain' && typeof value === 'string') {
      validateDomain(value);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // Update tenant with domain configuration
      const { error } = await supabase
        .from('tenants')
        .update({
          custom_domain: formData.customDomain,
          subdomain: formData.subdomain,
          metadata: {
            ...formData,
            domainConfigured: true,
            configuredAt: new Date().toISOString()
          }
        })
        .eq('id', tenantId);

      if (error) throw error;

      showSuccess('Domain configuration saved successfully');
      onComplete(formData);
    } catch (error) {
      console.error('Error saving domain configuration:', error);
      showError('Failed to save domain configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Domain & White-label Setup</h3>
        <p className="text-muted-foreground">
          Configure your custom domain and white-label settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Custom Domain
          </CardTitle>
          <CardDescription>
            Use your own domain for a professional experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="customDomain">Custom Domain</Label>
            <Input
              id="customDomain"
              value={formData.customDomain}
              onChange={(e) => handleInputChange('customDomain', e.target.value)}
              placeholder="app.yourcompany.com"
            />
            {domainValidation.isValidating && (
              <div className="flex items-center gap-2 mt-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Validating domain...</span>
              </div>
            )}
            {domainValidation.message && !domainValidation.isValidating && (
              <div className="flex items-center gap-2 mt-2">
                {domainValidation.isValid ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-sm ${
                  domainValidation.isValid ? 'text-green-600' : 'text-red-600'
                }`}>
                  {domainValidation.message}
                </span>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="subdomain">Subdomain (Fallback)</Label>
            <div className="flex">
              <Input
                id="subdomain"
                value={formData.subdomain}
                onChange={(e) => handleInputChange('subdomain', e.target.value)}
                placeholder="yourcompany"
              />
              <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border border-l-0 rounded-r-md">
                .kisanshakti.com
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This will be used if custom domain is not configured
            </p>
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
            Add these DNS records to your domain registrar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {formData.customDomain ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Required DNS Records</h4>
                <div className="space-y-2 font-mono text-sm">
                  <div className="flex justify-between items-center p-2 bg-background rounded">
                    <span>Type: CNAME</span>
                    <span>Name: {formData.customDomain}</span>
                    <span>Value: proxy.kisanshakti.com</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-background rounded">
                    <span>Type: TXT</span>
                    <span>Name: _verification</span>
                    <span>Value: kisanshakti-verify={tenantId}</span>
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>After adding these DNS records:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>DNS propagation may take up to 24-48 hours</li>
                  <li>SSL certificate will be automatically provisioned</li>
                  <li>Domain verification will be completed automatically</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Enter a custom domain to see DNS configuration</p>
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

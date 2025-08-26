
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Globe, Mail, Shield } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { platformConfigService, PlatformConfig } from '@/services/platformConfig';

export const PlatformSettings: React.FC = () => {
  const [config, setConfig] = useState<PlatformConfig>(platformConfigService.getConfig());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showSuccess, showError } = useNotifications();

  const handleInputChange = (field: keyof PlatformConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // Update platform configuration
      platformConfigService.updateConfig(config);
      
      // In a real implementation, this would save to database or environment
      // For now, just show success message
      showSuccess('Platform settings updated successfully');
    } catch (error) {
      console.error('Error updating platform settings:', error);
      showError('Failed to update platform settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Platform Configuration
        </h2>
        <p className="text-muted-foreground mt-1">
          Configure platform-wide settings for multi-tenant support
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Platform Identity
          </CardTitle>
          <CardDescription>
            Configure platform name and branding
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="platformName">Platform Name</Label>
            <Input
              id="platformName"
              value={config.platformName}
              onChange={(e) => handleInputChange('platformName', e.target.value)}
              placeholder="Your Platform Name"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Domain Configuration
          </CardTitle>
          <CardDescription>
            Configure domains for multi-tenant support
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="baseDomain">Base Domain</Label>
            <Input
              id="baseDomain"
              value={config.baseDomain}
              onChange={(e) => handleInputChange('baseDomain', e.target.value)}
              placeholder="yourplatform.com"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Used for tenant subdomains (e.g., tenant.yourplatform.com)
            </p>
          </div>

          <div>
            <Label htmlFor="proxyDomain">Proxy Domain</Label>
            <Input
              id="proxyDomain"
              value={config.proxyDomain}
              onChange={(e) => handleInputChange('proxyDomain', e.target.value)}
              placeholder="proxy.yourplatform.com"
            />
            <p className="text-xs text-muted-foreground mt-1">
              CNAME target for custom domains
            </p>
          </div>

          <div>
            <Label htmlFor="verificationPrefix">Verification Prefix</Label>
            <Input
              id="verificationPrefix"
              value={config.verificationPrefix}
              onChange={(e) => handleInputChange('verificationPrefix', e.target.value)}
              placeholder="yourplatform-verify"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Used in TXT records for domain verification
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Configuration
          </CardTitle>
          <CardDescription>
            Configure email addresses for the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="supportEmail">Support Email</Label>
            <Input
              id="supportEmail"
              type="email"
              value={config.supportEmail}
              onChange={(e) => handleInputChange('supportEmail', e.target.value)}
              placeholder="support@yourplatform.com"
            />
          </div>

          <div>
            <Label htmlFor="fromEmail">From Email</Label>
            <Input
              id="fromEmail"
              type="email"
              value={config.fromEmail}
              onChange={(e) => handleInputChange('fromEmail', e.target.value)}
              placeholder="noreply@yourplatform.com"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Used for system emails and invitations
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Saving Settings...' : 'Save Platform Settings'}
        </Button>
      </div>
    </div>
  );
};

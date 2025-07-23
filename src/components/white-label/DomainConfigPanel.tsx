
import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Globe } from 'lucide-react';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { CompactForm, CompactFormSection, CompactFormGroup } from '@/components/ui/compact-form';

interface DomainConfigPanelProps {
  config: any;
  updateConfig: (section: string, field: string, value: any) => void;
}

export function DomainConfigPanel({ config, updateConfig }: DomainConfigPanelProps) {
  return (
    <CollapsibleCard
      title="Domain Configuration"
      description="Set up custom domains and SSL settings"
      icon={<Globe className="w-4 h-4" />}
      defaultOpen={false}
    >
      <CompactForm>
        <CompactFormSection title="Domain Settings">
          <CompactFormGroup>
            <div className="space-y-1">
              <Label className="text-sm font-medium">Custom Domain</Label>
              <Input
                value={config.domain_config?.custom_domain || ''}
                onChange={(e) => updateConfig('domain_config', 'custom_domain', e.target.value)}
                placeholder="app.yourcompany.com"
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium">Subdomain</Label>
              <Input
                value={config.domain_config?.subdomain || ''}
                onChange={(e) => updateConfig('domain_config', 'subdomain', e.target.value)}
                placeholder="yourcompany"
                className="text-sm"
              />
            </div>
          </CompactFormGroup>
        </CompactFormSection>

        <CompactFormSection title="Security Settings">
          <div className="flex items-center space-x-2">
            <Switch
              id="ssl_enabled"
              checked={config.domain_config?.ssl_enabled || false}
              onCheckedChange={(checked) => updateConfig('domain_config', 'ssl_enabled', checked)}
            />
            <Label htmlFor="ssl_enabled" className="text-sm">Enable SSL Certificate</Label>
          </div>
        </CompactFormSection>

        <CompactFormSection title="Redirect URLs">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Redirect URLs (one per line)</Label>
            <Textarea
              value={(config.domain_config?.redirect_urls || []).join('\n')}
              onChange={(e) => updateConfig('domain_config', 'redirect_urls', e.target.value.split('\n').filter(Boolean))}
              placeholder="https://yoursite.com/auth/callback"
              rows={3}
              className="text-sm"
            />
          </div>
        </CompactFormSection>
      </CompactForm>
    </CollapsibleCard>
  );
}

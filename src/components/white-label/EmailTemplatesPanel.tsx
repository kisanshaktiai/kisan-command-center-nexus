
import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail } from 'lucide-react';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { CompactForm, CompactFormSection, CompactFormGroup } from '@/components/ui/compact-form';

interface EmailTemplatesPanelProps {
  config: any;
  updateConfig: (section: string, field: string, value: any) => void;
}

export function EmailTemplatesPanel({ config, updateConfig }: EmailTemplatesPanelProps) {
  const generateEmailPreview = (template: string) => {
    const userName = 'John Doe';
    const appName = config?.app_store_config?.app_name || 'KisanShaktiAI';
    const companyName = config?.brand_identity?.company_name || 'Your Company';
    
    return template
      .replace(/\{\{user_name\}\}/g, userName)
      .replace(/\{\{app_name\}\}/g, appName)
      .replace(/\{\{company_name\}\}/g, companyName);
  };

  return (
    <CollapsibleCard
      title="Email Templates"
      description="Customize email templates and branding"
      icon={<Mail className="w-4 h-4" />}
      defaultOpen={false}
    >
      <CompactForm>
        <CompactFormSection title="Email Branding">
          <CompactFormGroup>
            <div className="space-y-1">
              <Label className="text-sm font-medium">Header Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={config.email_templates?.header_color || '#3b82f6'}
                  onChange={(e) => updateConfig('email_templates', 'header_color', e.target.value)}
                  className="w-12 h-8 p-1 border rounded"
                />
                <Input
                  value={config.email_templates?.header_color || '#3b82f6'}
                  onChange={(e) => updateConfig('email_templates', 'header_color', e.target.value)}
                  placeholder="#3b82f6"
                  className="flex-1 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium">Footer Text</Label>
              <Input
                value={config.email_templates?.footer_text || ''}
                onChange={(e) => updateConfig('email_templates', 'footer_text', e.target.value)}
                placeholder="Powered by KisanShaktiAI"
                className="text-sm"
              />
            </div>
          </CompactFormGroup>
        </CompactFormSection>

        <CompactFormSection title="Welcome Email">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Welcome Email Template</Label>
            <Textarea
              value={config.email_templates?.welcome_template || ''}
              onChange={(e) => updateConfig('email_templates', 'welcome_template', e.target.value)}
              placeholder="Welcome {{user_name}} to {{app_name}}! We're excited to have you on board."
              rows={3}
              className="text-sm"
            />
            {config.email_templates?.welcome_template && (
              <div className="p-2 bg-muted rounded-md">
                <Label className="text-xs font-medium text-muted-foreground">Preview:</Label>
                <div className="text-xs text-foreground mt-1">
                  {generateEmailPreview(config.email_templates.welcome_template)}
                </div>
              </div>
            )}
          </div>
        </CompactFormSection>

        <CompactFormSection title="Notification Email">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Notification Email Template</Label>
            <Textarea
              value={config.email_templates?.notification_template || ''}
              onChange={(e) => updateConfig('email_templates', 'notification_template', e.target.value)}
              placeholder="Hi {{user_name}}, you have a new notification from {{app_name}}."
              rows={3}
              className="text-sm"
            />
          </div>
        </CompactFormSection>
      </CompactForm>
    </CollapsibleCard>
  );
}

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, FileText, Bell, Receipt, Wand2, Eye } from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  variables: string[];
  category: string;
}

interface EmailTemplatesPanelProps {
  config: any;
  updateConfig: (section: string, field: string, value: any) => void;
}

export const EmailTemplatesPanel: React.FC<EmailTemplatesPanelProps> = ({
  config,
  updateConfig
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const emailTemplates: EmailTemplate[] = [
    {
      id: 'welcome',
      name: 'Welcome Email',
      subject: 'Welcome to {{app_name}}!',
      content: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: {{header_color}}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 24px; background: {{primary_color}}; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to {{app_name}}!</h1>
    </div>
    <div class="content">
      <p>Hi {{user_name}},</p>
      <p>Thank you for joining {{company_name}}! We're excited to have you on board.</p>
      <p>Your account has been successfully created. Here's what you can do next:</p>
      <ul>
        <li>Complete your profile setup</li>
        <li>Explore our features</li>
        <li>Connect with other users</li>
      </ul>
      <center>
        <a href="{{app_url}}" class="button">Get Started</a>
      </center>
      <p>If you have any questions, feel free to reach out to our support team.</p>
      <p>Best regards,<br>The {{company_name}} Team</p>
    </div>
    <div class="footer">
      <p>{{footer_text}}</p>
    </div>
  </div>
</body>
</html>`,
      variables: ['app_name', 'user_name', 'company_name', 'app_url', 'header_color', 'primary_color', 'footer_text'],
      category: 'onboarding'
    },
    {
      id: 'notification',
      name: 'Notification Email',
      subject: 'New notification from {{app_name}}',
      content: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: {{header_color}}; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
    .notification-box { background: #f3f4f6; padding: 15px; border-left: 4px solid {{primary_color}}; margin: 20px 0; }
    .button { display: inline-block; padding: 12px 24px; background: {{primary_color}}; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>{{notification_title}}</h2>
    </div>
    <div class="content">
      <p>Hi {{user_name}},</p>
      <div class="notification-box">
        <strong>{{notification_type}}:</strong> {{notification_message}}
      </div>
      <center>
        <a href="{{action_url}}" class="button">{{action_text}}</a>
      </center>
    </div>
  </div>
</body>
</html>`,
      variables: ['app_name', 'user_name', 'notification_title', 'notification_type', 'notification_message', 'action_url', 'action_text'],
      category: 'notifications'
    },
    {
      id: 'invoice',
      name: 'Invoice Email',
      subject: 'Invoice #{{invoice_number}} from {{company_name}}',
      content: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: {{header_color}}; color: white; padding: 30px; text-align: center; }
    .invoice-details { background: white; padding: 30px; border: 1px solid #e5e7eb; }
    .invoice-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .invoice-table th, .invoice-table td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    .total { font-size: 20px; font-weight: bold; color: {{primary_color}}; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Invoice #{{invoice_number}}</h1>
    </div>
    <div class="invoice-details">
      <p><strong>Date:</strong> {{invoice_date}}</p>
      <p><strong>Due Date:</strong> {{due_date}}</p>
      <p><strong>Bill To:</strong> {{customer_name}}</p>
      
      <table class="invoice-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {{invoice_items}}
        </tbody>
      </table>
      
      <p class="total">Total: {{total_amount}}</p>
    </div>
  </div>
</body>
</html>`,
      variables: ['company_name', 'invoice_number', 'invoice_date', 'due_date', 'customer_name', 'invoice_items', 'total_amount'],
      category: 'billing'
    },
    {
      id: 'password-reset',
      name: 'Password Reset',
      subject: 'Reset your {{app_name}} password',
      content: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: {{header_color}}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 24px; background: {{primary_color}}; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .code { background: #f3f4f6; padding: 15px; font-family: monospace; font-size: 18px; text-align: center; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Request</h1>
    </div>
    <div class="content">
      <p>Hi {{user_name}},</p>
      <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
      <p>To reset your password, click the button below:</p>
      <center>
        <a href="{{reset_url}}" class="button">Reset Password</a>
      </center>
      <p>Or use this code:</p>
      <div class="code">{{reset_code}}</div>
      <p>This link will expire in 24 hours.</p>
    </div>
  </div>
</body>
</html>`,
      variables: ['app_name', 'user_name', 'reset_url', 'reset_code'],
      category: 'authentication'
    }
  ];

  const handleApplyTemplate = (template: EmailTemplate) => {
    const fieldMap: { [key: string]: string } = {
      'welcome': 'welcome_template',
      'notification': 'notification_template',
      'invoice': 'invoice_template',
      'password-reset': 'reset_template'
    };
    
    const field = fieldMap[template.id] || `${template.id}_template`;
    updateConfig('email_templates', field, template.content);
    updateConfig('email_templates', `${field}_subject`, template.subject);
    setSelectedTemplate(template);
  };

  const generatePreview = (template: string) => {
    const previewData: { [key: string]: string } = {
      app_name: config.app_store_config?.app_name || 'KisanShaktiAI',
      user_name: 'John Doe',
      company_name: config.brand_identity?.company_name || 'Your Company',
      app_url: 'https://app.example.com',
      header_color: config.email_templates?.header_color || '#3b82f6',
      primary_color: config.brand_identity?.primary_color || '#3b82f6',
      footer_text: config.email_templates?.footer_text || 'Powered by KisanShaktiAI',
      notification_title: 'Important Update',
      notification_type: 'Alert',
      notification_message: 'Your crop health report is ready',
      action_url: 'https://app.example.com/reports',
      action_text: 'View Report',
      invoice_number: '2024-001',
      invoice_date: new Date().toLocaleDateString(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      customer_name: 'ABC Farms',
      invoice_items: '<tr><td>Premium Subscription</td><td>$99.00</td></tr>',
      total_amount: '$99.00',
      reset_url: 'https://app.example.com/reset-password',
      reset_code: '123456'
    };

    let preview = template;
    Object.keys(previewData).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      preview = preview.replace(regex, previewData[key]);
    });

    return preview;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Templates</CardTitle>
        <CardDescription>
          Customize email templates with your branding and content
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="templates">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="templates">
              <FileText className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="custom">
              <Mail className="w-4 h-4 mr-2" />
              Custom
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <div className="grid gap-4">
              {emailTemplates.map(template => (
                <div
                  key={template.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{template.name}</h4>
                      <p className="text-sm text-muted-foreground">{template.subject}</p>
                    </div>
                    <Badge variant="outline">{template.category}</Badge>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplyTemplate(template);
                      }}
                    >
                      <Wand2 className="w-3 h-3 mr-1" />
                      Use Template
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTemplate(template);
                        setPreviewMode(true);
                      }}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Preview
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="header_color">Header Color</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="color"
                    value={config.email_templates?.header_color || '#3b82f6'}
                    onChange={(e) => updateConfig('email_templates', 'header_color', e.target.value)}
                    className="w-16 h-10"
                  />
                  <Input
                    value={config.email_templates?.header_color || '#3b82f6'}
                    onChange={(e) => updateConfig('email_templates', 'header_color', e.target.value)}
                    placeholder="#3b82f6"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="footer_text">Footer Text</Label>
                <Input
                  id="footer_text"
                  value={config.email_templates?.footer_text || ''}
                  onChange={(e) => updateConfig('email_templates', 'footer_text', e.target.value)}
                  placeholder="Powered by KisanShaktiAI"
                />
              </div>
            </div>

            {selectedTemplate && (
              <div>
                <Label>Custom Template Editor</Label>
                <Textarea
                  value={config.email_templates?.[`${selectedTemplate.id}_template`] || selectedTemplate.content}
                  onChange={(e) => updateConfig('email_templates', `${selectedTemplate.id}_template`, e.target.value)}
                  rows={15}
                  className="font-mono text-xs"
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="preview">
            {selectedTemplate && (
              <div className="border rounded-lg overflow-hidden">
                <iframe
                  srcDoc={generatePreview(
                    config.email_templates?.[`${selectedTemplate.id}_template`] || selectedTemplate.content
                  )}
                  className="w-full h-[600px]"
                  title="Email Preview"
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
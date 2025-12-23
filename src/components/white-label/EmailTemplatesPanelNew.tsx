import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Mail, FileText, Eye, Plus, Search, Trash2, Copy, Edit, Upload,
  CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { EmailTemplateEditor } from './EmailTemplateEditor';
import { worldClassTemplates } from '@/lib/emailTemplates';
import type { EmailTemplate } from '@/types/email';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { emailTemplateService } from '@/services/EmailTemplateService';

interface EmailTemplatesPanelNewProps {
  tenantId?: string;
}

export const EmailTemplatesPanelNew: React.FC<EmailTemplatesPanelNewProps> = ({ tenantId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [editingTemplate, setEditingTemplate] = useState<Partial<EmailTemplate> | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [activeTab, setActiveTab] = useState('library');

  const {
    templates,
    categories,
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    isCreating,
    isUpdating,
    isDeleting
  } = useEmailTemplates({ tenantId, isActive: true });

  // Filter templates
  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.template_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t.template_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Tenant-specific templates
  const tenantTemplates = templates.filter(t => t.tenant_id === tenantId);

  const handleSaveTemplate = (template: Partial<EmailTemplate>) => {
    // Extract variables from templates
    const allVariables = extractAllVariables(template);
    
    const templateData = {
      ...template,
      variables: allVariables,
      tenant_id: tenantId
    };

    if (template.id) {
      updateTemplate({ id: template.id, updates: templateData });
    } else {
      createTemplate(templateData as any);
    }
    setEditingTemplate(null);
  };

  const extractAllVariables = (template: Partial<EmailTemplate>): string[] => {
    const regex = /\{\{?(\w+)\}?\}/g;
    const texts = [
      template.subject_template || '',
      template.html_template || '',
      template.text_template || ''
    ].join(' ');
    
    const matches = texts.matchAll(regex);
    return Array.from(new Set(Array.from(matches, m => m[1])));
  };

  const handleInstallTemplate = (libraryTemplate: typeof worldClassTemplates[0]) => {
    setEditingTemplate({
      ...libraryTemplate,
      tenant_id: tenantId,
      is_active: true,
      is_default: false
    });
    setActiveTab('editor');
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      deleteTemplate(id);
    }
  };

  const renderPreview = () => {
    if (!previewTemplate) return null;

    // Mock data for preview
    const mockData = {
      app_name: 'MyApp',
      user_name: 'John Doe',
      company_name: 'Acme Corp',
      primary_color: '#6366f1',
      app_url: 'https://example.com',
      support_email: 'support@example.com',
      verification_url: 'https://example.com/verify',
      reset_url: 'https://example.com/reset',
      reset_code: '123456'
    };

    const rendered = emailTemplateService.renderTemplate(
      previewTemplate.html_template,
      mockData
    );

    return (
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted p-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">{previewTemplate.template_name}</h3>
              <p className="text-sm text-muted-foreground">{previewTemplate.subject_template}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setPreviewTemplate(null)}>
              Close Preview
            </Button>
          </div>
        </div>
        <iframe
          srcDoc={rendered}
          className="w-full h-[600px]"
          title="Email Preview"
        />
      </div>
    );
  };

  if (editingTemplate) {
    return (
      <EmailTemplateEditor
        template={editingTemplate}
        categories={categories}
        onSave={handleSaveTemplate}
        onCancel={() => setEditingTemplate(null)}
        isSaving={isCreating || isUpdating}
      />
    );
  }

  if (previewTemplate) {
    return renderPreview();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Templates</CardTitle>
        <CardDescription>
          Manage and customize email templates with professional designs and white-label branding
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="library">
              <FileText className="w-4 h-4 mr-2" />
              Template Library
            </TabsTrigger>
            <TabsTrigger value="tenant">
              <Mail className="w-4 h-4 mr-2" />
              My Templates ({tenantTemplates.length})
            </TabsTrigger>
            <TabsTrigger value="editor">
              <Edit className="w-4 h-4 mr-2" />
              Editor
            </TabsTrigger>
            <TabsTrigger value="settings">
              <AlertCircle className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Template Library Tab */}
          <TabsContent value="library" className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Choose from our collection of world-class, responsive email templates.
                Click "Install" to customize for your tenant.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4">
              {worldClassTemplates.map((template, idx) => (
                <div
                  key={idx}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{template.template_name}</h4>
                        <Badge variant="outline">{template.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {template.preview_text}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Type: <code className="bg-muted px-1 rounded">{template.template_type}</code>
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.variables.map(v => (
                          <Badge key={v} variant="secondary" className="text-xs">
                            {v}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const mockTemplate: EmailTemplate = {
                            ...template,
                            id: 'preview',
                            tenant_id: '',
                            is_active: true,
                            is_default: false,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                          };
                          setPreviewTemplate(mockTemplate);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleInstallTemplate(template)}
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        Install
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Tenant Templates Tab */}
          <TabsContent value="tenant" className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory || "all"} onValueChange={(value) => setSelectedCategory(value === "all" ? "" : value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => {
                setEditingTemplate({
                  tenant_id: tenantId,
                  template_type: '',
                  template_name: '',
                  subject_template: '',
                  html_template: '',
                  variables: [],
                  is_active: true,
                  is_default: false
                });
                setActiveTab('editor');
              }}>
                <Plus className="w-4 h-4 mr-1" />
                Create New
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading templates...</div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No templates found. Create one or install from the library.
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredTemplates.map(template => (
                  <div
                    key={template.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{template.template_name}</h4>
                          {template.category && (
                            <Badge variant="outline">{template.category}</Badge>
                          )}
                          {template.is_active ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <XCircle className="w-3 h-3" />
                              Inactive
                            </Badge>
                          )}
                          {template.is_default && (
                            <Badge variant="default">Default</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {template.subject_template}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Type: <code className="bg-muted px-1 rounded">{template.template_type}</code>
                          {template.version && ` • Version ${template.version}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewTemplate(template)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingTemplate(template)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => duplicateTemplate({ id: template.id, tenantId })}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteTemplate(template.id)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Editor Tab */}
          <TabsContent value="editor">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Select a template from "Template Library" or "My Templates" to edit,
                or click "Create New" to start from scratch.
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Email template settings and configuration options
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Template Variables</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Use these variables in your templates. They will be replaced with actual values when emails are sent.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {['app_name', 'user_name', 'company_name', 'email', 'verification_url', 'reset_url', 'primary_color'].map(v => (
                    <code key={v} className="bg-background px-2 py-1 rounded text-xs">{`{{${v}}}`}</code>
                  ))}
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Email Best Practices</h4>
                <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                  <li>Keep subject lines under 50 characters</li>
                  <li>Use responsive design for mobile compatibility</li>
                  <li>Include both HTML and plain text versions</li>
                  <li>Test templates across different email clients</li>
                  <li>Always provide an unsubscribe option for marketing emails</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

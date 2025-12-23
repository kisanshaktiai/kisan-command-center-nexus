import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Eye, X } from 'lucide-react';
import type { EmailTemplate } from '@/types/email';

interface EmailTemplateEditorProps {
  template: Partial<EmailTemplate>;
  categories: Array<{ id: string; name: string }>;
  onSave: (template: Partial<EmailTemplate>) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export const EmailTemplateEditor: React.FC<EmailTemplateEditorProps> = ({
  template: initialTemplate,
  categories,
  onSave,
  onCancel,
  isSaving = false
}) => {
  const [template, setTemplate] = useState<Partial<EmailTemplate>>(initialTemplate);
  const [showPreview, setShowPreview] = useState(false);

  const updateField = (field: keyof EmailTemplate, value: any) => {
    setTemplate(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Basic validation
    if (!template.template_name || !template.subject_template || !template.html_template) {
      return;
    }
    onSave(template);
  };

  const extractVariables = (text: string): string[] => {
    const regex = /\{\{?(\w+)\}?\}/g;
    const matches = text.matchAll(regex);
    return Array.from(new Set(Array.from(matches, m => m[1])));
  };

  // Auto-extract variables from templates
  const allVariables = Array.from(new Set([
    ...extractVariables(template.subject_template || ''),
    ...extractVariables(template.html_template || ''),
    ...extractVariables(template.text_template || '')
  ]));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{template.id ? 'Edit Template' : 'Create Template'}</CardTitle>
            <CardDescription>Configure email template content and settings</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
              <Eye className="w-4 h-4 mr-1" />
              {showPreview ? 'Hide' : 'Show'} Preview
            </Button>
            <Button variant="outline" size="sm" onClick={onCancel}>
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-1" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name *</Label>
            <Input
              id="template-name"
              value={template.template_name || ''}
              onChange={(e) => updateField('template_name', e.target.value)}
              placeholder="e.g., Welcome Email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-type">Template Type *</Label>
            <Input
              id="template-type"
              value={template.template_type || ''}
              onChange={(e) => updateField('template_type', e.target.value)}
              placeholder="e.g., welcome, password_reset"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={template.category || ''}
              onValueChange={(value) => updateField('category', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 flex items-center gap-4 pt-7">
            <div className="flex items-center space-x-2">
              <Switch
                id="is-active"
                checked={template.is_active ?? true}
                onCheckedChange={(checked) => updateField('is_active', checked)}
              />
              <Label htmlFor="is-active">Active</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is-default"
                checked={template.is_default ?? false}
                onCheckedChange={(checked) => updateField('is_default', checked)}
              />
              <Label htmlFor="is-default">Default</Label>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject">Subject Template *</Label>
          <Input
            id="subject"
            value={template.subject_template || ''}
            onChange={(e) => updateField('subject_template', e.target.value)}
            placeholder="e.g., Welcome to {{app_name}}, {{user_name}}!"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="preview-text">Preview Text</Label>
          <Input
            id="preview-text"
            value={template.preview_text || ''}
            onChange={(e) => updateField('preview_text', e.target.value)}
            placeholder="Short preview shown in email clients"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="html-template">HTML Template *</Label>
          <Textarea
            id="html-template"
            value={template.html_template || ''}
            onChange={(e) => updateField('html_template', e.target.value)}
            placeholder="Enter HTML email template..."
            className="font-mono text-sm min-h-[300px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="text-template">Plain Text Template</Label>
          <Textarea
            id="text-template"
            value={template.text_template || ''}
            onChange={(e) => updateField('text_template', e.target.value)}
            placeholder="Enter plain text version..."
            className="font-mono text-sm min-h-[150px]"
          />
        </div>

        <div className="space-y-2">
          <Label>Detected Variables</Label>
          <div className="flex flex-wrap gap-2">
            {allVariables.length > 0 ? (
              allVariables.map(v => (
                <Badge key={v} variant="secondary">{v}</Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No variables detected</span>
            )}
          </div>
        </div>

        {showPreview && (
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="border rounded-lg overflow-hidden">
              <iframe
                srcDoc={template.html_template || '<p>No content</p>'}
                className="w-full h-[400px]"
                title="Email Preview"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

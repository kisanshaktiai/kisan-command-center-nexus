
import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Upload, Palette } from 'lucide-react';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { CompactForm, CompactFormSection, CompactFormGroup } from '@/components/ui/compact-form';

interface BrandIdentityPanelProps {
  config: any;
  updateConfig: (section: string, field: string, value: any) => void;
}

export function BrandIdentityPanel({ config, updateConfig }: BrandIdentityPanelProps) {
  const ColorInput = ({ label, value, onChange, placeholder }: any) => (
    <div className="space-y-1">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex gap-2">
        <Input
          type="color"
          value={value || placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-8 p-1 border rounded"
        />
        <Input
          value={value || placeholder}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 text-sm"
        />
      </div>
    </div>
  );

  return (
    <CollapsibleCard
      title="Brand Identity"
      description="Configure colors, fonts, and branding elements"
      icon={<Palette className="w-4 h-4" />}
      defaultOpen={true}
    >
      <CompactForm>
        <CompactFormSection title="Company Information">
          <CompactFormGroup>
            <div className="space-y-1">
              <Label className="text-sm font-medium">Company Name</Label>
              <Input
                value={config.brand_identity?.company_name || ''}
                onChange={(e) => updateConfig('brand_identity', 'company_name', e.target.value)}
                placeholder="Your Company Name"
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium">Font Family</Label>
              <select
                className="w-full p-2 text-sm border rounded-md bg-background"
                value={config.brand_identity?.font_family || 'Inter'}
                onChange={(e) => updateConfig('brand_identity', 'font_family', e.target.value)}
              >
                <option value="Inter">Inter</option>
                <option value="Roboto">Roboto</option>
                <option value="Open Sans">Open Sans</option>
                <option value="Lato">Lato</option>
                <option value="Poppins">Poppins</option>
              </select>
            </div>
          </CompactFormGroup>
        </CompactFormSection>

        <CompactFormSection title="Brand Colors">
          <div className="grid gap-3 md:grid-cols-3">
            <ColorInput
              label="Primary Color"
              value={config.brand_identity?.primary_color}
              onChange={(value: string) => updateConfig('brand_identity', 'primary_color', value)}
              placeholder="#3b82f6"
            />
            <ColorInput
              label="Secondary Color"
              value={config.brand_identity?.secondary_color}
              onChange={(value: string) => updateConfig('brand_identity', 'secondary_color', value)}
              placeholder="#64748b"
            />
            <ColorInput
              label="Accent Color"
              value={config.brand_identity?.accent_color}
              onChange={(value: string) => updateConfig('brand_identity', 'accent_color', value)}
              placeholder="#10b981"
            />
          </div>
        </CompactFormSection>

        <CompactFormSection title="Logo">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Logo URL</Label>
            <div className="flex gap-2">
              <Input
                value={config.brand_identity?.logo_url || ''}
                onChange={(e) => updateConfig('brand_identity', 'logo_url', e.target.value)}
                placeholder="https://example.com/logo.png"
                className="flex-1 text-sm"
              />
              <Button variant="outline" size="sm" className="px-3">
                <Upload className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CompactFormSection>
      </CompactForm>
    </CollapsibleCard>
  );
}

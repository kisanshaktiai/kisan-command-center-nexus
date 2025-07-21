
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Loader2, Upload } from 'lucide-react';
import { TenantFormData } from '@/types/tenant';
import { useSlugValidation } from '@/hooks/useSlugValidation';
import { BrandingPreview } from './BrandingPreview';
import { ColorPicker } from './ColorPicker';

interface TenantFormProps {
  formData: TenantFormData;
  setFormData: (data: TenantFormData) => void;
  onSubmit: () => void;
  isEditing: boolean;
}

export const TenantForm: React.FC<TenantFormProps> = ({ formData, setFormData, onSubmit, isEditing }) => {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#10B981');
  const [secondaryColor, setSecondaryColor] = useState('#065F46');
  const [appName, setAppName] = useState('');
  const [appTagline, setAppTagline] = useState('');
  
  const { isValid: isSlugValid, isChecking: isSlugChecking, error: slugError } = useSlugValidation(formData.slug || '');

  const handleInputChange = (field: keyof TenantFormData, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getSlugValidationIcon = () => {
    if (!formData.slug) return null;
    if (isSlugChecking) return <Loader2 className="w-4 h-4 animate-spin text-gray-500" />;
    if (isSlugValid) return <CheckCircle className="w-4 h-4 text-green-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  const isFormValid = () => {
    return formData.name && formData.slug && isSlugValid && formData.type && formData.subscription_plan;
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="limits">Limits & Features</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
              <CardDescription>Basic information about the tenant organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name *</Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter organization name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <div className="relative">
                    <Input
                      id="slug"
                      value={formData.slug || ''}
                      onChange={(e) => handleInputChange('slug', e.target.value.toLowerCase())}
                      placeholder="organization-slug"
                      required
                      className={`pr-10 ${
                        slugError ? 'border-red-500' : 
                        isSlugValid ? 'border-green-500' : ''
                      }`}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {getSlugValidationIcon()}
                    </div>
                  </div>
                  {slugError && (
                    <p className="text-sm text-red-500">{slugError}</p>
                  )}
                  {isSlugValid && (
                    <p className="text-sm text-green-500">Slug is available</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Organization Type *</Label>
                  <Select value={formData.type || ''} onValueChange={(value) => handleInputChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agri_company">Agriculture Company</SelectItem>
                      <SelectItem value="dealer">Dealer</SelectItem>
                      <SelectItem value="ngo">NGO</SelectItem>
                      <SelectItem value="government">Government</SelectItem>
                      <SelectItem value="university">University</SelectItem>
                      <SelectItem value="sugar_factory">Sugar Factory</SelectItem>
                      <SelectItem value="cooperative">Cooperative</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subscription_plan">Subscription Plan *</Label>
                  <Select value={formData.subscription_plan || ''} onValueChange={(value) => handleInputChange('subscription_plan', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subscription plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kisan_Basic">Kisan – Starter</SelectItem>
                      <SelectItem value="Shakti_Growth">Shakti – Growth</SelectItem>
                      <SelectItem value="AI_Enterprise">AI – Enterprise</SelectItem>
                      <SelectItem value="custom">Custom Plan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status || 'trial'} onValueChange={(value) => handleInputChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner_email">Owner Email</Label>
                  <Input
                    id="owner_email"
                    type="email"
                    value={formData.owner_email || ''}
                    onChange={(e) => handleInputChange('owner_email', e.target.value)}
                    placeholder="owner@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner_name">Owner Name</Label>
                <Input
                  id="owner_name"
                  value={formData.owner_name || ''}
                  onChange={(e) => handleInputChange('owner_name', e.target.value)}
                  placeholder="Enter owner name"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Brand Configuration</CardTitle>
                <CardDescription>Customize your organization's branding</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="logo">Logo Upload</Label>
                  <div className="flex items-center space-x-4">
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('logo')?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Logo
                    </Button>
                    {logoPreview && (
                      <img src={logoPreview} alt="Logo Preview" className="w-10 h-10 object-cover rounded" />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="app_name">App Name</Label>
                    <Input
                      id="app_name"
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                      placeholder="KisanShakti AI"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="app_tagline">App Tagline</Label>
                    <Input
                      id="app_tagline"
                      value={appTagline}
                      onChange={(e) => setAppTagline(e.target.value)}
                      placeholder="Empowering Farmers with AI Technology"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <ColorPicker
                    color={primaryColor}
                    onChange={setPrimaryColor}
                    label="Primary Color"
                  />
                  <ColorPicker
                    color={secondaryColor}
                    onChange={setSecondaryColor}
                    label="Secondary Color"
                  />
                </div>
              </CardContent>
            </Card>

            <BrandingPreview
              logoUrl={logoPreview || undefined}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              appName={appName || formData.name || 'KisanShakti AI'}
              appTagline={appTagline || 'Empowering Farmers with AI Technology'}
            />
          </div>
        </TabsContent>

        <TabsContent value="limits" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Usage Limits</CardTitle>
              <CardDescription>Set resource limits for this tenant</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_farmers">Max Farmers</Label>
                  <Input
                    id="max_farmers"
                    type="number"
                    value={formData.max_farmers || ''}
                    onChange={(e) => handleInputChange('max_farmers', parseInt(e.target.value) || 0)}
                    placeholder="1000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_dealers">Max Dealers</Label>
                  <Input
                    id="max_dealers"
                    type="number"
                    value={formData.max_dealers || ''}
                    onChange={(e) => handleInputChange('max_dealers', parseInt(e.target.value) || 0)}
                    placeholder="50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_products">Max Products</Label>
                  <Input
                    id="max_products"
                    type="number"
                    value={formData.max_products || ''}
                    onChange={(e) => handleInputChange('max_products', parseInt(e.target.value) || 0)}
                    placeholder="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_storage_gb">Max Storage (GB)</Label>
                  <Input
                    id="max_storage_gb"
                    type="number"
                    value={formData.max_storage_gb || ''}
                    onChange={(e) => handleInputChange('max_storage_gb', parseInt(e.target.value) || 0)}
                    placeholder="10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-4">
        <Button 
          type="submit" 
          disabled={!isFormValid() || isSlugChecking}
          className="min-w-32"
        >
          {isSlugChecking ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          {isEditing ? 'Update Tenant' : 'Create Tenant'}
        </Button>
      </div>
    </form>
  );
};

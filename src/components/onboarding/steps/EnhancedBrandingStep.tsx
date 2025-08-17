
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EnhancedBrandingStepProps {
  tenantId: string;
  onComplete: (data: any) => void;
  data?: any;
  onDataChange?: (data: any) => void;
  helpText?: string;
}

export const EnhancedBrandingStep: React.FC<EnhancedBrandingStepProps> = ({
  tenantId,
  onComplete,
  data = {},
  onDataChange,
  helpText
}) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(data.logoUrl || null);
  const [brandingData, setBrandingData] = useState({
    appName: data.appName || '',
    primaryColor: data.primaryColor || '#10B981',
    secondaryColor: data.secondaryColor || '#065F46',
    accentColor: data.accentColor || '#F59E0B',
    logoUrl: data.logoUrl || null,
    ...data
  });

  const updateBrandingData = useCallback((updates: Partial<typeof brandingData>) => {
    const newData = { ...brandingData, ...updates };
    setBrandingData(newData);
    onDataChange?.(newData);
  }, [brandingData, onDataChange]);

  const handleLogoUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Create a unique filename with proper folder structure
      const fileExt = file.name.split('.').pop();
      const fileName = `${tenantId}/logos/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      console.log('Uploading file:', fileName, 'to tenant-assets bucket');

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tenant-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('Upload successful:', uploadData);

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('tenant-assets')
        .getPublicUrl(fileName);

      console.log('Public URL:', publicUrl);

      // Create preview URL for immediate display
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);

      // Update branding data
      updateBrandingData({ logoUrl: publicUrl });

      toast({
        title: "Logo uploaded successfully",
        description: "Your logo has been uploaded and will be used for your tenant branding.",
      });

    } catch (error) {
      console.error('Error uploading logo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setUploadError(errorMessage);
      
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [tenantId, updateBrandingData, toast]);

  const handleRemoveLogo = useCallback(() => {
    setLogoPreview(null);
    updateBrandingData({ logoUrl: null });
    setUploadError(null);
  }, [updateBrandingData]);

  const handleComplete = useCallback(() => {
    if (!brandingData.appName.trim()) {
      toast({
        title: "App name required",
        description: "Please provide an app name for your tenant.",
        variant: "destructive",
      });
      return;
    }

    onComplete(brandingData);
  }, [brandingData, onComplete, toast]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Branding & Customization</h2>
        <p className="text-muted-foreground">
          Customize your tenant's appearance and branding
        </p>
        {helpText && (
          <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
            {helpText}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Brand Configuration</CardTitle>
            <CardDescription>
              Set up your organization's visual identity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Upload */}
            <div className="space-y-3">
              <Label htmlFor="logo">Organization Logo</Label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('logo')?.click()}
                    disabled={isUploading}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? 'Uploading...' : 'Upload Logo'}
                  </Button>
                </div>
                
                {logoPreview && (
                  <div className="relative">
                    <img 
                      src={logoPreview} 
                      alt="Logo Preview" 
                      className="w-12 h-12 object-cover rounded border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 w-5 h-5 p-0"
                      onClick={handleRemoveLogo}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
              
              {uploadError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{uploadError}</AlertDescription>
                </Alert>
              )}
            </div>

            {/* App Name */}
            <div className="space-y-2">
              <Label htmlFor="appName">Application Name *</Label>
              <Input
                id="appName"
                value={brandingData.appName}
                onChange={(e) => updateBrandingData({ appName: e.target.value })}
                placeholder="KisanShakti AI"
                required
              />
            </div>

            {/* Color Configuration */}
            <div className="space-y-4">
              <Label>Brand Colors</Label>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={brandingData.primaryColor}
                    onChange={(e) => updateBrandingData({ primaryColor: e.target.value })}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <div className="flex-1">
                    <Label className="text-sm">Primary Color</Label>
                    <Input
                      value={brandingData.primaryColor}
                      onChange={(e) => updateBrandingData({ primaryColor: e.target.value })}
                      placeholder="#10B981"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={brandingData.secondaryColor}
                    onChange={(e) => updateBrandingData({ secondaryColor: e.target.value })}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <div className="flex-1">
                    <Label className="text-sm">Secondary Color</Label>
                    <Input
                      value={brandingData.secondaryColor}
                      onChange={(e) => updateBrandingData({ secondaryColor: e.target.value })}
                      placeholder="#065F46"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={brandingData.accentColor}
                    onChange={(e) => updateBrandingData({ accentColor: e.target.value })}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <div className="flex-1">
                    <Label className="text-sm">Accent Color</Label>
                    <Input
                      value={brandingData.accentColor}
                      onChange={(e) => updateBrandingData({ accentColor: e.target.value })}
                      placeholder="#F59E0B"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
            <CardDescription>
              See how your branding will look
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              className="p-6 rounded-lg border-2 border-dashed"
              style={{ 
                borderColor: brandingData.primaryColor + '40',
                backgroundColor: brandingData.primaryColor + '08'
              }}
            >
              <div className="text-center space-y-4">
                {logoPreview && (
                  <div className="flex justify-center">
                    <img 
                      src={logoPreview} 
                      alt="Logo Preview" 
                      className="w-16 h-16 object-contain"
                    />
                  </div>
                )}
                
                <div>
                  <h3 
                    className="text-xl font-bold"
                    style={{ color: brandingData.primaryColor }}
                  >
                    {brandingData.appName || 'KisanShakti AI'}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Empowering Farmers with AI Technology
                  </p>
                </div>

                <div className="flex justify-center gap-2">
                  <div 
                    className="w-8 h-8 rounded"
                    style={{ backgroundColor: brandingData.primaryColor }}
                    title={`Primary: ${brandingData.primaryColor}`}
                  />
                  <div 
                    className="w-8 h-8 rounded"
                    style={{ backgroundColor: brandingData.secondaryColor }}
                    title={`Secondary: ${brandingData.secondaryColor}`}
                  />
                  <div 
                    className="w-8 h-8 rounded"
                    style={{ backgroundColor: brandingData.accentColor }}
                    title={`Accent: ${brandingData.accentColor}`}
                  />
                </div>

                <Button
                  style={{ 
                    backgroundColor: brandingData.primaryColor,
                    borderColor: brandingData.primaryColor
                  }}
                  className="text-white hover:opacity-90"
                >
                  Sample Button
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button
          onClick={handleComplete}
          disabled={isUploading || !brandingData.appName.trim()}
          className="px-8"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Complete Branding Setup
        </Button>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Upload, X, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';

interface LogoUploadSectionProps {
  logoUrl: string;
  onLogoChange: (url: string) => void;
  label?: string;
}

export const LogoUploadSection: React.FC<LogoUploadSectionProps> = ({
  logoUrl,
  onLogoChange,
  label = "Logo"
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const { showSuccess, showError } = useNotifications();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showError('File size must be less than 2MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Please upload an image file');
      return;
    }

    try {
      setIsUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('branding-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('branding-assets')
        .getPublicUrl(filePath);

      onLogoChange(publicUrl);
      showSuccess(`${label} uploaded successfully`);
    } catch (error) {
      console.error(`Error uploading ${label}:`, error);
      showError(`Failed to upload ${label}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    onLogoChange('');
    showSuccess(`${label} removed`);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        {logoUrl ? (
          <div className="relative group">
            <img
              src={logoUrl}
              alt={label}
              className="h-20 w-20 object-contain rounded-lg border border-border p-2 bg-background"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleRemoveLogo}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="h-20 w-20 border-2 border-dashed border-border rounded-lg flex items-center justify-center">
            <Image className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        
        <div className="flex-1">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="hidden"
            id={`${label}-upload`}
          />
          <Label htmlFor={`${label}-upload`}>
            <Button
              type="button"
              variant="outline"
              disabled={isUploading}
              asChild
            >
              <span>
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Uploading...' : `Upload ${label}`}
              </span>
            </Button>
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            PNG, JPG or SVG up to 2MB
          </p>
        </div>
      </div>
    </div>
  );
};
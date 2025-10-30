import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload, Image as ImageIcon, Star, MoveVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';
import { supabase } from '@/integrations/supabase/client';

export interface ProductImage {
  id: string;
  url: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  width: number;
  height: number;
  is_primary: boolean;
  display_order: number;
  alt_text?: string;
}

interface ProductImageUploadProps {
  images: ProductImage[];
  onImagesChange: (images: ProductImage[]) => void;
  maxImages?: number;
}

export const ProductImageUpload = ({ 
  images, 
  onImagesChange, 
  maxImages = 5 
}: ProductImageUploadProps) => {
  const [uploading, setUploading] = useState(false);

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const compressAndUploadImage = async (file: File, index: number): Promise<ProductImage> => {
    try {
      // Get original dimensions
      const originalDimensions = await getImageDimensions(file);
      
      // Compress image
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        fileType: 'image/webp',
        initialQuality: 0.85
      });

      // Generate unique filename
      const fileName = `product_${Date.now()}_${index}.webp`;
      const filePath = `products/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(filePath, compressedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return {
        id: crypto.randomUUID(),
        url: publicUrl,
        storage_path: filePath,
        file_name: fileName,
        file_size: compressedFile.size,
        width: originalDimensions.width,
        height: originalDimensions.height,
        is_primary: images.length === 0 && index === 0,
        display_order: images.length + index,
        alt_text: ''
      };
    } catch (error) {
      console.error('Error compressing/uploading image:', error);
      throw error;
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (images.length + acceptedFiles.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    setUploading(true);
    try {
      const uploadPromises = acceptedFiles.map((file, index) => 
        compressAndUploadImage(file, index)
      );
      
      const uploadedImages = await Promise.all(uploadPromises);
      onImagesChange([...images, ...uploadedImages]);
      toast.success(`${uploadedImages.length} image(s) uploaded successfully`);
    } catch (error) {
      toast.error('Failed to upload images. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  }, [images, maxImages, onImagesChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    maxSize: 5242880, // 5MB
    disabled: uploading || images.length >= maxImages
  });

  const handleDelete = async (image: ProductImage) => {
    try {
      // Delete from storage
      const { error } = await supabase.storage
        .from('product-images')
        .remove([image.storage_path]);

      if (error) throw error;

      const updatedImages = images.filter(img => img.id !== image.id);
      
      // If deleted image was primary, make first image primary
      if (image.is_primary && updatedImages.length > 0) {
        updatedImages[0].is_primary = true;
      }
      
      onImagesChange(updatedImages);
      toast.success('Image deleted successfully');
    } catch (error) {
      toast.error('Failed to delete image');
      console.error('Delete error:', error);
    }
  };

  const handleSetPrimary = (imageId: string) => {
    const updatedImages = images.map(img => ({
      ...img,
      is_primary: img.id === imageId
    }));
    onImagesChange(updatedImages);
  };

  const handleAltTextChange = (imageId: string, altText: string) => {
    const updatedImages = images.map(img => 
      img.id === imageId ? { ...img, alt_text: altText } : img
    );
    onImagesChange(updatedImages);
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      {images.length < maxImages && (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          {uploading ? (
            <p className="text-sm text-muted-foreground">Uploading and compressing images...</p>
          ) : isDragActive ? (
            <p className="text-sm text-primary">Drop images here...</p>
          ) : (
            <>
              <p className="text-sm font-medium mb-2">
                Drag & drop images here, or click to select
              </p>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, WebP (max 5MB) • Up to {maxImages} images • Recommended: 1200×1200px
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Images will be compressed to WebP format (~500KB) without quality loss
              </p>
            </>
          )}
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((image) => (
            <Card key={image.id} className="relative group overflow-hidden">
              {/* Image Preview */}
              <div className="aspect-square relative bg-muted">
                <img
                  src={image.url}
                  alt={image.alt_text || 'Product image'}
                  className="w-full h-full object-cover"
                />
                
                {/* Primary Badge */}
                {image.is_primary && (
                  <Badge className="absolute top-2 left-2 bg-primary">
                    <Star className="h-3 w-3 mr-1" />
                    Primary
                  </Badge>
                )}

                {/* Action Buttons */}
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!image.is_primary && (
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => handleSetPrimary(image.id)}
                      title="Set as primary"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => handleDelete(image)}
                    title="Delete image"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Image Info */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center justify-between">
                    <span>{(image.file_size / 1024).toFixed(0)} KB</span>
                    <span>{image.width} × {image.height}px</span>
                  </div>
                </div>
              </div>

              {/* Alt Text Input */}
              <div className="p-3 space-y-2">
                <Label htmlFor={`alt-${image.id}`} className="text-xs">
                  Alt Text (SEO)
                </Label>
                <Input
                  id={`alt-${image.id}`}
                  type="text"
                  placeholder="Describe the image..."
                  value={image.alt_text || ''}
                  onChange={(e) => handleAltTextChange(image.id, e.target.value)}
                  className="text-sm"
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Progress */}
      {images.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            {images.length} of {maxImages} images uploaded
          </span>
          {images.some(img => img.is_primary) && (
            <span className="flex items-center gap-1 text-primary">
              <Star className="h-3 w-3" />
              Primary image set
            </span>
          )}
        </div>
      )}
    </div>
  );
};

-- Create storage bucket for branding assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding-assets', 'branding-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for branding assets bucket
CREATE POLICY "Public can view branding assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding-assets');

CREATE POLICY "Authenticated users can upload branding assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'branding-assets' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own branding assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'branding-assets' 
  AND auth.uid() = owner
);

CREATE POLICY "Users can delete their own branding assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'branding-assets' 
  AND auth.uid() = owner
);
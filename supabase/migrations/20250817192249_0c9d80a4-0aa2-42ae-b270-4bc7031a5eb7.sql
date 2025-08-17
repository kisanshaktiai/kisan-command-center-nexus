
-- Create the tenant-assets storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant-assets',
  'tenant-assets',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

-- Create RLS policies for the tenant-assets bucket
CREATE POLICY "Authenticated users can upload tenant assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tenant-assets' AND
  (storage.foldername(name))[1] LIKE 'tenant-%'
);

CREATE POLICY "Authenticated users can view tenant assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'tenant-assets');

CREATE POLICY "Authenticated users can update their tenant assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tenant-assets' AND
  (storage.foldername(name))[1] LIKE 'tenant-%'
)
WITH CHECK (
  bucket_id = 'tenant-assets' AND
  (storage.foldername(name))[1] LIKE 'tenant-%'
);

CREATE POLICY "Authenticated users can delete their tenant assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'tenant-assets' AND
  (storage.foldername(name))[1] LIKE 'tenant-%'
);

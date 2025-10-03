-- Create storage bucket for NDVI tiles
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ndvi-tiles',
  'ndvi-tiles',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg'];

-- Allow public read access to NDVI tiles
CREATE POLICY "Public read access to NDVI tiles"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ndvi-tiles');

-- Allow service role to upload NDVI tiles
CREATE POLICY "Service role can upload NDVI tiles"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'ndvi-tiles');

-- Allow service role to update NDVI tiles
CREATE POLICY "Service role can update NDVI tiles"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'ndvi-tiles');

-- Allow service role to delete old NDVI tiles
CREATE POLICY "Service role can delete NDVI tiles"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'ndvi-tiles');
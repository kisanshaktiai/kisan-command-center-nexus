-- Fix storage buckets and policies for satellite NDVI processing

-- Drop existing policies if they exist (to recreate them correctly)
DROP POLICY IF EXISTS "Public read access for NDVI tiles" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload NDVI tiles" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage NDVI tiles" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read satellite data" ON storage.objects;
DROP POLICY IF EXISTS "Service role can upload satellite data" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage satellite data" ON storage.objects;

-- Ensure satellite-ndvi-tiles bucket exists with correct config
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'satellite-ndvi-tiles',
  'satellite-ndvi-tiles',
  true,
  52428800, -- 50MB
  ARRAY['image/png', 'image/jpeg', 'image/tiff']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/tiff'];

-- Create RLS policies for satellite-ndvi-tiles
CREATE POLICY "satellite_ndvi_tiles_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'satellite-ndvi-tiles');

CREATE POLICY "satellite_ndvi_tiles_auth_upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'satellite-ndvi-tiles' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "satellite_ndvi_tiles_service_manage"
ON storage.objects FOR ALL
USING (bucket_id = 'satellite-ndvi-tiles' AND auth.role() = 'service_role');

-- Ensure satellite-data bucket with 500MB limit for GeoTIFF files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'satellite-data',
  'satellite-data',
  false,
  524288000, -- 500MB
  ARRAY['image/tiff', 'image/geotiff', 'application/octet-stream']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 524288000,
  allowed_mime_types = ARRAY['image/tiff', 'image/geotiff', 'application/octet-stream'];

-- Create RLS policies for satellite-data bucket
CREATE POLICY "satellite_data_auth_read"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'satellite-data' AND
  auth.role() IN ('authenticated', 'service_role')
);

CREATE POLICY "satellite_data_service_upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'satellite-data' AND
  auth.role() = 'service_role'
);

CREATE POLICY "satellite_data_service_manage"
ON storage.objects FOR ALL
USING (bucket_id = 'satellite-data' AND auth.role() = 'service_role');
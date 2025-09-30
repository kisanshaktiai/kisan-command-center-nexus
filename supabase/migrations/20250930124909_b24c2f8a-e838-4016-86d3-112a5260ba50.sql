-- Ensure satellite-data bucket exists with proper configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'satellite-data', 
  'satellite-data', 
  false,  -- Private bucket for satellite data
  104857600,  -- 100MB limit per file
  ARRAY['image/tiff', 'application/json', 'application/octet-stream']
)
ON CONFLICT (id) 
DO UPDATE SET 
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['image/tiff', 'application/json', 'application/octet-stream'];

-- Create RLS policies for satellite-data bucket
CREATE POLICY "Service role can manage satellite data" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'satellite-data')
WITH CHECK (bucket_id = 'satellite-data');

-- Allow authenticated users to read satellite data
CREATE POLICY "Authenticated users can read satellite data" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'satellite-data' AND auth.role() = 'authenticated');

-- Update satellite_tiles to trigger download on next sync
UPDATE satellite_tiles 
SET 
  actual_download_status = 'not_started',
  processing_stage = 'metadata_stored'
WHERE actual_download_status IS NULL 
  OR (red_band_path IS NULL AND nir_band_path IS NULL);
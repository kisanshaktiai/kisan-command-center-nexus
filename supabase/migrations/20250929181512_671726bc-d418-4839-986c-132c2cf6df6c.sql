-- Create storage bucket for satellite data
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'satellite-data',
  'satellite-data',
  false,
  104857600, -- 100MB limit per file
  ARRAY['image/tiff', 'image/geotiff', 'application/x-geotiff', 'application/octet-stream']
) ON CONFLICT (id) DO NOTHING;

-- Create storage policies for satellite data bucket
CREATE POLICY "Allow authenticated uploads to satellite-data"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'satellite-data');

CREATE POLICY "Allow authenticated reads from satellite-data"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'satellite-data');

CREATE POLICY "Allow authenticated updates to satellite-data"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'satellite-data');

CREATE POLICY "Allow authenticated deletes from satellite-data"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'satellite-data');

-- Create a table to track storage verification
CREATE TABLE IF NOT EXISTS public.satellite_storage_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  satellite_tile_id UUID NOT NULL REFERENCES public.satellite_tiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'red', 'nir', 'ndvi'
  file_exists BOOLEAN NOT NULL DEFAULT false,
  file_size_bytes BIGINT,
  last_verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verification_error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_satellite_storage_audit_tile_id 
ON public.satellite_storage_audit(satellite_tile_id);

CREATE INDEX IF NOT EXISTS idx_satellite_storage_audit_file_type 
ON public.satellite_storage_audit(file_type);

CREATE INDEX IF NOT EXISTS idx_satellite_storage_audit_file_exists 
ON public.satellite_storage_audit(file_exists);

-- Enable RLS
ALTER TABLE public.satellite_storage_audit ENABLE ROW LEVEL SECURITY;

-- RLS policies for storage audit
CREATE POLICY "Super admins can view storage audit"
ON public.satellite_storage_audit FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true
  )
);

CREATE POLICY "System can manage storage audit"
ON public.satellite_storage_audit FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_satellite_storage_audit_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_satellite_storage_audit_timestamp
BEFORE UPDATE ON public.satellite_storage_audit
FOR EACH ROW
EXECUTE FUNCTION public.update_satellite_storage_audit_updated_at();

-- Add storage verification status to satellite_tiles
ALTER TABLE public.satellite_tiles 
ADD COLUMN IF NOT EXISTS storage_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS storage_verification_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS storage_paths_verified JSONB DEFAULT '{}'::jsonb;
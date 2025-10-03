-- Phase 1: Create land_tile_mapping table for spatial relationships
CREATE TABLE IF NOT EXISTS public.land_tile_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  land_id UUID REFERENCES public.lands(id) ON DELETE CASCADE,
  mgrs_tile_id UUID REFERENCES public.mgrs_tiles(id),
  farmer_id UUID REFERENCES public.farmers(id),
  tenant_id UUID REFERENCES public.tenants(id),
  
  -- Actual land bounding box (much smaller than tile)
  land_bbox JSONB NOT NULL,
  land_centroid JSONB,
  
  -- Area in acres/hectares
  land_area_acres NUMERIC,
  land_area_hectares NUMERIC,
  
  -- Track which tile contains this land
  tile_id VARCHAR(10),
  
  -- Cache last NDVI request
  last_ndvi_request_date DATE,
  last_ndvi_value NUMERIC,
  ndvi_cache_expiry TIMESTAMPTZ,
  
  -- Request optimization
  request_priority INTEGER DEFAULT 5,
  needs_refresh BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(land_id, mgrs_tile_id)
);

CREATE INDEX idx_land_tile_mapping_tile ON public.land_tile_mapping(tile_id);
CREATE INDEX idx_land_tile_mapping_farmer ON public.land_tile_mapping(farmer_id);
CREATE INDEX idx_land_tile_mapping_expiry ON public.land_tile_mapping(ndvi_cache_expiry);
CREATE INDEX idx_land_tile_mapping_land ON public.land_tile_mapping(land_id);

-- Phase 2: Create ndvi_micro_tiles table for efficient caching
CREATE TABLE IF NOT EXISTS public.ndvi_micro_tiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  land_id UUID REFERENCES public.lands(id) ON DELETE CASCADE,
  farmer_id UUID REFERENCES public.farmers(id),
  tenant_id UUID REFERENCES public.tenants(id),
  
  -- Small area bbox (not entire MGRS tile)
  bbox JSONB NOT NULL,
  
  -- NDVI data
  acquisition_date DATE NOT NULL,
  cloud_cover NUMERIC,
  ndvi_mean NUMERIC,
  ndvi_min NUMERIC,
  ndvi_max NUMERIC,
  ndvi_std_dev NUMERIC,
  
  -- Compact storage: 256x256 thumbnail instead of 512x512
  ndvi_thumbnail_url TEXT,
  thumbnail_size_kb NUMERIC,
  
  -- Statistics only (no image for most requests)
  statistics_only BOOLEAN DEFAULT false,
  
  -- Cache control
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Processing metadata
  processing_units_used NUMERIC,
  resolution_meters INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(land_id, acquisition_date)
);

CREATE INDEX idx_ndvi_micro_tiles_land ON public.ndvi_micro_tiles(land_id);
CREATE INDEX idx_ndvi_micro_tiles_expiry ON public.ndvi_micro_tiles(expires_at);
CREATE INDEX idx_ndvi_micro_tiles_date ON public.ndvi_micro_tiles(acquisition_date);
CREATE INDEX idx_ndvi_micro_tiles_farmer ON public.ndvi_micro_tiles(farmer_id);

-- Phase 3: Create ndvi_request_queue for batching
CREATE TABLE IF NOT EXISTS public.ndvi_request_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  
  -- Batch multiple land requests
  land_ids UUID[] NOT NULL,
  tile_id VARCHAR(10) NOT NULL,
  
  -- Request params
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  cloud_coverage INTEGER DEFAULT 20,
  
  -- Optimization flags
  statistics_only BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 5,
  
  -- Processing status
  status VARCHAR(20) DEFAULT 'queued',
  batch_size INTEGER,
  processed_count INTEGER DEFAULT 0,
  
  -- Scheduling
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Results
  processing_units_consumed NUMERIC,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ndvi_queue_status ON public.ndvi_request_queue(status, scheduled_for);
CREATE INDEX idx_ndvi_queue_tile ON public.ndvi_request_queue(tile_id);
CREATE INDEX idx_ndvi_queue_tenant ON public.ndvi_request_queue(tenant_id);

-- Enable RLS
ALTER TABLE public.land_tile_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ndvi_micro_tiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ndvi_request_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for land_tile_mapping
CREATE POLICY "Tenant users can view their land tile mappings"
  ON public.land_tile_mapping FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Tenant admins can manage land tile mappings"
  ON public.land_tile_mapping FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants 
      WHERE user_id = auth.uid() AND is_active = true 
      AND role IN ('tenant_owner', 'tenant_admin')
    )
  );

-- RLS Policies for ndvi_micro_tiles
CREATE POLICY "Tenant users can view their NDVI micro tiles"
  ON public.ndvi_micro_tiles FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "System can insert NDVI micro tiles"
  ON public.ndvi_micro_tiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update NDVI micro tiles"
  ON public.ndvi_micro_tiles FOR UPDATE
  USING (true);

-- RLS Policies for ndvi_request_queue
CREATE POLICY "Tenant admins can manage request queue"
  ON public.ndvi_request_queue FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants 
      WHERE user_id = auth.uid() AND is_active = true 
      AND role IN ('tenant_owner', 'tenant_admin')
    )
  );

CREATE POLICY "System can manage request queue"
  ON public.ndvi_request_queue FOR ALL
  USING (true);
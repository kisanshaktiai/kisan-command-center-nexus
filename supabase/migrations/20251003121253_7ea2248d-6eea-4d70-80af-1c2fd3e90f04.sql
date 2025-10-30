-- Phase 4: Migration & Rollout - Data Migration and Validation

-- 4.2 Data Migration: Populate satellite_tiles.last_checked from existing data
UPDATE satellite_tiles
SET last_checked = updated_at
WHERE last_checked IS NULL AND status = 'ready';

-- Create validation view for tile-land mapping
CREATE OR REPLACE VIEW tile_land_mapping_stats AS
SELECT 
  m.tile_id,
  COUNT(DISTINCT l.id) as land_count,
  STRING_AGG(l.name, ', ') as land_names
FROM mgrs_tiles m
INNER JOIN lands l ON ST_Intersects(l.boundary, m.geometry)
WHERE m.is_agri = true
GROUP BY m.tile_id;

-- Create validation view for NDVI coverage
CREATE OR REPLACE VIEW ndvi_coverage_stats AS
SELECT 
  COUNT(*) as total_lands,
  COUNT(nm.id) as lands_with_ndvi,
  MAX(nm.acquisition_date) as latest_ndvi_date,
  COUNT(DISTINCT nm.acquisition_date) as unique_dates
FROM lands l
LEFT JOIN ndvi_micro_tiles nm ON l.id = nm.land_id;
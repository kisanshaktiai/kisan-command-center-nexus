-- Populate MGRS tiles for Maharashtra region (43P grid zone)
INSERT INTO public.mgrs_tiles (tile_id, geometry, is_agri, state, agri_area_km2, total_area_km2)
VALUES 
  -- 43PDT: Covers area around 74.5°E, 16.5°N
  ('43PDT', ST_GeomFromText('POLYGON((74 16, 75 16, 75 17, 74 17, 74 16))', 4326), true, 'Maharashtra', 10000, 12100),
  
  -- 43PDS: Adjacent tile
  ('43PDS', ST_GeomFromText('POLYGON((74 15, 75 15, 75 16, 74 16, 74 15))', 4326), true, 'Maharashtra', 10000, 12100),
  
  -- 43PDU: Adjacent tile
  ('43PDU', ST_GeomFromText('POLYGON((74 17, 75 17, 75 18, 74 18, 74 17))', 4326), true, 'Maharashtra', 10000, 12100),
  
  -- 43PET: Adjacent tile
  ('43PET', ST_GeomFromText('POLYGON((75 16, 76 16, 76 17, 75 17, 75 16))', 4326), true, 'Maharashtra', 10000, 12100),
  
  -- 43PCT: Adjacent tile
  ('43PCT', ST_GeomFromText('POLYGON((73 16, 74 16, 74 17, 73 17, 73 16))', 4326), true, 'Maharashtra', 10000, 12100)
ON CONFLICT (tile_id) DO NOTHING;
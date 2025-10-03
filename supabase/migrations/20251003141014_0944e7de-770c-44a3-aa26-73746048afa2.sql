-- Create storage bucket for satellite NDVI tiles
INSERT INTO storage.buckets (id, name, public)
VALUES ('satellite-ndvi-tiles', 'satellite-ndvi-tiles', true)
ON CONFLICT (id) DO NOTHING;
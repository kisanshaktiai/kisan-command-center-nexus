-- Clean up all existing satellite tiles data
DELETE FROM satellite_tiles;

-- Delete all files from the satellite-data bucket
DELETE FROM storage.objects WHERE bucket_id = 'satellite-data';

-- Delete all files from the satellite-tiles bucket if it exists
DELETE FROM storage.objects WHERE bucket_id = 'satellite-tiles';

-- Reset any sequences if needed
-- This will ensure new tiles start fresh
ALTER SEQUENCE IF EXISTS satellite_tiles_id_seq RESTART WITH 1;
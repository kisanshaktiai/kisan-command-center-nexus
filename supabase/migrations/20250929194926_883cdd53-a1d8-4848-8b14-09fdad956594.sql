-- Reset error tiles to pending so they can be reprocessed with fixed SAS token logic
UPDATE satellite_tiles 
SET 
  status = 'pending',
  error_message = NULL,
  actual_download_status = 'not_started',
  processing_completed_at = NULL,
  updated_at = now()
WHERE status = 'error' 
  AND error_message LIKE '%Failed to download%band: 409%';

-- Also reset processing tiles that might be stuck
UPDATE satellite_tiles 
SET 
  status = 'pending',
  error_message = NULL,
  actual_download_status = 'not_started',
  processing_completed_at = NULL,
  updated_at = now()
WHERE status = 'processing' 
  AND created_at < now() - interval '1 hour';
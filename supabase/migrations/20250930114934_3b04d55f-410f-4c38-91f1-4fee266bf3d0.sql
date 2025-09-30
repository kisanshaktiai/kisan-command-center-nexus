-- Reset tiles stuck in processing status back to pending for retry
UPDATE satellite_tiles 
SET status = 'pending',
    error_message = NULL,
    updated_at = now()
WHERE status IN ('processing', 'error');
// NDVI ingestion is owned by the production cron pipeline
// (mark-agricultural-tiles → ndvi-data-process → external worker).
// Admin-side write tooling has been removed; only NdviDataStatus
// (read-only viewer + manual triggers for the live functions) remains.
export {};

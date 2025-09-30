/**
 * Simplified NDVI processor for agricultural tiles
 * Optimized for Indian agricultural regions
 */

export interface ProcessingResult {
  status: string;
  message: string;
  metadata?: any;
}

/**
 * Calculate NDVI value from Sentinel-2 band values
 * NDVI = (NIR - Red) / (NIR + Red)
 */
export function calculateNDVI(nirValue: number, redValue: number): number {
  if (nirValue + redValue === 0) return 0;
  return (nirValue - redValue) / (nirValue + redValue);
}

/**
 * Classify NDVI values for agricultural interpretation
 */
export function classifyNDVI(ndvi: number): string {
  if (ndvi < 0) return 'water';
  if (ndvi < 0.2) return 'bare_soil';
  if (ndvi < 0.4) return 'sparse_vegetation';
  if (ndvi < 0.6) return 'moderate_vegetation';
  if (ndvi < 0.8) return 'dense_vegetation';
  return 'very_dense_vegetation';
}

/**
 * Process NDVI metadata for agricultural analysis
 */
export async function processNDVIMetadata(
  metadata: any,
  region: string
): Promise<ProcessingResult> {
  console.log(`[processNDVIMetadata] Processing tile ${metadata.tile_id} for ${region}`);
  
  const processedMetadata = {
    ...metadata,
    region,
    processed_at: new Date().toISOString(),
    status: 'ready_for_analysis',
    agricultural_relevance: determineAgriculturalRelevance(region, metadata.acquisition_date)
  };
  
  return {
    status: 'success',
    message: 'NDVI metadata processed successfully',
    metadata: processedMetadata
  };
}

/**
 * Determine agricultural relevance based on region and season
 */
function determineAgriculturalRelevance(region: string, date: string): string {
  const month = new Date(date).getMonth() + 1;
  
  // Kharif season (June-October)
  if (month >= 6 && month <= 10) {
    return 'kharif_season';
  }
  // Rabi season (October-March)
  else if (month >= 10 || month <= 3) {
    return 'rabi_season';
  }
  // Zaid season (April-June)
  else {
    return 'zaid_season';
  }
}

/**
 * Check if a tile needs processing
 */
export function shouldProcessTile(
  existingStatus: string | null,
  forceRefresh: boolean = false
): boolean {
  if (forceRefresh) return true;
  if (!existingStatus) return true;
  if (existingStatus === 'error' || existingStatus === 'pending') return true;
  return false;
}

/**
 * Generate a simple checksum for verification
 */
export function generateSimpleChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}
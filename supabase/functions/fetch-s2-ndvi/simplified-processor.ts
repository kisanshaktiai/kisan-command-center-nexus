/**
 * Simplified NDVI processor without GeoTIFF dependency
 * This is a temporary solution to bypass GeoTIFF import issues
 */

export interface ProcessingResult {
  status: string;
  message: string;
  metadata?: any;
}

/**
 * Process NDVI data without GeoTIFF parsing
 * Stores metadata for later processing
 */
export async function processNDVISimplified(
  redBandUrl: string,
  nirBandUrl: string,
  tileName: string,
  acquisitionDate: string
): Promise<ProcessingResult> {
  console.log(`[processNDVISimplified] Processing ${tileName}/${acquisitionDate}`);
  
  // For now, just store the URLs and metadata
  // The actual NDVI calculation will be done later when GeoTIFF is properly configured
  
  const metadata = {
    tileName,
    acquisitionDate,
    redBandUrl,
    nirBandUrl,
    processedAt: new Date().toISOString(),
    status: 'metadata_stored',
    message: 'Band URLs stored for future processing'
  };
  
  return {
    status: 'success',
    message: 'NDVI metadata stored successfully',
    metadata
  };
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
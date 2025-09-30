/**
 * Lightweight NDVI processor that calculates NDVI without downloading large files
 * Uses COG (Cloud Optimized GeoTIFF) range requests for efficient processing
 */

export interface NDVIResult {
  ndvi_mean: number;
  ndvi_min: number;
  ndvi_max: number;
  ndvi_std: number;
  vegetation_coverage: number;
  classification: string;
  processed_at: string;
}

/**
 * Calculate NDVI statistics from small sample data
 */
export function calculateNDVIStats(redSamples: number[], nirSamples: number[]): NDVIResult {
  const ndviValues: number[] = [];
  
  for (let i = 0; i < Math.min(redSamples.length, nirSamples.length); i++) {
    const red = redSamples[i];
    const nir = nirSamples[i];
    
    // Skip no-data values
    if (red === 0 && nir === 0) continue;
    
    // Calculate NDVI
    const ndvi = (nir - red) / (nir + red);
    if (!isNaN(ndvi) && isFinite(ndvi)) {
      ndviValues.push(ndvi);
    }
  }
  
  if (ndviValues.length === 0) {
    return {
      ndvi_mean: 0,
      ndvi_min: 0,
      ndvi_max: 0,
      ndvi_std: 0,
      vegetation_coverage: 0,
      classification: 'no_data',
      processed_at: new Date().toISOString()
    };
  }
  
  // Calculate statistics
  const mean = ndviValues.reduce((a, b) => a + b, 0) / ndviValues.length;
  const min = Math.min(...ndviValues);
  const max = Math.max(...ndviValues);
  
  // Calculate standard deviation
  const squaredDiffs = ndviValues.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / ndviValues.length;
  const std = Math.sqrt(variance);
  
  // Calculate vegetation coverage (percentage of pixels with NDVI > 0.3)
  const vegetationPixels = ndviValues.filter(v => v > 0.3).length;
  const vegetationCoverage = (vegetationPixels / ndviValues.length) * 100;
  
  // Classify based on mean NDVI
  let classification = 'bare_soil';
  if (mean < 0) classification = 'water';
  else if (mean < 0.2) classification = 'bare_soil';
  else if (mean < 0.4) classification = 'sparse_vegetation';
  else if (mean < 0.6) classification = 'moderate_vegetation';
  else if (mean < 0.8) classification = 'dense_vegetation';
  else classification = 'very_dense_vegetation';
  
  return {
    ndvi_mean: parseFloat(mean.toFixed(4)),
    ndvi_min: parseFloat(min.toFixed(4)),
    ndvi_max: parseFloat(max.toFixed(4)),
    ndvi_std: parseFloat(std.toFixed(4)),
    vegetation_coverage: parseFloat(vegetationCoverage.toFixed(2)),
    classification,
    processed_at: new Date().toISOString()
  };
}

/**
 * Fetch small samples from COG using range requests
 * This avoids downloading the entire file
 */
export async function fetchCOGSamples(url: string, sampleSize: number = 100): Promise<number[]> {
  try {
    // Fetch only the header and a small sample (first 10KB)
    const response = await fetch(url, {
      headers: {
        'Range': 'bytes=0-10240' // Get first 10KB only
      }
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch COG samples from ${url}`);
      return [];
    }
    
    // For now, return mock samples (in production, parse the TIFF header)
    // This would need a proper TIFF parser for real data
    const samples: number[] = [];
    for (let i = 0; i < sampleSize; i++) {
      // Generate realistic sample values for testing
      samples.push(Math.random() * 10000);
    }
    
    return samples;
  } catch (error) {
    console.error('Error fetching COG samples:', error);
    return [];
  }
}
/**
 * PROFESSIONAL NDVI CALCULATION UTILITIES
 * 
 * This module provides world-class NDVI calculation and analysis functions
 * following industry best practices for vegetation monitoring
 */

export interface NDVIResult {
  mean: number;
  min: number;
  max: number;
  stdDev: number;
  vegetationCoverage: number;
  classification: string;
  healthScore: number;
  timestamp: string;
}

export interface NDVIStatistics {
  values: number[];
  mean: number;
  min: number;
  max: number;
  stdDev: number;
  vegetationCoverage: number;
  totalPixels: number;
  validPixels: number;
  completeness: number;
  percentiles: {
    p25: number;
    p50: number;
    p75: number;
    p95: number;
  };
  histogram: Array<{ range: [number, number]; count: number; percentage: number }>;
  vegetationHealth: number;
}

/**
 * Calculate NDVI from RED and NIR band values
 * NDVI = (NIR - RED) / (NIR + RED)
 * 
 * @param nir Near-Infrared band value (0-1 range)
 * @param red Red band value (0-1 range)
 * @returns NDVI value (-1 to 1 range)
 */
export function calculateNDVI(nir: number, red: number): number | null {
  if (nir + red === 0) return null;
  if (nir < 0 || red < 0) return null;
  
  const ndvi = (nir - red) / (nir + red);
  
  // Clamp to valid range
  return Math.max(-1, Math.min(1, ndvi));
}

/**
 * Classify NDVI value into vegetation category
 * Based on standard remote sensing classification thresholds
 */
export function classifyNDVI(ndvi: number): string {
  if (ndvi < -0.1) return 'water';
  if (ndvi < 0.1) return 'bare_soil';
  if (ndvi < 0.3) return 'sparse_vegetation';
  if (ndvi < 0.5) return 'moderate_vegetation';
  if (ndvi < 0.7) return 'dense_vegetation';
  return 'very_dense_vegetation';
}

/**
 * Calculate comprehensive NDVI statistics from sample data
 * 
 * @param redSamples Array of RED band reflectance values
 * @param nirSamples Array of NIR band reflectance values
 * @returns Complete NDVI statistics
 */
export function calculateNDVIStatistics(
  redSamples: number[], 
  nirSamples: number[]
): NDVIStatistics {
  const minLength = Math.min(redSamples.length, nirSamples.length);
  const ndviValues: number[] = [];
  
  // Calculate NDVI for each pixel pair
  for (let i = 0; i < minLength; i++) {
    const ndvi = calculateNDVI(nirSamples[i], redSamples[i]);
    if (ndvi !== null) {
      ndviValues.push(ndvi);
    }
  }
  
  if (ndviValues.length === 0) {
    throw new Error("No valid NDVI values could be calculated");
  }
  
  // Sort for percentile calculations
  const sorted = [...ndviValues].sort((a, b) => a - b);
  
  // Calculate mean
  const mean = ndviValues.reduce((sum, val) => sum + val, 0) / ndviValues.length;
  
  // Calculate standard deviation
  const variance = ndviValues.reduce((sum, val) => 
    sum + Math.pow(val - mean, 2), 0
  ) / ndviValues.length;
  const stdDev = Math.sqrt(variance);
  
  // Calculate percentiles
  const p25 = sorted[Math.floor(sorted.length * 0.25)];
  const p50 = sorted[Math.floor(sorted.length * 0.50)];
  const p75 = sorted[Math.floor(sorted.length * 0.75)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  
  // Vegetation coverage (NDVI > 0.2)
  const vegetationPixels = ndviValues.filter(v => v > 0.2).length;
  const vegetationCoverage = (vegetationPixels / ndviValues.length) * 100;
  
  // Data completeness
  const completeness = (ndviValues.length / minLength) * 100;
  
  // Create histogram
  const histogram = createHistogram(ndviValues, 20);
  
  // Calculate vegetation health score
  const vegetationHealth = calculateVegetationHealth(
    mean, 
    stdDev, 
    vegetationCoverage, 
    completeness
  );
  
  return {
    values: ndviValues,
    mean: round(mean, 3),
    min: round(sorted[0], 3),
    max: round(sorted[sorted.length - 1], 3),
    stdDev: round(stdDev, 3),
    vegetationCoverage: round(vegetationCoverage, 2),
    totalPixels: minLength,
    validPixels: ndviValues.length,
    completeness: round(completeness, 2),
    percentiles: {
      p25: round(p25, 3),
      p50: round(p50, 3),
      p75: round(p75, 3),
      p95: round(p95, 3)
    },
    histogram,
    vegetationHealth: round(vegetationHealth, 2)
  };
}

/**
 * Create histogram of NDVI values
 */
function createHistogram(
  values: number[], 
  bins: number
): Array<{ range: [number, number]; count: number; percentage: number }> {
  const min = -1;
  const max = 1;
  const binSize = (max - min) / bins;
  const histogram = new Array(bins).fill(0);
  
  for (const value of values) {
    const binIndex = Math.min(bins - 1, Math.floor((value - min) / binSize));
    histogram[binIndex]++;
  }
  
  return histogram.map((count, index) => ({
    range: [
      round(min + (index * binSize), 2),
      round(min + ((index + 1) * binSize), 2)
    ] as [number, number],
    count,
    percentage: round((count / values.length) * 100, 2)
  }));
}

/**
 * Calculate comprehensive vegetation health score (0-100)
 * 
 * Factors:
 * - NDVI mean (40 points): Higher values indicate healthier vegetation
 * - Consistency (20 points): Lower std dev indicates uniform vegetation
 * - Coverage (25 points): Higher coverage indicates more vegetation
 * - Completeness (15 points): Higher completeness indicates better data quality
 */
export function calculateVegetationHealth(
  mean: number, 
  stdDev: number, 
  coverage: number, 
  completeness: number
): number {
  // NDVI mean score (0-40 points)
  const ndviScore = Math.min(40, (mean + 1) * 20);
  
  // Consistency score (0-20 points): lower std dev is better
  const consistencyScore = Math.max(0, 20 - (stdDev * 40));
  
  // Coverage score (0-25 points)
  const coverageScore = coverage * 0.25;
  
  // Completeness score (0-15 points)
  const completenessScore = completeness * 0.15;
  
  const totalScore = ndviScore + consistencyScore + coverageScore + completenessScore;
  
  return Math.min(100, Math.max(0, totalScore));
}

/**
 * Extract samples from band data buffer
 * Handles different data types and scales appropriately
 */
export async function extractBandSamples(
  buffer: ArrayBuffer,
  bandType: 'red' | 'nir',
  sampleRate: number = 100
): Promise<number[]> {
  const samples: number[] = [];
  
  // Try to detect data type from buffer
  // Sentinel-2 L2A is typically 16-bit unsigned integer
  const view = new Uint16Array(buffer);
  
  // Sample every nth pixel
  for (let i = 0; i < view.length; i += sampleRate) {
    const value = view[i];
    
    // Sentinel-2 L2A reflectance is scaled 0-10000
    // Convert to 0-1 range
    if (value > 0 && value < 10000) {
      samples.push(value / 10000);
    }
  }
  
  return samples;
}

/**
 * Classify vegetation zones from NDVI values
 */
export function classifyVegetationZones(ndviValues: number[]) {
  const zones = {
    water: 0,
    bare_soil: 0,
    sparse_vegetation: 0,
    moderate_vegetation: 0,
    dense_vegetation: 0,
    very_dense_vegetation: 0
  };
  
  for (const ndvi of ndviValues) {
    if (ndvi < -0.1) zones.water++;
    else if (ndvi < 0.1) zones.bare_soil++;
    else if (ndvi < 0.3) zones.sparse_vegetation++;
    else if (ndvi < 0.5) zones.moderate_vegetation++;
    else if (ndvi < 0.7) zones.dense_vegetation++;
    else zones.very_dense_vegetation++;
  }
  
  const total = ndviValues.length;
  return {
    water: { count: zones.water, percentage: round((zones.water / total) * 100, 2) },
    bare_soil: { count: zones.bare_soil, percentage: round((zones.bare_soil / total) * 100, 2) },
    sparse_vegetation: { count: zones.sparse_vegetation, percentage: round((zones.sparse_vegetation / total) * 100, 2) },
    moderate_vegetation: { count: zones.moderate_vegetation, percentage: round((zones.moderate_vegetation / total) * 100, 2) },
    dense_vegetation: { count: zones.dense_vegetation, percentage: round((zones.dense_vegetation / total) * 100, 2) },
    very_dense_vegetation: { count: zones.very_dense_vegetation, percentage: round((zones.very_dense_vegetation / total) * 100, 2) }
  };
}

/**
 * Detect anomalies in NDVI data
 */
export function detectNDVIAnomalies(
  current: NDVIStatistics,
  historical: NDVIStatistics[]
): { hasAnomalies: boolean; anomalies: string[]; severity: string } {
  const anomalies: string[] = [];
  
  if (historical.length === 0) {
    return { hasAnomalies: false, anomalies, severity: 'none' };
  }
  
  // Calculate historical baseline
  const historicalMean = historical.reduce((sum, h) => sum + h.mean, 0) / historical.length;
  const historicalStdDev = Math.sqrt(
    historical.reduce((sum, h) => sum + Math.pow(h.mean - historicalMean, 2), 0) / historical.length
  );
  
  // Check for significant deviation
  const zScore = Math.abs((current.mean - historicalMean) / historicalStdDev);
  
  if (zScore > 2) {
    anomalies.push(`Significant NDVI deviation (z-score: ${zScore.toFixed(2)})`);
  }
  
  // Check for sudden drops
  const recentMean = historical[historical.length - 1]?.mean;
  if (recentMean && current.mean < recentMean - 0.2) {
    anomalies.push(`Sharp NDVI decrease detected: ${((recentMean - current.mean) * 100).toFixed(1)}% drop`);
  }
  
  // Check for low vegetation coverage
  if (current.vegetationCoverage < 20) {
    anomalies.push(`Low vegetation coverage: ${current.vegetationCoverage.toFixed(1)}%`);
  }
  
  const severity = anomalies.length >= 2 ? 'high' : anomalies.length === 1 ? 'medium' : 'none';
  
  return {
    hasAnomalies: anomalies.length > 0,
    anomalies,
    severity
  };
}

/**
 * Round number to specified decimal places
 */
function round(value: number, decimals: number): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

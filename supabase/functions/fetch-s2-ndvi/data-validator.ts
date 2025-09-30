import GeoTIFF from 'https://cdn.skypack.dev/geotiff@2.0.7';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  statistics: BandStatistics;
  qualityScore: number;
  metadata: ValidationMetadata;
}

export interface BandStatistics {
  min: number;
  max: number;
  mean: number;
  stdDev: number;
  noDataCount: number;
  totalPixels: number;
  noDataPercentage: number;
  validRange: { min: number; max: number };
}

export interface ValidationMetadata {
  isTiff: boolean;
  hasGeoKeys: boolean;
  hasTiePoints: boolean;
  hasTransform: boolean;
  crs: string | null;
  width: number;
  height: number;
  samplesPerPixel: number;
  bitsPerSample: number[];
  photometricInterpretation: number;
  compression: number;
  magicBytes: string;
}

export interface DimensionMatch {
  matches: boolean;
  redDimensions: { width: number; height: number; samples: number };
  nirDimensions: { width: number; height: number; samples: number };
}

/**
 * Validate TIFF magic bytes
 */
export function validateTiffMagicBytes(buffer: ArrayBuffer): { isValid: boolean; magicBytes: string } {
  const view = new DataView(buffer);
  
  // Check for TIFF magic bytes (little-endian: 0x4949 or big-endian: 0x4D4D)
  const firstTwo = view.getUint16(0, false);
  const magicBytes = firstTwo.toString(16).toUpperCase().padStart(4, '0');
  
  const isValid = firstTwo === 0x4949 || firstTwo === 0x4D4D;
  
  console.log(`[validateTiffMagicBytes] Magic bytes: 0x${magicBytes}, Valid: ${isValid}`);
  
  return { isValid, magicBytes };
}

/**
 * Validate GeoTIFF metadata
 */
export async function validateGeoTiffMetadata(tiff: any): Promise<Partial<ValidationMetadata>> {
  try {
    const image = await tiff.getImage();
    
    // Get basic metadata
    const width = image.getWidth();
    const height = image.getHeight();
    const samplesPerPixel = image.getSamplesPerPixel();
    const bitsPerSample = image.getBitsPerSample();
    const photometricInterpretation = image.getPhotometricInterpretation();
    const compression = image.getCompression();
    
    // Check for geo keys
    const geoKeys = image.getGeoKeys();
    const hasGeoKeys = geoKeys && Object.keys(geoKeys).length > 0;
    
    // Check for tie points
    const tiePoints = image.getTiePoints();
    const hasTiePoints = tiePoints && tiePoints.length > 0;
    
    // Check for transform
    const modelTransformation = image.getModelTransformation();
    const hasTransform = modelTransformation && modelTransformation.length > 0;
    
    // Get CRS if available
    let crs: string | null = null;
    if (geoKeys && geoKeys.ProjectedCSTypeGeoKey) {
      crs = `EPSG:${geoKeys.ProjectedCSTypeGeoKey}`;
    } else if (geoKeys && geoKeys.GeographicTypeGeoKey) {
      crs = `EPSG:${geoKeys.GeographicTypeGeoKey}`;
    }
    
    console.log(`[validateGeoTiffMetadata] Dimensions: ${width}x${height}, Samples: ${samplesPerPixel}`);
    console.log(`[validateGeoTiffMetadata] GeoKeys: ${hasGeoKeys}, TiePoints: ${hasTiePoints}, Transform: ${hasTransform}`);
    console.log(`[validateGeoTiffMetadata] CRS: ${crs || 'unknown'}`);
    
    return {
      hasGeoKeys,
      hasTiePoints,
      hasTransform,
      crs,
      width,
      height,
      samplesPerPixel,
      bitsPerSample,
      photometricInterpretation,
      compression
    };
  } catch (error) {
    console.error(`[validateGeoTiffMetadata] Error:`, error);
    throw error;
  }
}

/**
 * Calculate band statistics
 */
export async function calculateBandStatistics(
  data: Float32Array | Uint16Array | Uint8Array,
  expectedRange: { min: number; max: number } = { min: 0, max: 10000 }
): Promise<BandStatistics> {
  const totalPixels = data.length;
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let noDataCount = 0;
  let validValues: number[] = [];
  
  // First pass: calculate min, max, sum, and count nodata
  for (let i = 0; i < totalPixels; i++) {
    const value = data[i];
    
    // Check for nodata (typically 0 or negative values for Sentinel-2)
    if (value <= 0 || isNaN(value) || !isFinite(value)) {
      noDataCount++;
      continue;
    }
    
    validValues.push(value);
    min = Math.min(min, value);
    max = Math.max(max, value);
    sum += value;
  }
  
  const validCount = validValues.length;
  const mean = validCount > 0 ? sum / validCount : 0;
  
  // Second pass: calculate standard deviation
  let sumSquaredDiff = 0;
  for (const value of validValues) {
    sumSquaredDiff += Math.pow(value - mean, 2);
  }
  
  const stdDev = validCount > 0 ? Math.sqrt(sumSquaredDiff / validCount) : 0;
  const noDataPercentage = (noDataCount / totalPixels) * 100;
  
  console.log(`[calculateBandStatistics] Statistics - Min: ${min}, Max: ${max}, Mean: ${mean.toFixed(2)}, StdDev: ${stdDev.toFixed(2)}`);
  console.log(`[calculateBandStatistics] NoData: ${noDataCount}/${totalPixels} (${noDataPercentage.toFixed(2)}%)`);
  
  return {
    min: min === Infinity ? 0 : min,
    max: max === -Infinity ? 0 : max,
    mean,
    stdDev,
    noDataCount,
    totalPixels,
    noDataPercentage,
    validRange: expectedRange
  };
}

/**
 * Validate pixel value ranges for Sentinel-2 L2A data
 */
export function validatePixelValueRange(
  statistics: BandStatistics,
  bandType: 'RED' | 'NIR'
): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const expectedRange = { min: 0, max: 10000 }; // Sentinel-2 L2A typical range
  
  // Check if values are within expected range
  if (statistics.max > expectedRange.max * 1.5) {
    warnings.push(`${bandType} band has unusually high values (max: ${statistics.max})`);
  }
  
  if (statistics.min < expectedRange.min && statistics.min !== 0) {
    warnings.push(`${bandType} band has negative values (min: ${statistics.min})`);
  }
  
  // Check for suspicious nodata percentage
  if (statistics.noDataPercentage > 50) {
    warnings.push(`${bandType} band has >50% nodata values (${statistics.noDataPercentage.toFixed(2)}%)`);
  }
  
  // Check for extreme values
  if (statistics.max > 20000) {
    warnings.push(`${bandType} band has extreme values that may indicate data corruption`);
  }
  
  // Check if all values are the same (flat image)
  if (statistics.stdDev === 0 && statistics.totalPixels > 0) {
    warnings.push(`${bandType} band has no variation (all pixels have the same value)`);
  }
  
  const isValid = warnings.length === 0 || 
    (warnings.length === 1 && statistics.noDataPercentage <= 75);
  
  return { isValid, warnings };
}

/**
 * Compare dimensions between RED and NIR bands
 */
export function compareBandDimensions(
  redMetadata: Partial<ValidationMetadata>,
  nirMetadata: Partial<ValidationMetadata>
): DimensionMatch {
  const matches = 
    redMetadata.width === nirMetadata.width &&
    redMetadata.height === nirMetadata.height &&
    redMetadata.samplesPerPixel === nirMetadata.samplesPerPixel;
  
  if (!matches) {
    console.error(`[compareBandDimensions] Dimension mismatch!`);
    console.error(`RED: ${redMetadata.width}x${redMetadata.height}, samples: ${redMetadata.samplesPerPixel}`);
    console.error(`NIR: ${nirMetadata.width}x${nirMetadata.height}, samples: ${nirMetadata.samplesPerPixel}`);
  }
  
  return {
    matches,
    redDimensions: {
      width: redMetadata.width || 0,
      height: redMetadata.height || 0,
      samples: redMetadata.samplesPerPixel || 0
    },
    nirDimensions: {
      width: nirMetadata.width || 0,
      height: nirMetadata.height || 0,
      samples: nirMetadata.samplesPerPixel || 0
    }
  };
}

/**
 * Compare CRS between bands
 */
export function compareCRS(redCRS: string | null, nirCRS: string | null): boolean {
  if (!redCRS || !nirCRS) {
    console.warn(`[compareCRS] Missing CRS - RED: ${redCRS}, NIR: ${nirCRS}`);
    return true; // Allow processing even if CRS is missing
  }
  
  const matches = redCRS === nirCRS;
  if (!matches) {
    console.error(`[compareCRS] CRS mismatch - RED: ${redCRS}, NIR: ${nirCRS}`);
  }
  
  return matches;
}

/**
 * Calculate data quality score (0-100)
 */
export function calculateQualityScore(
  validationResults: {
    redValidation: Partial<ValidationResult>;
    nirValidation: Partial<ValidationResult>;
    dimensionMatch: DimensionMatch;
    crsMatch: boolean;
  }
): number {
  let score = 100;
  const penalties: { reason: string; penalty: number }[] = [];
  
  // Check RED band issues
  if (validationResults.redValidation.errors && validationResults.redValidation.errors.length > 0) {
    const penalty = Math.min(50, validationResults.redValidation.errors.length * 15);
    penalties.push({ reason: 'RED band errors', penalty });
    score -= penalty;
  }
  
  if (validationResults.redValidation.warnings && validationResults.redValidation.warnings.length > 0) {
    const penalty = Math.min(20, validationResults.redValidation.warnings.length * 5);
    penalties.push({ reason: 'RED band warnings', penalty });
    score -= penalty;
  }
  
  // Check NIR band issues
  if (validationResults.nirValidation.errors && validationResults.nirValidation.errors.length > 0) {
    const penalty = Math.min(50, validationResults.nirValidation.errors.length * 15);
    penalties.push({ reason: 'NIR band errors', penalty });
    score -= penalty;
  }
  
  if (validationResults.nirValidation.warnings && validationResults.nirValidation.warnings.length > 0) {
    const penalty = Math.min(20, validationResults.nirValidation.warnings.length * 5);
    penalties.push({ reason: 'NIR band warnings', penalty });
    score -= penalty;
  }
  
  // Check dimension match
  if (!validationResults.dimensionMatch.matches) {
    penalties.push({ reason: 'Dimension mismatch', penalty: 30 });
    score -= 30;
  }
  
  // Check CRS match
  if (!validationResults.crsMatch) {
    penalties.push({ reason: 'CRS mismatch', penalty: 10 });
    score -= 10;
  }
  
  // Check nodata percentage
  const redNoData = validationResults.redValidation.statistics?.noDataPercentage || 0;
  const nirNoData = validationResults.nirValidation.statistics?.noDataPercentage || 0;
  const avgNoData = (redNoData + nirNoData) / 2;
  
  if (avgNoData > 25) {
    const penalty = Math.min(30, Math.floor((avgNoData - 25) / 2));
    penalties.push({ reason: `High nodata (${avgNoData.toFixed(1)}%)`, penalty });
    score -= penalty;
  }
  
  // Ensure score stays within bounds
  score = Math.max(0, Math.min(100, score));
  
  console.log(`[calculateQualityScore] Final score: ${score}`);
  if (penalties.length > 0) {
    console.log(`[calculateQualityScore] Penalties:`, penalties);
  }
  
  return score;
}

/**
 * Perform comprehensive validation of band data
 */
export async function validateBandData(
  data: ArrayBuffer,
  bandType: 'RED' | 'NIR'
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let statistics: BandStatistics = {
    min: 0,
    max: 0,
    mean: 0,
    stdDev: 0,
    noDataCount: 0,
    totalPixels: 0,
    noDataPercentage: 0,
    validRange: { min: 0, max: 10000 }
  };
  let metadata: ValidationMetadata = {
    isTiff: false,
    hasGeoKeys: false,
    hasTiePoints: false,
    hasTransform: false,
    crs: null,
    width: 0,
    height: 0,
    samplesPerPixel: 0,
    bitsPerSample: [],
    photometricInterpretation: 0,
    compression: 0,
    magicBytes: ''
  };
  
  try {
    // Validate TIFF magic bytes
    const { isValid: isTiff, magicBytes } = validateTiffMagicBytes(data);
    metadata.isTiff = isTiff;
    metadata.magicBytes = magicBytes;
    
    if (!isTiff) {
      errors.push(`Invalid TIFF file: wrong magic bytes (0x${magicBytes})`);
      return {
        isValid: false,
        errors,
        warnings,
        statistics,
        qualityScore: 0,
        metadata
      };
    }
    
    // Parse GeoTIFF
    const tiff = await GeoTIFF.fromArrayBuffer(data);
    const image = await tiff.getImage();
    
    // Validate metadata
    const geoMetadata = await validateGeoTiffMetadata(tiff);
    metadata = { ...metadata, ...geoMetadata };
    
    // Check for required geo information
    if (!metadata.hasGeoKeys && !metadata.hasTiePoints && !metadata.hasTransform) {
      warnings.push('Missing geospatial information (no GeoKeys, TiePoints, or Transform)');
    }
    
    // Read raster data
    const rasters = await image.readRasters();
    const bandData = rasters[0] as Float32Array | Uint16Array | Uint8Array;
    
    // Calculate statistics
    statistics = await calculateBandStatistics(bandData);
    
    // Validate pixel value range
    const { isValid: rangeValid, warnings: rangeWarnings } = validatePixelValueRange(statistics, bandType);
    warnings.push(...rangeWarnings);
    
    if (!rangeValid && statistics.noDataPercentage > 75) {
      errors.push(`${bandType} band has too much invalid data (${statistics.noDataPercentage.toFixed(2)}% nodata)`);
    }
    
    // Calculate a simple quality score for this band
    let qualityScore = 100;
    if (errors.length > 0) qualityScore -= errors.length * 25;
    if (warnings.length > 0) qualityScore -= warnings.length * 10;
    if (statistics.noDataPercentage > 25) {
      qualityScore -= Math.min(30, Math.floor((statistics.noDataPercentage - 25) / 2));
    }
    qualityScore = Math.max(0, Math.min(100, qualityScore));
    
    const isValid = errors.length === 0;
    
    return {
      isValid,
      errors,
      warnings,
      statistics,
      qualityScore,
      metadata
    };
    
  } catch (error) {
    console.error(`[validateBandData] Error validating ${bandType} band:`, error);
    errors.push(`Failed to validate ${bandType} band: ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      isValid: false,
      errors,
      warnings,
      statistics,
      qualityScore: 0,
      metadata
    };
  }
}

/**
 * Perform comprehensive validation of RED and NIR bands
 */
export async function validateBands(
  redData: ArrayBuffer,
  nirData: ArrayBuffer
): Promise<{
  isValid: boolean;
  qualityScore: number;
  redValidation: ValidationResult;
  nirValidation: ValidationResult;
  dimensionMatch: DimensionMatch;
  crsMatch: boolean;
  errors: string[];
  warnings: string[];
  shouldProceed: boolean;
}> {
  console.log(`[validateBands] Starting comprehensive validation`);
  console.log(`[validateBands] RED data size: ${redData.byteLength} bytes`);
  console.log(`[validateBands] NIR data size: ${nirData.byteLength} bytes`);
  
  // Validate individual bands
  const redValidation = await validateBandData(redData, 'RED');
  const nirValidation = await validateBandData(nirData, 'NIR');
  
  // Compare dimensions
  const dimensionMatch = compareBandDimensions(redValidation.metadata, nirValidation.metadata);
  
  // Compare CRS
  const crsMatch = compareCRS(redValidation.metadata.crs, nirValidation.metadata.crs);
  
  // Compile all errors and warnings
  const errors: string[] = [
    ...redValidation.errors.map(e => `RED: ${e}`),
    ...nirValidation.errors.map(e => `NIR: ${e}`)
  ];
  
  const warnings: string[] = [
    ...redValidation.warnings.map(w => `RED: ${w}`),
    ...nirValidation.warnings.map(w => `NIR: ${w}`)
  ];
  
  if (!dimensionMatch.matches) {
    errors.push('Band dimensions do not match');
  }
  
  if (!crsMatch) {
    warnings.push('CRS mismatch between bands');
  }
  
  // Calculate overall quality score
  const qualityScore = calculateQualityScore({
    redValidation,
    nirValidation,
    dimensionMatch,
    crsMatch
  });
  
  // Determine if processing should proceed
  const shouldProceed = 
    redValidation.isValid && 
    nirValidation.isValid && 
    dimensionMatch.matches &&
    qualityScore >= 25; // Minimum quality threshold
  
  const isValid = errors.length === 0;
  
  console.log(`[validateBands] Validation complete - Valid: ${isValid}, Quality: ${qualityScore}, Should proceed: ${shouldProceed}`);
  if (errors.length > 0) {
    console.error(`[validateBands] Errors:`, errors);
  }
  if (warnings.length > 0) {
    console.warn(`[validateBands] Warnings:`, warnings);
  }
  
  return {
    isValid,
    qualityScore,
    redValidation,
    nirValidation,
    dimensionMatch,
    crsMatch,
    errors,
    warnings,
    shouldProceed
  };
}
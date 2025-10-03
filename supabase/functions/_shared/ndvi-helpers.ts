/**
 * Shared NDVI helper functions for optimization
 */

/**
 * Calculate optimal resolution based on land area
 * Small lands get high detail, large lands get coarse detail
 */
export function calculateOptimalResolution(areaHectares: number): number {
  if (areaHectares < 1) return 10;   // < 1 ha: High detail (10m)
  if (areaHectares < 10) return 20;  // 1-10 ha: Medium detail (20m)
  if (areaHectares < 50) return 60;  // 10-50 ha: Standard detail (60m)
  return 100;                         // > 50 ha: Coarse detail (100m)
}

/**
 * Extract bounding box from GeoJSON polygon
 */
export function extractBboxFromBoundary(boundary: any): number[] {
  if (!boundary || !boundary.coordinates) {
    throw new Error('Invalid boundary geometry');
  }

  const coords = boundary.coordinates[0];
  let minLon = Infinity, minLat = Infinity;
  let maxLon = -Infinity, maxLat = -Infinity;

  for (const [lon, lat] of coords) {
    minLon = Math.min(minLon, lon);
    minLat = Math.min(minLat, lat);
    maxLon = Math.max(maxLon, lon);
    maxLat = Math.max(maxLat, lat);
  }

  return [minLon, minLat, maxLon, maxLat];
}

/**
 * Calculate union of multiple bounding boxes
 */
export function calculateUnionBbox(bboxes: number[][]): number[] {
  if (bboxes.length === 0) {
    throw new Error('No bounding boxes provided');
  }

  let minLon = Infinity, minLat = Infinity;
  let maxLon = -Infinity, maxLat = -Infinity;

  for (const [west, south, east, north] of bboxes) {
    minLon = Math.min(minLon, west);
    minLat = Math.min(minLat, south);
    maxLon = Math.max(maxLon, east);
    maxLat = Math.max(maxLat, north);
  }

  return [minLon, minLat, maxLon, maxLat];
}

/**
 * Determine if NDVI data should be refreshed
 */
export function shouldRefreshNdvi(
  lastRequestDate: Date | null,
  cropType: string | null,
  currentDate: Date = new Date()
): boolean {
  if (!lastRequestDate) return true;

  const daysSinceLastRequest = Math.floor(
    (currentDate.getTime() - new Date(lastRequestDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Critical growing season crops (April-September in Northern Hemisphere)
  const month = currentDate.getMonth();
  const isCriticalSeason = month >= 3 && month <= 8;

  if (isCriticalSeason && cropType) {
    return daysSinceLastRequest > 3; // Refresh every 3 days during growing season
  }

  // Off-season
  if (month < 3 || month > 8) {
    return daysSinceLastRequest > 14; // Refresh every 2 weeks in off-season
  }

  // Default: weekly refresh
  return daysSinceLastRequest > 7;
}

/**
 * Group land requests by MGRS tile for batching
 */
export function groupLandsByTile(lands: Array<{ id: string; tile_id: string; bbox: number[] }>) {
  const grouped = new Map<string, Array<{ id: string; bbox: number[] }>>();

  for (const land of lands) {
    const existing = grouped.get(land.tile_id) || [];
    existing.push({ id: land.id, bbox: land.bbox });
    grouped.set(land.tile_id, existing);
  }

  return grouped;
}

/**
 * Calculate processing units cost estimate
 */
export function estimateProcessingUnits(
  resolution: number,
  bboxArea: number,
  statisticsOnly: boolean
): number {
  // Base cost for statistics
  let cost = 0.1;

  // Add imagery cost if requested
  if (!statisticsOnly) {
    // Higher resolution = higher cost
    if (resolution <= 10) cost += 1.0;
    else if (resolution <= 20) cost += 0.5;
    else if (resolution <= 60) cost += 0.2;
    else cost += 0.1;

    // Larger area = higher cost
    const areaFactor = Math.min(bboxArea / 1000, 2); // Cap at 2x
    cost *= (1 + areaFactor);
  }

  return cost;
}

/**
 * Deduplicate requests with same tile, date, and resolution
 */
export function deduplicateNdviRequests(
  requests: Array<{
    id: string;
    tile_id: string;
    date: string;
    resolution: number;
  }>
): Array<{
  id: string;
  tile_id: string;
  date: string;
  resolution: number;
}> {
  const uniqueRequests = new Map<string, typeof requests[0]>();

  for (const req of requests) {
    const key = `${req.tile_id}_${req.date}_${req.resolution}`;
    if (!uniqueRequests.has(key)) {
      uniqueRequests.set(key, req);
    }
  }

  return Array.from(uniqueRequests.values());
}

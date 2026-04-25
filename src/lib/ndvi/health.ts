// NDVI health bands & helpers — pure logic, no I/O.

export type HealthBand = 'good' | 'moderate' | 'poor' | 'unknown';

export const NDVI_THRESHOLDS = { good: 0.5, moderate: 0.3 } as const;

export function classifyNdvi(value: number | null | undefined): HealthBand {
  if (value == null || isNaN(Number(value))) return 'unknown';
  const v = Number(value);
  if (v >= NDVI_THRESHOLDS.good) return 'good';
  if (v >= NDVI_THRESHOLDS.moderate) return 'moderate';
  return 'poor';
}

export const HEALTH_LABEL: Record<HealthBand, string> = {
  good: 'Good',
  moderate: 'Moderate',
  poor: 'Poor',
  unknown: 'Unknown',
};

export const HEALTH_COLOR: Record<HealthBand, string> = {
  good: 'hsl(142 71% 45%)',
  moderate: 'hsl(38 92% 50%)',
  poor: 'hsl(0 84% 60%)',
  unknown: 'hsl(220 9% 46%)',
};

export interface NdviPoint {
  date: string; // YYYY-MM-DD
  ndvi_value: number | null;
}

/**
 * The worker forward-fills NDVI between Sentinel-2 revisits. To get true
 * acquisition dates we keep only points where the value changes from the
 * previous day (plus the very first point).
 */
export function dedupeAcquisitions<T extends NdviPoint>(points: T[]): T[] {
  if (!points?.length) return [];
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const out: T[] = [];
  let prev: number | null | undefined;
  for (const p of sorted) {
    const v = p.ndvi_value == null ? null : Number(p.ndvi_value);
    if (out.length === 0 || v !== prev) {
      out.push(p);
      prev = v;
    }
  }
  return out;
}

export function movingAverage(values: number[], window = 3): number[] {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

export function zScores(values: number[]): number[] {
  const n = values.length;
  if (!n) return [];
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance) || 1;
  return values.map((v) => (v - mean) / std);
}

export interface AdvisoryHint {
  severity: 'info' | 'warn' | 'critical';
  title: string;
  detail: string;
}

/**
 * Lightweight rule-based advisory derived solely from the NDVI series.
 * Keep deterministic — AI insights live in the edge function.
 */
export function buildAdvisory(series: NdviPoint[]): AdvisoryHint[] {
  const acq = dedupeAcquisitions(series).filter((p) => p.ndvi_value != null);
  if (acq.length < 2) return [];
  const hints: AdvisoryHint[] = [];
  const last = Number(acq[acq.length - 1].ndvi_value);
  const recent = acq.slice(-4).map((p) => Number(p.ndvi_value));
  const peak = Math.max(...acq.map((p) => Number(p.ndvi_value)));

  // Sudden drop
  const prev = recent.length >= 2 ? recent[recent.length - 2] : last;
  if (prev - last > 0.1) {
    hints.push({
      severity: 'warn',
      title: 'Sudden NDVI drop',
      detail: `NDVI fell ${(prev - last).toFixed(2)} since previous acquisition. Check irrigation and pest pressure.`,
    });
  }

  // Persistent stress
  if (recent.length >= 3 && recent.every((v) => v < 0.3)) {
    hints.push({
      severity: 'critical',
      title: 'Persistent low vegetation index',
      detail: 'NDVI has stayed below 0.30 for the last 3 acquisitions. Crop stress likely — review water and nutrient supply.',
    });
  }

  // Past peak (possible maturity / harvest window)
  if (peak > 0.5 && last < peak - 0.15) {
    hints.push({
      severity: 'info',
      title: 'Past vegetative peak',
      detail: `Peak NDVI of ${peak.toFixed(2)} reached, currently at ${last.toFixed(2)}. Crop may be entering maturity or senescence.`,
    });
  }

  return hints;
}

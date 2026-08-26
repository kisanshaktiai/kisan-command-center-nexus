/**
 * useAppVersionCheck - Hook for checking app version updates
 *
 * Behavior:
 * - Fetches the active version for a given `app_key` from `app_versions`
 * - The version the user is actually running is the one recorded when this
 *   browser session first loaded the app (baseline, persisted in sessionStorage).
 *   App version always comes from the `app_versions` table, never env vars.
 * - Polls periodically; if the active row moves ahead of the baseline, the user
 *   is running a stale build and we surface an update.
 *
 * Does NOT block initial render - runs in background.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_APP_KEY = 'admin_portal';
const POLL_INTERVAL_MS = 5 * 60 * 1000;
const BASELINE_STORAGE_PREFIX = 'app_version_baseline:';

type UpdatePolicy = 'OPTIONAL' | 'RECOMMENDED' | 'FORCED';

type UpdateStatus =
  | 'checking' // Initial state, fetching version
  | 'up-to-date' // Running build matches active version
  | 'update-available' // New version published, current build is stale
  | 'update-required' // Forced policy, or running build below min_supported_version
  | 'error' // Failed to check
  | 'offline'; // Network unavailable

interface VersionBaseline {
  version: string;
  build_hash: string;
}

interface UseAppVersionCheckResult {
  status: UpdateStatus;
  currentVersion: string;
  latestVersion: string | null;
  buildHash: string;
  updatePolicy: UpdatePolicy | null;
  releaseNotes: string | null;
  isLoading: boolean;
  error: string | null;
  checkForUpdates: () => Promise<void>;
}

/** Compare semver-ish strings. Returns <0, 0 or >0. Non-numeric parts ignored. */
function compareVersions(a: string, b: string): number {
  const parse = (v: string) =>
    v
      .replace(/^v/i, '')
      .split(/[.\-+]/)
      .map((p) => parseInt(p, 10))
      .filter((n) => !Number.isNaN(n));
  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da < db ? -1 : 1;
  }
  return 0;
}

function readBaseline(appKey: string): VersionBaseline | null {
  try {
    const raw = sessionStorage.getItem(BASELINE_STORAGE_PREFIX + appKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VersionBaseline;
    return parsed?.version ? parsed : null;
  } catch {
    return null;
  }
}

function writeBaseline(appKey: string, baseline: VersionBaseline) {
  try {
    sessionStorage.setItem(BASELINE_STORAGE_PREFIX + appKey, JSON.stringify(baseline));
  } catch {
    // ignore storage failures (private mode, quota)
  }
}

export function useAppVersionCheck(appKey: string = DEFAULT_APP_KEY): UseAppVersionCheckResult {
  const [status, setStatus] = useState<UpdateStatus>('checking');
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [buildHash, setBuildHash] = useState<string>('');
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [updatePolicy, setUpdatePolicy] = useState<UpdatePolicy | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const baselineRef = useRef<VersionBaseline | null>(null);

  const checkForUpdates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!navigator.onLine) {
        setStatus('offline');
        setIsLoading(false);
        return;
      }

      const { data, error: dbError } = await supabase
        .from('app_versions')
        .select('app_key, version, build_hash, deployed_at, update_policy, min_supported_version, release_notes')
        .eq('app_key', appKey)
        .eq('is_current', true)
        .maybeSingle();

      if (dbError) {
        console.error('[useAppVersionCheck] Database error:', dbError);
        throw new Error(dbError.message);
      }

      if (!data) {
        console.log('[useAppVersionCheck] No version found for app_key:', appKey);
        setLatestVersion(null);
        setUpdatePolicy(null);
        setReleaseNotes(null);
        setStatus('up-to-date');
        setIsLoading(false);
        return;
      }

      const policy = ((data.update_policy as UpdatePolicy) || 'OPTIONAL') as UpdatePolicy;
      setLatestVersion(data.version);
      setUpdatePolicy(policy);
      setReleaseNotes(data.release_notes || null);

      // Establish the running build's baseline once per browser session.
      let baseline = baselineRef.current ?? readBaseline(appKey);
      if (!baseline) {
        baseline = { version: data.version, build_hash: data.build_hash ?? '' };
        writeBaseline(appKey, baseline);
      }
      baselineRef.current = baseline;

      setCurrentVersion(baseline.version);
      setBuildHash(baseline.build_hash);

      const isStale =
        compareVersions(baseline.version, data.version) < 0 ||
        (compareVersions(baseline.version, data.version) === 0 &&
          !!data.build_hash &&
          !!baseline.build_hash &&
          baseline.build_hash !== data.build_hash);

      const belowMinimum =
        !!data.min_supported_version &&
        compareVersions(baseline.version, data.min_supported_version) < 0;

      if (belowMinimum || (isStale && policy === 'FORCED')) {
        setStatus('update-required');
      } else if (isStale) {
        setStatus('update-available');
      } else {
        setStatus('up-to-date');
      }

      console.log('[useAppVersionCheck] Version check:', {
        app_key: appKey,
        running: baseline.version,
        latest: data.version,
        policy,
        isStale,
        belowMinimum,
      });
    } catch (err) {
      console.warn('[useAppVersionCheck] Failed to check version:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [appKey]);

  // Initial (non-blocking) check + periodic polling + refresh on focus/online.
  useEffect(() => {
    const timer = setTimeout(() => {
      checkForUpdates();
    }, 500);

    const interval = setInterval(() => {
      checkForUpdates();
    }, POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') checkForUpdates();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', checkForUpdates);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', checkForUpdates);
    };
  }, [checkForUpdates]);

  return {
    status,
    currentVersion,
    latestVersion,
    buildHash,
    updatePolicy,
    releaseNotes,
    isLoading,
    error,
    checkForUpdates,
  };
}

// Legacy exports kept for backwards compatibility. Prefer the hook state instead.
export const APP_VERSION = '';
export const APP_BUILD_HASH = '';

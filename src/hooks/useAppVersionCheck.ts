/**
 * useAppVersionCheck - Hook for checking app version updates
 *
 * Behavior:
 * - Fetches the active version for a given `app_key` from `app_versions`
 * - Returns version info and update status/actions
 *
 * Does NOT block initial render - runs in background.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_APP_KEY = 'admin_portal';

// Types for version response
interface AppVersionInfo {
  app_key: string;
  version: string;
  build_hash: string;
  deployed_at: string;
  update_policy: 'OPTIONAL' | 'RECOMMENDED' | 'FORCED';
  min_supported_version: string | null;
  release_notes?: string | null;
}

type UpdateStatus =
  | 'checking' // Initial state, fetching version
  | 'up-to-date' // Current version matches latest
  | 'update-available' // New version exists but not required
  | 'update-required' // Version below min_supported_version
  | 'error' // Failed to check
  | 'offline'; // Network unavailable

interface UseAppVersionCheckResult {
  status: UpdateStatus;
  currentVersion: string;
  latestVersion: string | null;
  buildHash: string;
  updatePolicy: 'OPTIONAL' | 'RECOMMENDED' | 'FORCED' | null;
  releaseNotes: string | null;
  isLoading: boolean;
  error: string | null;
  checkForUpdates: () => Promise<void>;
}

export function useAppVersionCheck(appKey: string = DEFAULT_APP_KEY): UseAppVersionCheckResult {
  const [status, setStatus] = useState<UpdateStatus>('checking');
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [buildHash, setBuildHash] = useState<string>('');
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [updatePolicy, setUpdatePolicy] = useState<'OPTIONAL' | 'RECOMMENDED' | 'FORCED' | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkForUpdates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if offline
      if (!navigator.onLine) {
        setStatus('offline');
        setIsLoading(false);
        return;
      }

      // Fetch active version directly from database
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
        // No version registered yet
        console.log('[useAppVersionCheck] No version found for app_key:', appKey);
        setLatestVersion(null);
        setUpdatePolicy(null);
        setReleaseNotes(null);
        setStatus('up-to-date');
        setIsLoading(false);
        return;
      }

      // Set version info from database
      setCurrentVersion(data.version);
      setBuildHash(data.build_hash);
      setLatestVersion(data.version);
      setUpdatePolicy((data.update_policy as 'OPTIONAL' | 'RECOMMENDED' | 'FORCED') || 'OPTIONAL');
      setReleaseNotes(data.release_notes || null);
      setStatus('up-to-date');

      console.log('[useAppVersionCheck] Version loaded:', {
        app_key: appKey,
        version: data.version,
        build_hash: data.build_hash,
      });
    } catch (err) {
      console.warn('[useAppVersionCheck] Failed to check version:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [appKey]);

  // Check on mount (non-blocking)
  useEffect(() => {
    // Delay initial check to not block render
    const timer = setTimeout(() => {
      checkForUpdates();
    }, 500);

    return () => clearTimeout(timer);
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


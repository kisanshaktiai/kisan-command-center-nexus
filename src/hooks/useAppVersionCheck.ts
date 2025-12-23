/**
 * useAppVersionCheck - Hook for checking app version updates
 * 
 * Behavior:
 * - Fetches /api/app-version from edge function
 * - Compares with current app version from build
 * - Returns update status and actions
 * 
 * Does NOT block initial render - runs in background.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Version info injected at build time
const CURRENT_VERSION = import.meta.env.VITE_APP_VERSION || '0.0.0';
const BUILD_HASH = import.meta.env.VITE_BUILD_HASH || 'dev';
const APP_KEY = import.meta.env.VITE_APP_KEY || 'USER_APP';

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
  | 'checking'      // Initial state, fetching version
  | 'up-to-date'    // Current version matches latest
  | 'update-available' // New version exists but not required
  | 'update-required'  // Version below min_supported_version
  | 'error'         // Failed to check
  | 'offline';      // Network unavailable

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

/**
 * Compare semantic versions (semver)
 * Returns: -1 if a < b, 0 if equal, 1 if a > b
 */
function compareVersions(a: string, b: string): number {
  const normalize = (v: string) => v.replace(/^v/, '').split('.').map(Number);
  const [aMajor = 0, aMinor = 0, aPatch = 0] = normalize(a);
  const [bMajor = 0, bMinor = 0, bPatch = 0] = normalize(b);

  if (aMajor !== bMajor) return aMajor < bMajor ? -1 : 1;
  if (aMinor !== bMinor) return aMinor < bMinor ? -1 : 1;
  if (aPatch !== bPatch) return aPatch < bPatch ? -1 : 1;
  return 0;
}

export function useAppVersionCheck(): UseAppVersionCheckResult {
  const [status, setStatus] = useState<UpdateStatus>('checking');
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

      // Direct fetch to edge function with query params
      // (supabase.functions.invoke doesn't support GET with query params well)
      const response = await fetch(
        `https://qfklkkzxemsbeniyugiz.supabase.co/functions/v1/app-version?app_key=${encodeURIComponent(APP_KEY)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          // No version registered yet - treat as up-to-date
          console.log('[useAppVersionCheck] No remote version found, assuming up-to-date');
          setStatus('up-to-date');
          setIsLoading(false);
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const versionData: AppVersionInfo = await response.json();
      processVersionData(versionData);

    } catch (err) {
      console.warn('[useAppVersionCheck] Failed to check version:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const processVersionData = (versionData: AppVersionInfo) => {
    setLatestVersion(versionData.version);
    setUpdatePolicy(versionData.update_policy);
    setReleaseNotes(versionData.release_notes || null);

    // Check if current version is below minimum supported
    if (versionData.min_supported_version) {
      const comparison = compareVersions(CURRENT_VERSION, versionData.min_supported_version);
      if (comparison < 0) {
        console.warn('[useAppVersionCheck] App version below minimum supported:', {
          current: CURRENT_VERSION,
          minSupported: versionData.min_supported_version,
        });
        setStatus('update-required');
        return;
      }
    }

    // Compare current version with latest
    const versionComparison = compareVersions(CURRENT_VERSION, versionData.version);
    
    if (versionComparison < 0) {
      // Current is older than latest
      console.log('[useAppVersionCheck] Update available:', {
        current: CURRENT_VERSION,
        latest: versionData.version,
        policy: versionData.update_policy,
      });
      setStatus('update-available');
    } else {
      // Up to date or ahead (development)
      console.log('[useAppVersionCheck] App is up-to-date:', CURRENT_VERSION);
      setStatus('up-to-date');
    }
  };

  // Check on mount (non-blocking)
  useEffect(() => {
    // Delay initial check to not block render
    const timer = setTimeout(() => {
      checkForUpdates();
    }, 1000);

    return () => clearTimeout(timer);
  }, [checkForUpdates]);

  // Log version in development
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log(`App Version: ${CURRENT_VERSION} (build ${BUILD_HASH})`);
    }
  }, []);

  return {
    status,
    currentVersion: CURRENT_VERSION,
    latestVersion,
    buildHash: BUILD_HASH,
    updatePolicy,
    releaseNotes,
    isLoading,
    error,
    checkForUpdates,
  };
}

// Export version constants for external use
export const APP_VERSION = CURRENT_VERSION;
export const APP_BUILD_HASH = BUILD_HASH;

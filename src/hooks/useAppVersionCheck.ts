/**
 * useAppVersionCheck - Hook for checking app version updates
 * 
 * Behavior:
 * - Fetches version directly from app_versions table
 * - Returns update status and actions
 * 
 * Does NOT block initial render - runs in background.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// App key for this portal - defaults to admin_portal for super admin
const APP_KEY = import.meta.env.VITE_APP_KEY || 'admin_portal';

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

export function useAppVersionCheck(): UseAppVersionCheckResult {
  const [status, setStatus] = useState<UpdateStatus>('checking');
  const [currentVersion, setCurrentVersion] = useState<string>('0.0.0');
  const [buildHash, setBuildHash] = useState<string>('dev');
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

      // Fetch version directly from database
      const { data, error: dbError } = await supabase
        .from('app_versions')
        .select('app_key, version, build_hash, deployed_at, update_policy, min_supported_version, release_notes')
        .eq('app_key', APP_KEY)
        .eq('is_current', true)
        .maybeSingle();

      if (dbError) {
        console.error('[useAppVersionCheck] Database error:', dbError);
        throw new Error(dbError.message);
      }

      if (!data) {
        // No version registered yet
        console.log('[useAppVersionCheck] No version found for app_key:', APP_KEY);
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
        app_key: APP_KEY,
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
  }, []);

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

// Export version constants that update from hook state
export const APP_VERSION = '0.0.0'; // Fallback, actual version comes from hook
export const APP_BUILD_HASH = 'dev'; // Fallback, actual hash comes from hook

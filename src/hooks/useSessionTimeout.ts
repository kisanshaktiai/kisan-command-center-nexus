
import { useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to handle session timeout and prevent infinite loading states
 */
export const useSessionTimeout = (timeoutMs: number = 15000) => {
  const { isLoading, user, error } = useAuth();

  const handleSessionTimeout = useCallback(() => {
    if (isLoading && !user && !error) {
      console.warn('Session timeout: Auth has been loading for too long, forcing reload');
      // Clear any corrupted state and reload
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  }, [isLoading, user, error]);

  useEffect(() => {
    if (!isLoading) return;

    console.log('Setting session timeout for', timeoutMs, 'ms');
    const timeoutId = setTimeout(handleSessionTimeout, timeoutMs);

    return () => {
      console.log('Clearing session timeout');
      clearTimeout(timeoutId);
    };
  }, [isLoading, handleSessionTimeout, timeoutMs]);

  const forceReload = useCallback(() => {
    console.log('Forcing application reload to recover from stuck state');
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  }, []);

  return { 
    handleSessionTimeout, 
    forceReload,
    isStuckLoading: isLoading && !user && !error 
  };
};

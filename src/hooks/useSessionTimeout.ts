
import { useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to handle session timeout and prevent infinite loading states
 */
export const useSessionTimeout = () => {
  const { isLoading, user, error } = useAuth();

  const handleSessionTimeout = useCallback(() => {
    if (isLoading && !user && !error) {
      console.warn('Session timeout: Auth has been loading for too long');
      // Force reload to recover from stuck state
      window.location.reload();
    }
  }, [isLoading, user, error]);

  useEffect(() => {
    if (!isLoading) return;

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(handleSessionTimeout, 10000); // 10 seconds timeout

    return () => clearTimeout(timeoutId);
  }, [isLoading, handleSessionTimeout]);

  return { handleSessionTimeout };
};

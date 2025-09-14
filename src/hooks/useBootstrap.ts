
import { useState, useEffect } from 'react';
import { authService } from '@/auth/AuthService';

export const useBootstrap = () => {
  const [isBootstrapNeeded, setIsBootstrapNeeded] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkBootstrapStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const needsBootstrap = await authService.isBootstrapNeeded();
      setIsBootstrapNeeded(needsBootstrap);
    } catch (error) {
      console.error('Bootstrap check failed:', error);
      setError(error instanceof Error ? error.message : 'Bootstrap check failed');
      setIsBootstrapNeeded(true); // Default to showing bootstrap on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkBootstrapStatus();
  }, []);

  return {
    isBootstrapNeeded,
    isLoading,
    error,
    refetch: checkBootstrapStatus,
  };
};

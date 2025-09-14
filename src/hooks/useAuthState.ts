
import { useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { AuthState } from '@/types/auth';

const initialAuthState: AuthState = {
  user: null,
  session: null,
  isAuthenticated: false,
  isAdmin: false,
  isSuperAdmin: false,
  adminRole: null,
  profile: null,
};

export const useAuthState = () => {
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateAuthState = useCallback((updates: Partial<AuthState>) => {
    setAuthState(prevState => ({
      ...prevState,
      ...updates,
    }));
  }, []);

  const resetAuthState = useCallback(() => {
    setAuthState(initialAuthState);
  }, []);

  const setAuthError = useCallback((errorMessage: string | null) => {
    setError(errorMessage);
  }, []);

  const setAuthLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  return {
    authState,
    isLoading,
    error,
    updateAuthState,
    resetAuthState,
    setAuthError,
    setAuthLoading,
  };
};


import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface CSRFToken {
  token: string;
  expires: number;
}

export const useCSRFProtection = () => {
  const { user } = useAuth();
  const [csrfToken, setCSRFToken] = useState<CSRFToken | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Generate CSRF token
  const generateCSRFToken = useCallback(() => {
    if (!user) return null;
    
    const token = `csrf_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expires = Date.now() + (60 * 60 * 1000); // 1 hour
    
    const csrfToken = { token, expires };
    
    // Store in sessionStorage for this session
    sessionStorage.setItem('csrf_token', JSON.stringify(csrfToken));
    
    return csrfToken;
  }, [user]);

  // Validate CSRF token
  const validateCSRFToken = useCallback((token: string): boolean => {
    if (!user || !csrfToken) return false;
    
    // Check if token matches and hasn't expired
    return token === csrfToken.token && Date.now() < csrfToken.expires;
  }, [user, csrfToken]);

  // Get CSRF token for requests
  const getCSRFToken = useCallback((): string | null => {
    if (!csrfToken || Date.now() >= csrfToken.expires) {
      const newToken = generateCSRFToken();
      if (newToken) {
        setCSRFToken(newToken);
        return newToken.token;
      }
      return null;
    }
    return csrfToken.token;
  }, [csrfToken, generateCSRFToken]);

  // Initialize CSRF token
  useEffect(() => {
    if (user) {
      const stored = sessionStorage.getItem('csrf_token');
      if (stored) {
        try {
          const parsedToken = JSON.parse(stored) as CSRFToken;
          if (Date.now() < parsedToken.expires) {
            setCSRFToken(parsedToken);
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.warn('Invalid stored CSRF token');
        }
      }
      
      const newToken = generateCSRFToken();
      if (newToken) {
        setCSRFToken(newToken);
      }
    } else {
      setCSRFToken(null);
      sessionStorage.removeItem('csrf_token');
    }
    setIsLoading(false);
  }, [user, generateCSRFToken]);

  return {
    csrfToken: csrfToken?.token || null,
    getCSRFToken,
    validateCSRFToken,
    isLoading
  };
};

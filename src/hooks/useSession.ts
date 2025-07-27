
import { useState, useEffect } from 'react';
import { sessionService, SessionData } from '@/services/SessionService';
import { securityService } from '@/services/SecurityService';

export const useSession = () => {
  const [sessionData, setSessionData] = useState<SessionData>(
    sessionService.getSessionData()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [adminRole, setAdminRole] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to session changes
    const unsubscribe = sessionService.subscribe((newSessionData) => {
      setSessionData(newSessionData);
      setIsLoading(false);
    });

    // Initial load
    setSessionData(sessionService.getSessionData());
    setIsLoading(false);

    // Check admin role if authenticated
    const checkAdminRole = async () => {
      if (sessionData.isAuthenticated) {
        try {
          const role = await securityService.getCurrentAdminRole();
          setAdminRole(role);
        } catch (error) {
          console.error('Error checking admin role:', error);
          setAdminRole(null);
        }
      }
    };

    checkAdminRole();

    // Cleanup
    return unsubscribe;
  }, [sessionData.isAuthenticated]);

  return {
    ...sessionData,
    isLoading,
    adminRole,
    isTokenExpired: sessionService.isTokenExpired(),
    timeUntilExpiry: sessionService.getTimeUntilExpiry(),
    refreshSession: sessionService.refreshSession,
    signOut: sessionService.signOut,
    isAdmin: sessionService.isAdmin
  };
};

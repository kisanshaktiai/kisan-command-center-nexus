
import { useState, useEffect } from 'react';
import { sessionService, SessionData } from '@/services/SessionService';

export const useSession = () => {
  const [sessionData, setSessionData] = useState<SessionData>(
    sessionService.getSessionData()
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Subscribe to session changes
    const unsubscribe = sessionService.subscribe((newSessionData) => {
      setSessionData(newSessionData);
      setIsLoading(false);
    });

    // Initial load
    setSessionData(sessionService.getSessionData());
    setIsLoading(false);

    // Cleanup
    return unsubscribe;
  }, []);

  return {
    ...sessionData,
    isLoading,
    isTokenExpired: sessionService.isTokenExpired(),
    timeUntilExpiry: sessionService.getTimeUntilExpiry(),
    timeSinceLastActivity: sessionService.getTimeSinceLastActivity(),
    refreshSession: sessionService.refreshSession,
    signOut: sessionService.signOut,
    isAdmin: sessionService.isAdmin
  };
};

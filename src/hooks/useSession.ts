
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

  const refreshSession = async () => {
    return await sessionService.refreshSession();
  };

  const signOut = async () => {
    await sessionService.signOut();
  };

  return {
    ...sessionData,
    isLoading,
    isTokenExpired: sessionData.isTokenExpired,
    timeUntilExpiry: sessionData.timeUntilExpiry,
    timeSinceLastActivity: sessionData.timeSinceLastActivity,
    refreshSession,
    signOut,
    isAdmin: sessionData.isAdmin // Use the data from session service directly
  };
};

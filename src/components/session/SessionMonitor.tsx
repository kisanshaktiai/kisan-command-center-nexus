
import React, { useEffect, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Clock } from 'lucide-react';
import { toast } from 'sonner';

export const SessionMonitor: React.FC = () => {
  const { 
    isAuthenticated, 
    isTokenExpired, 
    timeUntilExpiry, 
    timeSinceLastActivity,
    refreshSession,
    signOut
  } = useSession();
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const inactivityTimeout = 5 * 60 * 1000; // 5 minutes
  const warningThreshold = 60 * 1000; // Show warning 1 minute before logout

  useEffect(() => {
    if (!isAuthenticated) {
      setShowExpiryWarning(false);
      setShowInactivityWarning(false);
      return;
    }

    const checkExpiry = () => {
      const minutesUntilExpiry = timeUntilExpiry / (1000 * 60);
      
      // Show warning if token expires in less than 10 minutes
      if (minutesUntilExpiry <= 10 && minutesUntilExpiry > 0) {
        setShowExpiryWarning(true);
      } else {
        setShowExpiryWarning(false);
      }
    };

    const checkInactivity = () => {
      const timeUntilLogout = inactivityTimeout - timeSinceLastActivity;
      
      // Show warning if approaching inactivity timeout (last minute)
      if (timeUntilLogout <= warningThreshold && timeUntilLogout > 0) {
        setShowInactivityWarning(true);
      } else {
        setShowInactivityWarning(false);
      }
    };

    // Check immediately
    checkExpiry();
    checkInactivity();

    // Check every 15 seconds
    const interval = setInterval(() => {
      checkExpiry();
      checkInactivity();
    }, 15000);

    return () => clearInterval(interval);
  }, [isAuthenticated, timeUntilExpiry, timeSinceLastActivity]);

  const handleRefreshToken = async () => {
    setIsRefreshing(true);
    const result = await refreshSession();
    
    if (result.success) {
      toast.success('Session refreshed successfully');
      setShowExpiryWarning(false);
      setShowInactivityWarning(false);
    } else {
      toast.error('Failed to refresh session: ' + result.error);
    }
    
    setIsRefreshing(false);
  };

  if (!isAuthenticated) {
    return null;
  }

  // Show inactivity warning with priority over expiry warning
  if (showInactivityWarning) {
    const secondsLeft = Math.floor((inactivityTimeout - timeSinceLastActivity) / 1000);
    
    return (
      <Alert className="mb-4 border-amber-500 bg-amber-50">
        <Clock className="h-4 w-4 text-amber-600" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-amber-800">
            You will be logged out due to inactivity in {secondsLeft} seconds
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefreshToken}
            disabled={isRefreshing}
            className="ml-4"
          >
            {isRefreshing ? (
              <RefreshCw className="h-3 w-3 animate-spin mr-1" />
            ) : null}
            Stay Logged In
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (showExpiryWarning) {
    const minutesLeft = Math.floor(timeUntilExpiry / (1000 * 60));
    
    return (
      <Alert className="mb-4 border-yellow-500 bg-yellow-50">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-yellow-800">
            Your session will expire in {minutesLeft} minute{minutesLeft !== 1 ? 's' : ''}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefreshToken}
            disabled={isRefreshing}
            className="ml-4"
          >
            {isRefreshing ? (
              <RefreshCw className="h-3 w-3 animate-spin mr-1" />
            ) : null}
            Refresh Session
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};


import React, { useEffect, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export const SessionMonitor: React.FC = () => {
  const { 
    isAuthenticated, 
    isTokenExpired, 
    timeUntilExpiry, 
    refreshSession 
  } = useSession();
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setShowExpiryWarning(false);
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

    // Check immediately
    checkExpiry();

    // Check every minute
    const interval = setInterval(checkExpiry, 60000);

    return () => clearInterval(interval);
  }, [isAuthenticated, timeUntilExpiry]);

  const handleRefreshToken = async () => {
    setIsRefreshing(true);
    const result = await refreshSession();
    
    if (result.success) {
      toast.success('Session refreshed successfully');
      setShowExpiryWarning(false);
    } else {
      toast.error('Failed to refresh session: ' + result.error);
    }
    
    setIsRefreshing(false);
  };

  if (!isAuthenticated || !showExpiryWarning) {
    return null;
  }

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
};

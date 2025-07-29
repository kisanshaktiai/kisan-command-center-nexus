
import React, { useEffect, useState, useContext } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authenticationService } from '@/services/AuthenticationService';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface SessionGuardProps {
  children: React.ReactNode;
  showWarningAt?: number; // Minutes before expiry to show warning
}

// Create a wrapper component that safely checks for auth context
const SessionGuardWithAuth: React.FC<SessionGuardProps> = ({ 
  children, 
  showWarningAt = 10 
}) => {

  const { user, session } = useAuth();
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);
  const [timeUntilExpiry, setTimeUntilExpiry] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!session || !user) {
      setShowExpiryWarning(false);
      return;
    }

    const checkSessionExpiry = () => {
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const now = Date.now();
      const timeLeft = expiresAt - now;
      const minutesLeft = Math.floor(timeLeft / (1000 * 60));

      setTimeUntilExpiry(timeLeft);

      if (minutesLeft <= showWarningAt && minutesLeft > 0) {
        setShowExpiryWarning(true);
      } else {
        setShowExpiryWarning(false);
      }

      // Auto-refresh if less than 5 minutes left
      if (minutesLeft <= 5 && minutesLeft > 0 && !isRefreshing) {
        handleRefreshSession();
      }
    };

    // Check immediately
    checkSessionExpiry();

    // Check every 30 seconds
    const interval = setInterval(checkSessionExpiry, 30000);

    return () => clearInterval(interval);
  }, [session, user, showWarningAt, isRefreshing]);

  const handleRefreshSession = async () => {
    setIsRefreshing(true);
    
    try {
      const { error } = await supabase.auth.refreshSession();
      
      if (error) {
        toast.error('Failed to refresh session: ' + error.message);
        // Force logout if refresh fails
        await authenticationService.signOut();
      } else {
        toast.success('Session refreshed successfully');
        setShowExpiryWarning(false);
      }
    } catch (error) {
      toast.error('Session refresh failed');
      await authenticationService.signOut();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExtendSession = async () => {
    await handleRefreshSession();
  };

  const handleLogout = async () => {
    await authenticationService.signOut();
  };

  if (!user) {
    return <>{children}</>;
  }

  const minutesLeft = Math.floor(timeUntilExpiry / (1000 * 60));

  return (
    <>
      {showExpiryWarning && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <Card className="border-yellow-500 bg-yellow-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="h-4 w-4" />
                Session Expiring Soon
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertDescription className="text-yellow-800 mb-3">
                  Your session will expire in {minutesLeft} minute{minutesLeft !== 1 ? 's' : ''}. 
                  Would you like to extend it?
                </AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleExtendSession}
                  disabled={isRefreshing}
                  className="flex-1"
                >
                  {isRefreshing ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                      Extending...
                    </>
                  ) : (
                    'Extend Session'
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleLogout}
                  disabled={isRefreshing}
                >
                  Logout
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {children}
    </>
  );
};

// Main export with error boundary
export const SessionGuard: React.FC<SessionGuardProps> = (props) => {
  try {
    return <SessionGuardWithAuth {...props} />;
  } catch (error) {
    console.error('SessionGuard error boundary caught:', error);
    // Fallback rendering without session guard
    return <>{props.children}</>;
  }
};

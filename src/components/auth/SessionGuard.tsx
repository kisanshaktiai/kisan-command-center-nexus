
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/auth/AuthService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

interface SessionGuardProps {
  children: React.ReactNode;
  showWarningAt?: number; // minutes before expiry to show warning
}

export const SessionGuard: React.FC<SessionGuardProps> = ({ 
  children, 
  showWarningAt = 5 
}) => {
  const { session, signOut } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!session?.expires_at) return;

    const checkSession = () => {
      const expiresAt = new Date(session.expires_at * 1000);
      const now = new Date();
      const minutesLeft = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60));
      
      setTimeLeft(minutesLeft);
      
      if (minutesLeft <= showWarningAt && minutesLeft > 0) {
        setShowWarning(true);
      } else if (minutesLeft <= 0) {
        signOut();
      } else {
        setShowWarning(false);
      }
    };

    const interval = setInterval(checkSession, 60000); // Check every minute
    checkSession(); // Initial check

    return () => clearInterval(interval);
  }, [session, showWarningAt, signOut]);

  const handleExtendSession = async () => {
    try {
      await authService.refreshSession();
      setShowWarning(false);
    } catch (error) {
      console.error('Failed to extend session:', error);
    }
  };

  return (
    <>
      {showWarning && (
        <Alert className="mb-4">
          <Clock className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Your session will expire in {timeLeft} minutes.</span>
            <Button size="sm" onClick={handleExtendSession}>
              Extend Session
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {children}
    </>
  );
};

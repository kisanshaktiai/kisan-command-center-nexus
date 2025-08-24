
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/auth/AuthService';
import { Loader2 } from 'lucide-react';

interface SessionGuardProps {
  children: React.ReactNode;
}

export const SessionGuard: React.FC<SessionGuardProps> = ({ children }) => {
  const { user, signOut } = useAuth();
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!user) return;

    const checkSession = async () => {
      setIsChecking(true);
      try {
        const session = await authService.getCurrentSession();
        if (!session) {
          // Session expired, sign out
          await signOut();
        }
      } catch (error) {
        console.error('Session check failed:', error);
        await signOut();
      } finally {
        setIsChecking(false);
      }
    };

    // Check session every 5 minutes
    const interval = setInterval(checkSession, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user, signOut]);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
};

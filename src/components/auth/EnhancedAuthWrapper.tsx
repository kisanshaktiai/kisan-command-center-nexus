
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring';
import { useAuth } from '@/contexts/AuthContext';
import { EnhancedSecurityUtils } from '@/utils/enhancedSecurity';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';

interface SecurityContextType {
  csrfToken: string;
  refreshCSRFToken: () => string;
  isSecurityMonitored: boolean;
  accountLockoutStatus: {
    isLocked: boolean;
    attemptsRemaining: number;
    lockedUntil: string | null;
  } | null;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const useSecurityContext = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurityContext must be used within EnhancedAuthWrapper');
  }
  return context;
};

interface EnhancedAuthWrapperProps {
  children: React.ReactNode;
}

export const EnhancedAuthWrapper: React.FC<EnhancedAuthWrapperProps> = ({ children }) => {
  const { user } = useAuth();
  const [csrfToken, setCSRFToken] = useState<string>('');
  const [accountLockoutStatus, setAccountLockoutStatus] = useState<{
    isLocked: boolean;
    attemptsRemaining: number;
    lockedUntil: string | null;
  } | null>(null);
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);

  const { monitoringState, trackPageView } = useSecurityMonitoring(user?.id);

  // Generate initial CSRF token
  useEffect(() => {
    refreshCSRFToken();
  }, []);

  // Monitor suspicious activity
  useEffect(() => {
    if (monitoringState.suspiciousActivity) {
      if (monitoringState.riskLevel === 'critical') {
        setSecurityAlert('Critical security activity detected. Session may be terminated.');
      } else if (monitoringState.riskLevel === 'high') {
        setSecurityAlert('High-risk activity detected. Please verify your actions.');
      }
    } else {
      setSecurityAlert(null);
    }
  }, [monitoringState]);

  // Track page views for security monitoring
  useEffect(() => {
    const path = window.location.pathname;
    trackPageView(path);
  }, [trackPageView]);

  const refreshCSRFToken = (): string => {
    const newToken = EnhancedSecurityUtils.generateCSRFToken();
    setCSRFToken(newToken);
    
    // Store in session storage for client-side access
    try {
      sessionStorage.setItem('csrf_token', newToken);
    } catch (error) {
      console.warn('Could not store CSRF token in session storage:', error);
    }
    
    return newToken;
  };

  const checkAccountLockout = async (email: string) => {
    try {
      const status = await EnhancedSecurityUtils.checkAccountLockout(
        email,
        EnhancedSecurityUtils.getClientIP(
          Object.fromEntries(
            Array.from(document.querySelectorAll('meta')).map(meta => [
              meta.name || meta.httpEquiv,
              meta.content
            ])
          )
        ) || undefined
      );
      setAccountLockoutStatus(status);
      return status;
    } catch (error) {
      console.error('Failed to check account lockout:', error);
      return null;
    }
  };

  const contextValue: SecurityContextType = {
    csrfToken,
    refreshCSRFToken,
    isSecurityMonitored: true,
    accountLockoutStatus
  };

  return (
    <SecurityContext.Provider value={contextValue}>
      <div className="min-h-screen">
        {securityAlert && (
          <Alert variant="destructive" className="m-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{securityAlert}</AlertDescription>
          </Alert>
        )}
        
        {accountLockoutStatus?.isLocked && (
          <Alert variant="destructive" className="m-4">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Account is temporarily locked due to multiple failed login attempts. 
              {accountLockoutStatus.lockedUntil && 
                ` Please try again after ${new Date(accountLockoutStatus.lockedUntil).toLocaleTimeString()}.`
              }
            </AlertDescription>
          </Alert>
        )}

        {monitoringState.riskLevel === 'high' && (
          <Alert variant="default" className="m-4">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Security monitoring is active. Requests: {monitoringState.requestCount}/minute
            </AlertDescription>
          </Alert>
        )}

        {children}
      </div>
    </SecurityContext.Provider>
  );
};


import { useState, useEffect, useRef } from 'react';
import { EnhancedSecurityUtils } from '@/utils/enhancedSecurity';

interface SecurityEvent {
  eventType: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

interface SecurityMonitoringState {
  requestCount: number;
  suspiciousActivity: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastEventTime: number;
}

export const useSecurityMonitoring = (userId?: string) => {
  const [monitoringState, setMonitoringState] = useState<SecurityMonitoringState>({
    requestCount: 0,
    suspiciousActivity: false,
    riskLevel: 'low',
    lastEventTime: Date.now()
  });

  const requestTimestamps = useRef<number[]>([]);
  const userAgent = useRef(navigator.userAgent);

  const logSecurityEvent = async (event: SecurityEvent) => {
    // Add current timestamp for rate limiting
    const now = Date.now();
    requestTimestamps.current.push(now);
    
    // Clean old timestamps (older than 1 minute)
    requestTimestamps.current = requestTimestamps.current.filter(
      timestamp => now - timestamp < 60000
    );

    // Detect suspicious activity
    const suspiciousCheck = EnhancedSecurityUtils.detectSuspiciousActivity({
      userAgent: event.userAgent || userAgent.current,
      requestCount: requestTimestamps.current.length,
      timeWindow: 60000 // 1 minute
    });

    setMonitoringState(prev => ({
      ...prev,
      requestCount: requestTimestamps.current.length,
      suspiciousActivity: suspiciousCheck.isSuspicious,
      riskLevel: suspiciousCheck.riskLevel,
      lastEventTime: now
    }));

    // Log the event
    await EnhancedSecurityUtils.logSecurityEvent({
      ...event,
      userId: userId || event.userId,
      userAgent: event.userAgent || userAgent.current,
      riskLevel: event.riskLevel || suspiciousCheck.riskLevel,
      details: {
        ...event.details,
        requestCount: requestTimestamps.current.length,
        suspiciousReasons: suspiciousCheck.reasons
      }
    });

    // If highly suspicious, trigger additional security measures
    if (suspiciousCheck.riskLevel === 'critical') {
      console.warn('Critical security event detected:', event);
      // Could trigger session invalidation, rate limiting, etc.
    }
  };

  const trackPageView = (pagePath: string) => {
    logSecurityEvent({
      eventType: 'page_view',
      details: { pagePath }
    });
  };

  const trackLoginAttempt = (email: string, success: boolean, ipAddress?: string) => {
    logSecurityEvent({
      eventType: success ? 'login_success' : 'login_failure',
      ipAddress,
      details: { email },
      riskLevel: success ? 'low' : 'medium'
    });
  };

  const trackSensitiveAction = (action: string, targetResource?: string) => {
    logSecurityEvent({
      eventType: 'sensitive_action',
      details: { action, targetResource },
      riskLevel: 'medium'
    });
  };

  // Clean up old timestamps periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      requestTimestamps.current = requestTimestamps.current.filter(
        timestamp => now - timestamp < 60000
      );
      
      if (requestTimestamps.current.length === 0) {
        setMonitoringState(prev => ({
          ...prev,
          requestCount: 0,
          suspiciousActivity: false,
          riskLevel: 'low'
        }));
      }
    }, 30000); // Clean every 30 seconds

    return () => clearInterval(cleanup);
  }, []);

  return {
    monitoringState,
    logSecurityEvent,
    trackPageView,
    trackLoginAttempt,
    trackSensitiveAction
  };
};

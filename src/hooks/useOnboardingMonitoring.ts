
import { useCallback, useRef, useEffect } from 'react';

interface OnboardingMetrics {
  apiCalls: number;
  errors: number;
  lastError: string | null;
  startTime: number;
  isHealthy: boolean;
  retryCount: number;
}

interface UseOnboardingMonitoringProps {
  tenantId: string;
  workflowId?: string;
  isLoading: boolean;
  error: string | null;
}

export const useOnboardingMonitoring = ({
  tenantId,
  workflowId,
  isLoading,
  error
}: UseOnboardingMonitoringProps) => {
  const metricsRef = useRef<OnboardingMetrics>({
    apiCalls: 0,
    errors: 0,
    lastError: null,
    startTime: Date.now(),
    isHealthy: true,
    retryCount: 0
  });

  const trackApiCall = useCallback((operation: string) => {
    metricsRef.current.apiCalls++;
    console.log(`🔄 API Call [${operation}] - Total: ${metricsRef.current.apiCalls}`);
  }, []);

  const trackError = useCallback((errorMessage: string) => {
    metricsRef.current.errors++;
    metricsRef.current.lastError = errorMessage;
    metricsRef.current.isHealthy = false;
    console.error(`❌ Error tracked: ${errorMessage}`);
  }, []);

  const trackRetry = useCallback(() => {
    metricsRef.current.retryCount++;
    console.log(`🔄 Retry attempt: ${metricsRef.current.retryCount}`);
  }, []);

  const getPerformanceSummary = useCallback(() => {
    const duration = Date.now() - metricsRef.current.startTime;
    return {
      ...metricsRef.current,
      duration,
      avgApiCallsPerMinute: metricsRef.current.apiCalls / (duration / 60000),
      isHealthy: metricsRef.current.errors < 3 && metricsRef.current.apiCalls < 20
    };
  }, []);

  // Track errors from props
  useEffect(() => {
    if (error) {
      trackError(error);
    }
  }, [error, trackError]);

  return {
    trackApiCall,
    trackError,
    trackRetry,
    getPerformanceSummary
  };
};

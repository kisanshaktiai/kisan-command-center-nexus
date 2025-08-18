
import { useEffect, useRef } from 'react';

interface MonitoringOptions {
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
}: MonitoringOptions) => {
  const renderCountRef = useRef(0);
  const loadingStateChangesRef = useRef(0);
  const errorStateChangesRef = useRef(0);
  const lastStateRef = useRef({ isLoading: false, error: null });
  const apiCallsRef = useRef(new Set<string>());
  const startTimeRef = useRef(Date.now());

  // Track renders
  useEffect(() => {
    renderCountRef.current += 1;
    
    if (renderCountRef.current > 10) {
      console.warn('🚨 EXCESSIVE RENDERS DETECTED:', {
        renderCount: renderCountRef.current,
        tenantId,
        workflowId,
        timeSinceStart: Date.now() - startTimeRef.current
      });
    }
  });

  // Track loading state changes
  useEffect(() => {
    if (lastStateRef.current.isLoading !== isLoading) {
      loadingStateChangesRef.current += 1;
      lastStateRef.current.isLoading = isLoading;
      
      console.log('🔄 LOADING STATE CHANGE:', {
        isLoading,
        changeCount: loadingStateChangesRef.current,
        renderCount: renderCountRef.current
      });

      if (loadingStateChangesRef.current > 5) {
        console.warn('🚨 EXCESSIVE LOADING STATE CHANGES:', {
          changeCount: loadingStateChangesRef.current,
          possibleInfiniteLoop: true
        });
      }
    }
  }, [isLoading]);

  // Track error state changes
  useEffect(() => {
    if (lastStateRef.current.error !== error) {
      errorStateChangesRef.current += 1;
      lastStateRef.current.error = error;
      
      if (error) {
        console.error('❌ ERROR STATE CHANGE:', {
          error,
          changeCount: errorStateChangesRef.current,
          renderCount: renderCountRef.current
        });
      }
    }
  }, [error]);

  // Track API calls to detect duplicates
  const trackApiCall = (callId: string) => {
    if (apiCallsRef.current.has(callId)) {
      console.warn('🚨 DUPLICATE API CALL DETECTED:', {
        callId,
        totalCalls: apiCallsRef.current.size,
        renderCount: renderCountRef.current
      });
    } else {
      apiCallsRef.current.add(callId);
      console.log('📡 API CALL TRACKED:', callId);
    }
  };

  // Performance summary
  const getPerformanceSummary = () => {
    return {
      totalRenders: renderCountRef.current,
      loadingStateChanges: loadingStateChangesRef.current,
      errorStateChanges: errorStateChangesRef.current,
      uniqueApiCalls: apiCallsRef.current.size,
      timeSinceStart: Date.now() - startTimeRef.current,
      isHealthy: renderCountRef.current < 10 && loadingStateChangesRef.current < 5
    };
  };

  return {
    trackApiCall,
    getPerformanceSummary
  };
};

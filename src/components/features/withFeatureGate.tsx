
import React from 'react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

export function withFeatureGate<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  featureName: string,
  FallbackComponent?: React.ComponentType
) {
  return function FeatureGatedComponent(props: P & { tenantId: string }) {
    const { tenantId, ...restProps } = props;
    const { hasAccess, isLoading } = useFeatureAccess(tenantId, featureName);

    if (isLoading) {
      return <div className="animate-pulse">Loading...</div>;
    }

    if (!hasAccess) {
      if (FallbackComponent) {
        return <FallbackComponent />;
      }
      return (
        <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
          <p className="text-sm text-yellow-800">
            This feature is not available in your current subscription plan. 
            Please upgrade to access this functionality.
          </p>
        </div>
      );
    }

    return <WrappedComponent {...(restProps as P)} />;
  };
}

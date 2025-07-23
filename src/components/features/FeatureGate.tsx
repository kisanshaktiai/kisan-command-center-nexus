
import React from 'react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

interface FeatureGateProps {
  children: React.ReactNode;
  tenantId: string;
  featureName: string;
  fallback?: React.ReactNode;
}

export function FeatureGate({ 
  children, 
  tenantId, 
  featureName, 
  fallback 
}: FeatureGateProps) {
  const { hasAccess, isLoading } = useFeatureAccess(tenantId, featureName);

  if (isLoading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  if (!hasAccess) {
    return fallback || (
      <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
        <p className="text-sm text-yellow-800">
          This feature is not available in your current subscription plan.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

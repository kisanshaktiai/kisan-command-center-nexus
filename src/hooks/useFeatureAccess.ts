
import { useState, useEffect } from 'react';
import { FeatureService } from '@/services/FeatureService';

export const useFeatureAccess = (tenantId: string, featureName: string) => {
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (tenantId && featureName) {
      FeatureService.checkFeatureAccess(tenantId, featureName)
        .then(setHasAccess)
        .finally(() => setIsLoading(false));
    }
  }, [tenantId, featureName]);

  return { hasAccess, isLoading };
};


import React, { Suspense, ComponentType } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyLoadWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  height?: string;
}

export const LazyLoadWrapper: React.FC<LazyLoadWrapperProps> = ({ 
  children, 
  fallback,
  height = "200px"
}) => {
  const defaultFallback = (
    <div className="space-y-4" style={{ height }}>
      <Skeleton className="w-full h-8" />
      <Skeleton className="w-3/4 h-6" />
      <Skeleton className="w-1/2 h-6" />
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
};

// HOC for lazy loading components
export const withLazyLoad = <P extends object>(
  Component: ComponentType<P>,
  fallback?: React.ReactNode
) => {
  const LazyComponent = (props: P) => (
    <LazyLoadWrapper fallback={fallback}>
      <Component {...props} />
    </LazyLoadWrapper>
  );
  
  LazyComponent.displayName = `withLazyLoad(${Component.displayName || Component.name})`;
  
  return LazyComponent;
};

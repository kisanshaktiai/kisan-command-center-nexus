
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface MetricsSkeletonProps {
  className?: string;
}

export const MetricsSkeleton: React.FC<MetricsSkeletonProps> = ({ className = '' }) => {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
};

interface RegistrationsSkeletonProps {
  rows?: number;
  className?: string;
}

export const RegistrationsSkeleton: React.FC<RegistrationsSkeletonProps> = ({ 
  rows = 5, 
  className = '' 
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="space-y-2">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-3 border rounded">
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
};

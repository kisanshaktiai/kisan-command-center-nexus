
import React from 'react';

export const TenantLoadingState: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
    </div>
  );
};

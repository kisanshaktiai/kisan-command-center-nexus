
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface TenantErrorStateProps {
  error: any;
}

export const TenantErrorState: React.FC<TenantErrorStateProps> = ({ error }) => {
  if (!error) return null;

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Failed to load tenants. Please try refreshing the page.
      </AlertDescription>
    </Alert>
  );
};

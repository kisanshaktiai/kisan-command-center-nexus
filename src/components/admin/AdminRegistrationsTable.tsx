
import React from 'react';
import { useAdminRegistrations } from '@/hooks/useAdminRegistrations';
import { ErrorBanner } from '@/components/ui/error-banner';
import { RegistrationsSkeleton } from '@/components/ui/loading-skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export const AdminRegistrationsTable: React.FC = () => {
  const { data: registrations, isLoading, error, refetch, isError } = useAdminRegistrations();

  const handleRetry = () => {
    refetch();
    toast.info('Retrying to fetch admin registrations...');
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin Registrations</CardTitle>
        </CardHeader>
        <CardContent>
          <RegistrationsSkeleton rows={3} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Registrations</CardTitle>
      </CardHeader>
      <CardContent>
        {isError && (
          <ErrorBanner
            title={error?.message?.includes('permission') ? 'Access Denied' : 'Error Loading Registrations'}
            message={
              error?.message?.includes('permission') 
                ? "You don't have permission to view admin registrations."
                : "Failed to load admin registrations. Please try again."
            }
            onRetry={error?.message?.includes('permission') ? undefined : handleRetry}
            className="mb-4"
          />
        )}

        {!isError && (!registrations || registrations.length === 0) && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No pending registrations found.</p>
          </div>
        )}

        {!isError && registrations && registrations.length > 0 && (
          <div className="space-y-2">
            {registrations.map((registration, index) => (
              <div
                key={registration.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-muted-foreground">
                    #{index + 1}
                  </span>
                  <div>
                    <p className="font-medium">{registration.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(registration.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge className={getStatusColor(registration.status)}>
                  {registration.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

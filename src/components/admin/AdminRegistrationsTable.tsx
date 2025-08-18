
import React from 'react';
import { useAdminRegistrations } from '@/hooks/useAdminRegistrations';
import { ErrorBanner } from '@/components/ui/error-banner';
import { RegistrationsSkeleton } from '@/components/ui/loading-skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

export const AdminRegistrationsTable: React.FC = () => {
  const { data: registrations, isLoading, error, refetch } = useAdminRegistrations();

  if (isLoading) {
    return <RegistrationsSkeleton />;
  }

  if (error) {
    return (
      <ErrorBanner
        title="Failed to load admin registrations"
        message={error.message}
        onRetry={() => refetch()}
      />
    );
  }

  if (!registrations || registrations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin Registrations</CardTitle>
          <CardDescription>Manage pending admin registrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No pending registrations found.
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default' as const;
      case 'pending':
        return 'secondary' as const;
      case 'expired':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Registrations</CardTitle>
        <CardDescription>
          Manage pending admin registrations ({registrations.length} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium">Email</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
                <th className="text-left py-3 px-4 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((registration) => (
                <tr key={registration.id} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-4">{registration.email}</td>
                  <td className="py-3 px-4">
                    <Badge variant={getStatusBadgeVariant(registration.status)}>
                      {registration.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {formatDistanceToNow(new Date(registration.created_at), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

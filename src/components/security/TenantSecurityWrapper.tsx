
import React from 'react';
import { useTenantSecurity } from '@/hooks/useTenantSecurity';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';

interface TenantSecurityWrapperProps {
  children: React.ReactNode;
  tenantId?: string;
  requiredRole?: string;
  fallback?: React.ReactNode;
}

export const TenantSecurityWrapper: React.FC<TenantSecurityWrapperProps> = ({
  children,
  tenantId,
  requiredRole,
  fallback
}) => {
  const { isValidated, isLoading, error, hasAccess } = useTenantSecurity(tenantId, requiredRole);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Validating access permissions...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidated || !hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Access Denied</h3>
                <p className="text-muted-foreground mt-2">
                  {error || 'You do not have permission to access this resource.'}
                </p>
              </div>
              <Alert variant="destructive">
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  This area requires {requiredRole ? `${requiredRole} ` : ''}permissions
                  {tenantId ? ` for the specified tenant` : ''}.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

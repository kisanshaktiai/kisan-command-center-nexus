
import React, { useEffect, useState } from 'react';
import { useTenantAccessValidation } from '@/hooks/useTenantAccessValidation';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, CheckCircle, AlertTriangle } from 'lucide-react';

interface TenantAccessValidatorProps {
  tenantId: string;
  children: React.ReactNode;
  showValidationStatus?: boolean;
}

export const TenantAccessValidator: React.FC<TenantAccessValidatorProps> = ({
  tenantId,
  children,
  showValidationStatus = false
}) => {
  const { validateTenantAccess, isValidating } = useTenantAccessValidation();
  const [accessResult, setAccessResult] = useState<any>(null);
  const [hasValidated, setHasValidated] = useState(false);

  useEffect(() => {
    if (tenantId && !hasValidated) {
      validateTenantAccess(tenantId).then((result) => {
        setAccessResult(result);
        setHasValidated(true);
      });
    }
  }, [tenantId, validateTenantAccess, hasValidated]);

  if (isValidating) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Validating tenant access...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accessResult && !accessResult.hasAccess) {
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
                  You do not have permission to access this tenant.
                </p>
              </div>
              <Alert variant="destructive">
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  {accessResult.message || 'Tenant access validation failed'}
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showValidationStatus && accessResult?.hasAccess && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {accessResult.isAutoCreated 
              ? 'Tenant access granted - relationship created automatically'
              : 'Tenant access validated successfully'
            }
          </AlertDescription>
        </Alert>
      )}
      {children}
    </div>
  );
};

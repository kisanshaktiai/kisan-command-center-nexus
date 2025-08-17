
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Users,
  Shield,
  Loader2
} from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { useUserTenantValidation, UserTenantValidationResult } from '@/hooks/useUserTenantValidation';
import { toast } from 'sonner';

interface BulkTenantValidationProps {
  tenants: Tenant[];
  onValidationComplete?: (results: UserTenantValidationResult) => void;
}

export const BulkTenantValidation: React.FC<BulkTenantValidationProps> = ({
  tenants,
  onValidationComplete
}) => {
  const { validateMultipleTenants, createUserTenantRelationship, isValidating } = useUserTenantValidation();
  const [validationResults, setValidationResults] = useState<UserTenantValidationResult>({});
  const [isAutoFixing, setIsAutoFixing] = useState(false);

  useEffect(() => {
    if (tenants.length > 0) {
      handleValidateAll();
    }
  }, [tenants]);

  const handleValidateAll = async () => {
    const tenantIds = tenants.map(t => t.id);
    const results = await validateMultipleTenants(tenantIds);
    setValidationResults(results);
    onValidationComplete?.(results);
  };

  const getValidationSummary = () => {
    const total = Object.keys(validationResults).length;
    const valid = Object.values(validationResults).filter(r => r.isValid).length;
    const fixable = Object.values(validationResults).filter(r => r.canAutoFix && !r.isValid).length;
    const invalid = total - valid - fixable;

    return { total, valid, fixable, invalid };
  };

  const handleAutoFixAll = async () => {
    setIsAutoFixing(true);
    try {
      const fixableEntries = Object.entries(validationResults).filter(
        ([_, status]) => status.canAutoFix && !status.isValid
      );

      let successCount = 0;
      for (const [tenantId, _] of fixableEntries) {
        const success = await createUserTenantRelationship(tenantId, 'tenant_admin');
        if (success) {
          successCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Fixed ${successCount} tenant relationships`);
        // Re-validate after fixing
        await handleValidateAll();
      }
    } catch (error) {
      console.error('Error auto-fixing relationships:', error);
      toast.error('Failed to auto-fix some relationships');
    } finally {
      setIsAutoFixing(false);
    }
  };

  const summary = getValidationSummary();
  const progressPercentage = summary.total > 0 ? (summary.valid / summary.total) * 100 : 0;

  if (tenants.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Tenant Access Validation
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleValidateAll}
              disabled={isValidating}
            >
              {isValidating ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Refresh
            </Button>
            {summary.fixable > 0 && (
              <Button
                size="sm"
                onClick={handleAutoFixAll}
                disabled={isAutoFixing || isValidating}
              >
                {isAutoFixing ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4 mr-1" />
                )}
                Auto-Fix ({summary.fixable})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Overview */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Validation Progress</span>
            <span>{summary.valid}/{summary.total} Valid</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{summary.valid}</div>
            <div className="text-xs text-green-700">Valid Access</div>
          </div>
          <div className="text-center p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{summary.fixable}</div>
            <div className="text-xs text-orange-700">Auto-Fixable</div>
          </div>
          <div className="text-center p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{summary.invalid}</div>
            <div className="text-xs text-red-700">Access Denied</div>
          </div>
          <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{summary.total}</div>
            <div className="text-xs text-blue-700">Total Tenants</div>
          </div>
        </div>

        {/* Status Messages */}
        {summary.valid === summary.total && summary.total > 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              All tenant relationships are properly configured. You have full access to manage all tenants.
            </AlertDescription>
          </Alert>
        )}

        {summary.fixable > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {summary.fixable} tenant{summary.fixable > 1 ? 's' : ''} missing user-tenant relationships. 
              As a super admin, you can automatically create these relationships.
            </AlertDescription>
          </Alert>
        )}

        {summary.invalid > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {summary.invalid} tenant{summary.invalid > 1 ? 's have' : ' has'} access issues that cannot be automatically resolved. 
              Please contact your system administrator.
            </AlertDescription>
          </Alert>
        )}

        {isValidating && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Validating tenant access permissions across {tenants.length} tenants...
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

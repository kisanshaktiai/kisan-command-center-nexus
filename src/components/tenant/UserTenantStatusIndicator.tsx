
import React from 'react';
import { AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUserTenantSync } from '@/hooks/useUserTenantSync';

interface UserTenantStatusIndicatorProps {
  tenantId: string;
  userEmail: string;
  onSync?: () => void;
  showDetails?: boolean;
}

export const UserTenantStatusIndicator: React.FC<UserTenantStatusIndicatorProps> = ({
  tenantId,
  userEmail,
  onSync,
  showDetails = true,
}) => {
  const { status, isChecking, isCreating, error, manualSync, hasValidRelationship } = useUserTenantSync(tenantId);

  const handleManualSync = async () => {
    await manualSync(userEmail, tenantId);
    onSync?.();
  };

  const getStatusIcon = () => {
    if (isChecking || isCreating) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    
    if (error) {
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
    
    if (hasValidRelationship) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    
    return <Clock className="h-4 w-4 text-orange-500" />;
  };

  const getStatusText = () => {
    if (isChecking) return 'Checking user-tenant relationship...';
    if (isCreating) return 'Creating user-tenant relationship...';
    if (error) return `Error: ${error}`;
    if (hasValidRelationship) return 'User-tenant relationship verified';
    if (status?.authExists && !status.tenantRelationshipExists) return 'User exists but relationship missing';
    if (!status?.authExists) return 'User not found in authentication system';
    return 'Checking relationship status...';
  };

  const getStatusVariant = () => {
    if (error) return 'destructive';
    if (hasValidRelationship) return 'default';
    return 'secondary';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <Badge variant={getStatusVariant()}>
          {getStatusText()}
        </Badge>
        {!isChecking && !isCreating && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSync}
            disabled={isChecking || isCreating}
          >
            Sync
          </Button>
        )}
      </div>

      {showDetails && status && (
        <Alert>
          <AlertDescription>
            <div className="space-y-1 text-sm">
              <div>Auth Status: {status.authExists ? '✅ User found' : '❌ User not found'}</div>
              <div>Relationship: {status.tenantRelationshipExists ? '✅ Exists' : '❌ Missing'}</div>
              <div>Role: {status.roleMatches ? `✅ ${status.currentRole}` : `❌ Expected: ${status.expectedRole}`}</div>
              {status.issues.length > 0 && (
                <div className="text-amber-600">
                  Issues: {status.issues.join(', ')}
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

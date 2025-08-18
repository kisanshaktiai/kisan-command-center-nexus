
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Loader2, 
  UserCheck,
  UserX,
  Shield,
  Plus,
  Database,
  Link
} from 'lucide-react';
import { UserTenantValidationStatus } from '@/hooks/useUserTenantValidation';

interface UserTenantStatusIndicatorProps {
  status: UserTenantValidationStatus | null;
  isValidating?: boolean;
  isCreatingRelationship?: boolean;
  onCreateRelationship?: () => void;
  showDetails?: boolean;
  compact?: boolean;
}

export const UserTenantStatusIndicator: React.FC<UserTenantStatusIndicatorProps> = ({
  status,
  isValidating = false,
  isCreatingRelationship = false,
  onCreateRelationship,
  showDetails = false,
  compact = false
}) => {
  if (isValidating) {
    return (
      <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">Verifying system connections...</span>
      </div>
    );
  }

  if (!status) {
    return (
      <Badge variant="secondary" className={compact ? 'text-xs' : undefined}>
        <XCircle className="w-3 h-3 mr-1" />
        Status Unknown
      </Badge>
    );
  }

  const getStatusBadge = () => {
    if (status.isValid) {
      return (
        <Badge variant="default" className={`bg-green-100 text-green-800 border-green-200 ${compact ? 'text-xs' : ''}`}>
          <CheckCircle className="w-3 h-3 mr-1" />
          Complete Setup
        </Badge>
      );
    }

    if (status.canAutoFix) {
      return (
        <Badge variant="secondary" className={`bg-orange-100 text-orange-800 border-orange-200 ${compact ? 'text-xs' : ''}`}>
          <AlertTriangle className="w-3 h-3 mr-1" />
          Auto-Fixable
        </Badge>
      );
    }

    return (
      <Badge variant="destructive" className={compact ? 'text-xs' : undefined}>
        <XCircle className="w-3 h-3 mr-1" />
        Setup Incomplete
      </Badge>
    );
  };

  const getRoleDisplay = () => {
    if (!status.userRole) return null;
    
    return (
      <Badge variant="outline" className={compact ? 'text-xs' : undefined}>
        <Shield className="w-3 h-3 mr-1" />
        {status.userRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {getStatusBadge()}
        {getRoleDisplay()}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {getStatusBadge()}
        {getRoleDisplay()}
        
        {/* System Connection Status */}
        <div className="flex items-center gap-1">
          <Badge variant={status.userExistsInAuth ? "default" : "destructive"} className="text-xs">
            {status.userExistsInAuth ? (
              <Shield className="w-3 h-3 mr-1" />
            ) : (
              <UserX className="w-3 h-3 mr-1" />
            )}
            {status.userExistsInAuth ? 'Auth ✓' : 'No Auth'}
          </Badge>

          <Badge variant={status.userTenantRelationshipExists ? "default" : "secondary"} className="text-xs">
            {status.userTenantRelationshipExists ? (
              <Link className="w-3 h-3 mr-1" />
            ) : (
              <Database className="w-3 h-3 mr-1" />
            )}
            {status.userTenantRelationshipExists ? 'Linked ✓' : 'Not Linked'}
          </Badge>
        </div>
      </div>

      {/* Issues and Actions */}
      {status.issues.length > 0 && showDetails && (
        <Alert variant={status.canAutoFix ? "default" : "destructive"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium text-sm">System Connection Issues:</p>
              <div className="space-y-1">
                {status.issues.map((issue, index) => (
                  <div key={index} className="text-sm">• {issue}</div>
                ))}
              </div>
              
              {status.canAutoFix && (
                <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                  <p className="text-xs text-blue-800">
                    ✨ Good news! These issues can be automatically resolved by creating the missing system connections.
                  </p>
                </div>
              )}
            </div>
            
            {status.canAutoFix && onCreateRelationship && (
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={onCreateRelationship}
                disabled={isCreatingRelationship}
              >
                {isCreatingRelationship ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Connecting Systems...
                  </>
                ) : (
                  <>
                    <Plus className="w-3 h-3 mr-1" />
                    Auto-Fix Connection
                  </>
                )}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Success message when everything is working */}
      {status.isValid && showDetails && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <div className="space-y-1">
              <p className="font-medium text-sm">✅ Complete Setup Verified</p>
              <p className="text-xs">
                User has all required system connections: Authentication, Tenant Access, and Permissions.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

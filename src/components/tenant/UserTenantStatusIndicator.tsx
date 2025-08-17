
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
  Plus
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
        <span className="text-muted-foreground">Validating access...</span>
      </div>
    );
  }

  if (!status) {
    return (
      <Badge variant="secondary" className={compact ? 'text-xs' : undefined}>
        <XCircle className="w-3 h-3 mr-1" />
        Unknown
      </Badge>
    );
  }

  const getStatusBadge = () => {
    if (status.isValid) {
      return (
        <Badge variant="default" className={`bg-green-100 text-green-800 border-green-200 ${compact ? 'text-xs' : ''}`}>
          <CheckCircle className="w-3 h-3 mr-1" />
          Valid Access
        </Badge>
      );
    }

    if (status.canAutoFix) {
      return (
        <Badge variant="secondary" className={`bg-orange-100 text-orange-800 border-orange-200 ${compact ? 'text-xs' : ''}`}>
          <AlertTriangle className="w-3 h-3 mr-1" />
          Fixable
        </Badge>
      );
    }

    return (
      <Badge variant="destructive" className={compact ? 'text-xs' : undefined}>
        <XCircle className="w-3 h-3 mr-1" />
        Access Denied
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
        
        {/* Auth Status */}
        <Badge variant={status.userExistsInAuth ? "default" : "destructive"} className="text-xs">
          {status.userExistsInAuth ? (
            <UserCheck className="w-3 h-3 mr-1" />
          ) : (
            <UserX className="w-3 h-3 mr-1" />
          )}
          {status.userExistsInAuth ? 'Auth ✓' : 'No Auth'}
        </Badge>

        {/* Relationship Status */}
        <Badge variant={status.userTenantRelationshipExists ? "default" : "secondary"} className="text-xs">
          {status.userTenantRelationshipExists ? 'Relationship ✓' : 'No Relationship'}
        </Badge>
      </div>

      {/* Issues and Actions */}
      {status.issues.length > 0 && showDetails && (
        <Alert variant={status.canAutoFix ? "default" : "destructive"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {status.issues.map((issue, index) => (
                <div key={index} className="text-sm">{issue}</div>
              ))}
            </div>
            
            {status.canAutoFix && onCreateRelationship && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={onCreateRelationship}
                disabled={isCreatingRelationship}
              >
                {isCreatingRelationship ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-3 h-3 mr-1" />
                    Create Relationship
                  </>
                )}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

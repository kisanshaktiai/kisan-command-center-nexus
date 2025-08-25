
import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Shield,
  Database,
  UserPlus,
  KeyRound
} from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { useTenantUserManagement } from '@/hooks/tenant/useTenantUserManagement';
import { ErrorBoundary } from '@/components/providers/ErrorBoundary';

interface UserManagementSectionProps {
  tenant: Tenant;
}

const UserManagementContent: React.FC<UserManagementSectionProps> = ({ tenant }) => {
  const {
    userStatus,
    userInfo,
    tenantStatus,
    isLoading,
    checkUser,
    createAdminUser,
    ensureUserTenantRecord,
    sendPasswordReset,
    resetCheck,
    toast
  } = useTenantUserManagement();

  // Use ref to track if initial check has been done
  const hasInitiallyChecked = useRef(false);
  const currentTenantRef = useRef<string>('');

  useEffect(() => {
    if (tenant?.owner_email && tenant?.id) {
      const tenantKey = `${tenant.owner_email}-${tenant.id}`;
      
      // Only check if we haven't checked this tenant yet or if tenant changed
      if (!hasInitiallyChecked.current || currentTenantRef.current !== tenantKey) {
        hasInitiallyChecked.current = true;
        currentTenantRef.current = tenantKey;
        checkUser(tenant.owner_email, tenant.id);
      }
    }
  }, [tenant?.owner_email, tenant?.id]); // Removed checkUser from dependencies to prevent loops

  const handleManualRefresh = () => {
    if (tenant?.owner_email && tenant?.id) {
      resetCheck();
      hasInitiallyChecked.current = false;
      checkUser(tenant.owner_email, tenant.id);
    }
  };

  const handleCreateUser = async () => {
    if (!tenant?.owner_email || !tenant?.owner_name) {
      toast({
        title: "Error",
        description: "Missing owner email or name",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const result = await createAdminUser(
        tenant.owner_email, 
        tenant.owner_name, 
        tenant.id
      );
      
      if (result?.success) {
        toast({
          title: "Success",
          description: "Admin user created successfully",
          variant: "default",
        });
        // Delay the recheck to allow backend processing
        setTimeout(() => {
          resetCheck();
          checkUser(tenant.owner_email, tenant.id);
        }, 2000);
      }
    } catch (error) {
      console.error('UserManagementSection: Error creating user:', error);
      toast({
        title: "Error",
        description: "Failed to create admin user",
        variant: "destructive",
      });
    }
  };

  const handleFixRelationship = async () => {
    if (!userInfo?.userId || !tenant?.id) {
      toast({
        title: "Error",
        description: "Missing user ID or tenant ID",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const success = await ensureUserTenantRecord(userInfo.userId, tenant.id);
      if (success) {
        toast({
          title: "Success",
          description: "User-tenant relationship fixed successfully",
          variant: "default",
        });
        // Delay the recheck to allow backend processing
        setTimeout(() => {
          resetCheck();
          checkUser(tenant.owner_email, tenant.id);
        }, 2000);
      }
    } catch (error) {
      console.error('UserManagementSection: Error fixing relationship:', error);
      toast({
        title: "Error",
        description: "Failed to fix user-tenant relationship",
        variant: "destructive",
      });
    }
  };

  const handleSendReset = async () => {
    if (!tenant?.owner_email) {
      toast({
        title: "Error",
        description: "Missing owner email",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await sendPasswordReset(tenant.owner_email);
    } catch (error) {
      console.error('UserManagementSection: Error sending password reset:', error);
    }
  };

  if (!tenant.owner_email) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600">No admin email configured for this tenant</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <User className="h-4 w-4" />
          Admin User Management
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleManualRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {userStatus === 'checking' && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span className="text-sm text-blue-700">Checking user status...</span>
        </div>
      )}

      {userStatus === 'found' && userInfo && (
        <div className="space-y-4">
          {/* Auth Status */}
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <Shield className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700">User found in authentication system</span>
          </div>

          {/* Tenant Relationship Status */}
          {tenantStatus && (
            <div className="space-y-3">
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                tenantStatus.tenantRelationshipExists && tenantStatus.roleMatches
                  ? 'bg-green-50'
                  : 'bg-orange-50'
              }`}>
                {tenantStatus.tenantRelationshipExists && tenantStatus.roleMatches ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <Database className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700">
                      User-tenant relationship configured correctly (Role: {tenantStatus.currentRole})
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <Database className="h-4 w-4 text-orange-600" />
                    <span className="text-sm text-orange-700">
                      User-tenant relationship needs attention
                    </span>
                  </>
                )}
              </div>

              {/* Issues */}
              {tenantStatus.issues.length > 0 && (
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-700">Issues Found:</span>
                  </div>
                  <ul className="text-xs text-red-600 space-y-1 ml-6">
                    {tenantStatus.issues.map((issue, index) => (
                      <li key={index}>• {issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Fix Actions */}
              {(!tenantStatus.tenantRelationshipExists || !tenantStatus.roleMatches) && userInfo.userId && (
                <Button
                  onClick={handleFixRelationship}
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-2" />
                      Fixing Relationship...
                    </>
                  ) : (
                    <>
                      <Database className="h-3 w-3 mr-2" />
                      {!tenantStatus.tenantRelationshipExists 
                        ? 'Create User-Tenant Relationship' 
                        : 'Fix Role Mismatch'}
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
          
          {/* User Details */}
          <div className="flex items-center space-x-4 p-3 border rounded-lg">
            <Avatar className="h-10 w-10">
              <AvatarImage src={`https://avatar.vercel.sh/${userInfo.email}.png`} />
              <AvatarFallback>{userInfo.email?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium">{tenant.owner_name || userInfo.email}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {userInfo.email}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Auth: ✓
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  Tenant: {tenantStatus?.tenantRelationshipExists ? '✓' : '✗'}
                </p>
                {tenantStatus?.currentRole && (
                  <Badge variant="outline" className="text-xs">
                    {tenantStatus.currentRole}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Password Reset Action */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendReset}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-2" />
                Sending Reset Email...
              </>
            ) : (
              <>
                <KeyRound className="h-3 w-3 mr-2" />
                Send Password Reset
              </>
            )}
          </Button>
        </div>
      )}

      {userStatus === 'not_found' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
            <XCircle className="h-4 w-4 text-orange-600" />
            <span className="text-sm text-orange-700">No admin user found for {tenant.owner_email}</span>
          </div>
          
          <Button
            onClick={handleCreateUser}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-2" />
                Creating Admin User...
              </>
            ) : (
              <>
                <UserPlus className="h-3 w-3 mr-2" />
                Create Admin User & Send Welcome Email
              </>
            )}
          </Button>
        </div>
      )}

      {userStatus === 'error' && (
        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
          <XCircle className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-700">Error checking user status. Please try again.</span>
        </div>
      )}
    </div>
  );
};

export const UserManagementSection: React.FC<UserManagementSectionProps> = (props) => {
  return (
    <ErrorBoundary
      context={{
        component: 'UserManagementSection',
        level: 'medium',
        metadata: { tenantId: props.tenant.id }
      }}
    >
      <UserManagementContent {...props} />
    </ErrorBoundary>
  );
};

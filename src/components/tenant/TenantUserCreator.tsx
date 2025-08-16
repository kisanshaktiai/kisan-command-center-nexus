
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, AlertTriangle, User, Database, Zap, Shield } from 'lucide-react';
import { useTenantUserManagement } from '@/hooks/useTenantUserManagement';
import { useTenantContext } from '@/hooks/useTenantContext';

export const TenantUserCreator: React.FC = () => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [userStatus, setUserStatus] = useState<any>(null);
  const [tenantStatus, setTenantStatus] = useState<any>(null);
  
  const { currentTenant } = useTenantContext();
  const {
    isCheckingUser,
    isCreatingUser,
    isCheckingStatus,
    isFixingRelationship,
    checkUserExists,
    checkUserTenantStatus,
    ensureUserTenantRecord,
    createTenantAsUser,
    createAdminUser,
    sendPasswordReset
  } = useTenantUserManagement();

  const handleCheckStatus = async () => {
    if (!email || !currentTenant?.id) return;

    console.log('TenantUserCreator: Checking status for:', { email, tenantId: currentTenant.id });

    // Check auth.users table
    const authStatus = await checkUserExists(email);
    console.log('TenantUserCreator: Auth status result:', authStatus);
    setUserStatus(authStatus);

    // Check user_tenants table
    const relationshipStatus = await checkUserTenantStatus(email, currentTenant.id);
    console.log('TenantUserCreator: Relationship status result:', relationshipStatus);
    setTenantStatus(relationshipStatus);
  };

  const handleFixRelationship = async () => {
    if (!userStatus?.userId || !currentTenant?.id) return;

    const success = await ensureUserTenantRecord(userStatus.userId, currentTenant.id);
    if (success) {
      // Refresh status after fixing
      await handleCheckStatus();
    }
  };

  const handleCreateUser = async (role: 'tenant_user' | 'tenant_admin') => {
    if (!email || !fullName || !currentTenant?.id) return;

    const success = role === 'tenant_admin' 
      ? await createAdminUser(email, fullName, currentTenant.id)
      : await createTenantAsUser(email, fullName, currentTenant.id);

    if (success) {
      // Clear form and refresh status
      setEmail('');
      setFullName('');
      setUserStatus(null);
      setTenantStatus(null);
    }
  };

  const getAuthStatusIcon = () => {
    if (!userStatus) return null;
    
    if (userStatus.exists) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getRelationshipStatusIcon = () => {
    if (!tenantStatus) return null;
    
    if (tenantStatus.authExists && tenantStatus.tenantRelationshipExists && tenantStatus.roleMatches) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (tenantStatus.authExists && !tenantStatus.tenantRelationshipExists) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    } else {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getOverallStatus = () => {
    if (!userStatus || !tenantStatus) return null;

    if (userStatus.exists && tenantStatus.tenantRelationshipExists && tenantStatus.roleMatches) {
      return {
        type: 'success',
        message: 'User exists and has proper tenant access',
        canFix: false
      };
    } else if (userStatus.exists && !tenantStatus.tenantRelationshipExists) {
      return {
        type: 'warning',
        message: 'User exists in auth but missing tenant relationship',
        canFix: true
      };
    } else if (userStatus.exists && tenantStatus.tenantRelationshipExists && !tenantStatus.roleMatches) {
      return {
        type: 'warning',
        message: `User has wrong role: ${tenantStatus.currentRole} (expected: ${tenantStatus.expectedRole})`,
        canFix: true
      };
    } else if (!userStatus.exists) {
      return {
        type: 'info',
        message: 'User does not exist - can create new user',
        canFix: false
      };
    } else {
      return {
        type: 'error',
        message: 'Unknown status - please check manually',
        canFix: false
      };
    }
  };

  const overallStatus = getOverallStatus();

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Tenant User Management
        </CardTitle>
        <CardDescription>
          Check user status and create or manage tenant users
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
            />
          </div>
        </div>

        {/* Check Status Button */}
        <div>
          <Button 
            onClick={handleCheckStatus}
            disabled={!email || isCheckingUser || isCheckingStatus}
            className="w-full md:w-auto"
          >
            {(isCheckingUser || isCheckingStatus) ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Checking Status...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Check User Status
              </>
            )}
          </Button>
        </div>

        {/* Status Display */}
        {(userStatus || tenantStatus) && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Status Check Results</h3>
            
            {/* Auth Table Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4" />
                  Authentication Status
                  {getAuthStatusIcon()}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">User exists in auth.users:</span>
                  <Badge variant={userStatus?.exists ? 'default' : 'destructive'}>
                    {userStatus?.exists ? 'Yes' : 'No'}
                  </Badge>
                </div>
                {userStatus?.exists && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">User ID:</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{userStatus.userId}</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">User Status:</span>
                      <Badge variant="outline">{userStatus.userStatus || 'active'}</Badge>
                    </div>
                  </>
                )}
                {userStatus?.error && (
                  <Alert variant="destructive">
                    <AlertDescription>{userStatus.error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Tenant Relationship Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="h-4 w-4" />
                  Tenant Relationship Status
                  {getRelationshipStatusIcon()}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Auth exists:</span>
                  <Badge variant={tenantStatus?.authExists ? 'default' : 'destructive'}>
                    {tenantStatus?.authExists ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Tenant relationship exists:</span>
                  <Badge variant={tenantStatus?.tenantRelationshipExists ? 'default' : 'destructive'}>
                    {tenantStatus?.tenantRelationshipExists ? 'Yes' : 'No'}
                  </Badge>
                </div>
                {tenantStatus?.tenantRelationshipExists && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Current role:</span>
                      <Badge variant="outline">{tenantStatus.currentRole}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Expected role:</span>
                      <Badge variant="outline">{tenantStatus.expectedRole}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Role matches:</span>
                      <Badge variant={tenantStatus.roleMatches ? 'default' : 'destructive'}>
                        {tenantStatus.roleMatches ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </>
                )}
                {tenantStatus?.issues && tenantStatus.issues.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-sm font-medium">Issues found:</span>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {tenantStatus.issues.map((issue: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <AlertTriangle className="h-3 w-3 mt-0.5 text-yellow-500 flex-shrink-0" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Overall Status Alert */}
            {overallStatus && (
              <Alert variant={overallStatus.type === 'error' ? 'destructive' : 'default'}>
                <AlertDescription className="flex items-center justify-between">
                  <span>{overallStatus.message}</span>
                  {overallStatus.canFix && (
                    <Button
                      size="sm"
                      onClick={handleFixRelationship}
                      disabled={isFixingRelationship}
                      variant="outline"
                    >
                      {isFixingRelationship ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          Fixing...
                        </>
                      ) : (
                        <>
                          <Zap className="h-3 w-3 mr-1" />
                          Fix Relationship
                        </>
                      )}
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {userStatus && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Available Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {!userStatus.exists && (
                <>
                  <Button
                    onClick={() => handleCreateUser('tenant_user')}
                    disabled={!fullName || isCreatingUser}
                    variant="default"
                  >
                    {isCreatingUser ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <User className="h-4 w-4 mr-2" />
                    )}
                    Create as User
                  </Button>
                  <Button
                    onClick={() => handleCreateUser('tenant_admin')}
                    disabled={!fullName || isCreatingUser}
                    variant="secondary"
                  >
                    {isCreatingUser ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Shield className="h-4 w-4 mr-2" />
                    )}
                    Create as Admin
                  </Button>
                </>
              )}
              {userStatus.exists && (
                <Button
                  onClick={() => sendPasswordReset(email)}
                  variant="outline"
                >
                  Send Password Reset
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TenantUserCreator;

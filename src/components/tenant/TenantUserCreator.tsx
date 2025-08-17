
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useTenantUserManagement } from '@/hooks/useTenantUserManagement';
import { UserTenantService } from '@/services/UserTenantService';
import { AlertTriangle, CheckCircle, XCircle, User, Mail, Shield, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface TenantUserCreatorProps {
  tenantId: string;
  tenantName: string;
}

export const TenantUserCreator: React.FC<TenantUserCreatorProps> = ({ 
  tenantId, 
  tenantName 
}) => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [statusCheckResult, setStatusCheckResult] = useState<any>(null);
  const [isFixingRelationship, setIsFixingRelationship] = useState(false);
  
  const {
    checkUserExists,
    checkUserTenantStatus,
    createAdminUser,
    sendPasswordReset,
    isCheckingUser,
    isCreatingUser,
    isSendingReset,
    isCheckingStatus
  } = useTenantUserManagement();

  const handleCheckStatus = async () => {
    if (!email) return;
    
    const status = await checkUserTenantStatus(email, tenantId);
    setStatusCheckResult(status);
  };

  const handleCreateUser = async () => {
    if (!email || !fullName) return;
    
    const result = await createAdminUser(email, fullName, tenantId);
    if (result?.success) {
      // Refresh status after creation
      await handleCheckStatus();
    }
  };

  const handleFixRelationship = async () => {
    if (!statusCheckResult?.userId) {
      toast.error('No user ID available to fix relationship');
      return;
    }
    
    setIsFixingRelationship(true);
    try {
      console.log('TenantUserCreator: Fixing relationship using global manage-user-tenant function');
      toast.info('Creating user-tenant relationship...');
      
      const result = await UserTenantService.createUserTenantRelationship(
        statusCheckResult.userId,
        tenantId
      );
      
      if (result) {
        toast.success('User-tenant relationship created successfully');
        // Refresh status after fixing
        await handleCheckStatus();
      } else {
        toast.error('Failed to create user-tenant relationship');
      }
    } catch (error) {
      console.error('TenantUserCreator: Error fixing relationship:', error);
      toast.error('Error occurred while fixing relationship');
    } finally {
      setIsFixingRelationship(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!email) return;
    await sendPasswordReset(email);
  };

  const getStatusColor = (status: any) => {
    if (!status) return 'gray';
    
    const allGood = status.authExists && status.tenantRelationshipExists && status.roleMatches;
    if (allGood) return 'green';
    
    if (status.authExists && !status.tenantRelationshipExists) return 'yellow';
    if (!status.authExists) return 'red';
    
    return 'gray';
  };

  const getStatusIcon = (status: any) => {
    if (!status) return <User className="h-4 w-4" />;
    
    const allGood = status.authExists && status.tenantRelationshipExists && status.roleMatches;
    if (allGood) return <CheckCircle className="h-4 w-4 text-green-600" />;
    
    if (status.authExists && !status.tenantRelationshipExists) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    if (!status.authExists) return <XCircle className="h-4 w-4 text-red-600" />;
    
    return <User className="h-4 w-4" />;
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Tenant Admin User Management
        </CardTitle>
        <CardDescription>
          Create or manage admin users for <strong>{tenantName}</strong>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          </div>
          
          <Button 
            onClick={handleCheckStatus}
            disabled={!email || isCheckingStatus}
            variant="outline"
            className="w-full"
          >
            {isCheckingStatus ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Checking Status...
              </>
            ) : (
              <>
                <User className="h-4 w-4 mr-2" />
                Check User Status
              </>
            )}
          </Button>
        </div>

        {/* Status Display */}
        {statusCheckResult && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getStatusIcon(statusCheckResult)}
                <h4 className="font-medium">User Status Check Results</h4>
                <Badge variant={getStatusColor(statusCheckResult) === 'green' ? 'default' : 
                              getStatusColor(statusCheckResult) === 'yellow' ? 'secondary' : 'destructive'}>
                  {getStatusColor(statusCheckResult) === 'green' ? 'All Good' :
                   getStatusColor(statusCheckResult) === 'yellow' ? 'Needs Fix' : 'Missing'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm font-medium">Auth Account</span>
                  </div>
                  <Badge variant={statusCheckResult.authExists ? 'default' : 'destructive'}>
                    {statusCheckResult.authExists ? 'Exists' : 'Missing'}
                  </Badge>
                  {statusCheckResult.userId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ID: {statusCheckResult.userId.slice(0, 8)}...
                    </p>
                  )}
                </div>

                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm font-medium">Tenant Relationship</span>
                  </div>
                  <Badge variant={statusCheckResult.tenantRelationshipExists ? 'default' : 'destructive'}>
                    {statusCheckResult.tenantRelationshipExists ? 'Exists' : 'Missing'}
                  </Badge>
                </div>

                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4" />
                    <span className="text-sm font-medium">Role</span>
                  </div>
                  <Badge variant={statusCheckResult.roleMatches ? 'default' : 'secondary'}>
                    {statusCheckResult.currentRole || statusCheckResult.expectedRole}
                  </Badge>
                </div>
              </div>

              {statusCheckResult.issues.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Issues found:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {statusCheckResult.issues.map((issue: string, index: number) => (
                        <li key={index} className="text-sm">{issue}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </>
        )}

        {/* Action Buttons */}
        {statusCheckResult && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-medium">Available Actions</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {!statusCheckResult.authExists && (
                  <Button 
                    onClick={handleCreateUser}
                    disabled={!email || !fullName || isCreatingUser}
                    className="w-full"
                  >
                    {isCreatingUser ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <User className="h-4 w-4 mr-2" />
                        Create Admin User
                      </>
                    )}
                  </Button>
                )}

                {statusCheckResult.authExists && !statusCheckResult.tenantRelationshipExists && (
                  <Button 
                    onClick={handleFixRelationship}
                    disabled={isFixingRelationship}
                    variant="outline"
                    className="w-full"
                  >
                    {isFixingRelationship ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Fixing...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Fix Relationship
                      </>
                    )}
                  </Button>
                )}

                {statusCheckResult.authExists && (
                  <Button 
                    onClick={handleSendPasswordReset}
                    disabled={isSendingReset}
                    variant="outline"
                    className="w-full"
                  >
                    {isSendingReset ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Password Reset
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

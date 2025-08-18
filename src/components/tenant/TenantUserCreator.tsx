
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  UserCheck, 
  UserX, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  Mail,
  UserPlus,
  Settings,
  Info,
  Database,
  Shield
} from 'lucide-react';
import { useTenantUserManagement } from '@/hooks/useTenantUserManagement';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TenantUserCreatorProps {
  tenantId: string;
  onUserCreated?: () => void;
}

interface RPCResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export const TenantUserCreator: React.FC<TenantUserCreatorProps> = ({
  tenantId,
  onUserCreated
}) => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [userStatus, setUserStatus] = useState<any>(null);
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

  const handleCheckUser = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    const status = await checkUserTenantStatus(email, tenantId);
    setUserStatus(status);
  };

  const createUserTenantRelationship = async (userId: string, tenantId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('manage_user_tenant_relationship', {
        p_user_id: userId,
        p_tenant_id: tenantId,
        p_role: 'tenant_admin',
        p_is_active: true,
        p_metadata: {
          created_via: 'tenant_user_creator',
          created_at: new Date().toISOString()
        },
        p_operation: 'upsert'
      });

      if (error) {
        console.error('Error calling manage_user_tenant_relationship:', error);
        return false;
      }

      const result = data as unknown as RPCResponse;
      return result?.success || false;
    } catch (error) {
      console.error('Unexpected error in createUserTenantRelationship:', error);
      return false;
    }
  };

  const handleFixRelationship = async () => {
    if (!userStatus?.userId) {
      toast.error('No user ID available to fix relationship');
      return;
    }

    setIsFixingRelationship(true);
    try {
      toast.info('Creating user-tenant relationship...');
      
      const success = await createUserTenantRelationship(userStatus.userId, tenantId);
      
      if (success) {
        toast.success('User-tenant relationship created successfully');
        // Refresh the status
        await handleCheckUser();
        onUserCreated?.();
      } else {
        toast.error('Failed to create user-tenant relationship');
      }
    } catch (error) {
      console.error('Error fixing relationship:', error);
      toast.error('An error occurred while fixing the relationship');
    } finally {
      setIsFixingRelationship(false);
    }
  };

  const handleCreateUser = async () => {
    if (!email.trim() || !fullName.trim()) {
      toast.error('Please fill in both email and full name');
      return;
    }

    const result = await createAdminUser(email, fullName, tenantId);
    if (result?.success) {
      setEmail('');
      setFullName('');
      setUserStatus(null);
      onUserCreated?.();
    }
  };

  const handleSendReset = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    await sendPasswordReset(email);
  };

  const getStatusBadge = () => {
    if (!userStatus) return null;

    if (userStatus.authExists && userStatus.tenantRelationshipExists && userStatus.roleMatches) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Complete Setup
        </Badge>
      );
    }

    if (userStatus.authExists && !userStatus.tenantRelationshipExists) {
      return (
        <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Missing Tenant Link
        </Badge>
      );
    }

    if (!userStatus.authExists) {
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          User Not Created
        </Badge>
      );
    }

    return (
      <Badge variant="secondary">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Setup Incomplete
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Tenant User Setup & Verification
        </CardTitle>
        <CardDescription>
          Ensure users have complete access by verifying their setup across all required systems
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Information Alert */}
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="space-y-2">
              <p className="font-medium">Why check user status?</p>
              <p className="text-sm">
                For complete tenant access, users need records in three systems:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                <div className="flex items-center gap-2 text-xs">
                  <Shield className="w-3 h-3" />
                  <span>Supabase Auth</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Database className="w-3 h-3" />
                  <span>Tenant Record</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <UserCheck className="w-3 h-3" />
                  <span>User-Tenant Link</span>
                </div>
              </div>
              <p className="text-xs">
                Enter an email to verify their setup and automatically fix any missing connections.
              </p>
            </div>
          </AlertDescription>
        </Alert>

        {/* User Check Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-base font-medium">
              Email Address to Verify
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              Check if this user has complete access to the tenant system
            </p>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleCheckUser}
                disabled={isCheckingStatus || !email.trim()}
                variant="outline"
              >
                {isCheckingStatus ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Verify Setup'
                )}
              </Button>
            </div>
          </div>

          {/* Status Display */}
          {userStatus && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="font-medium">System Verification Results</span>
                {getStatusBadge()}
              </div>

              {/* Detailed Status Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 border rounded-lg bg-background">
                  <div className="flex items-center justify-center mb-2">
                    {userStatus.authExists ? (
                      <Shield className="w-8 h-8 text-green-600" />
                    ) : (
                      <Shield className="w-8 h-8 text-red-600" />
                    )}
                  </div>
                  <div className="text-sm font-medium mb-1">Supabase Auth</div>
                  <div className="text-xs text-muted-foreground">
                    {userStatus.authExists ? 'Account exists' : 'No account found'}
                  </div>
                </div>

                <div className="text-center p-3 border rounded-lg bg-background">
                  <div className="flex items-center justify-center mb-2">
                    <Database className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="text-sm font-medium mb-1">Tenant Record</div>
                  <div className="text-xs text-muted-foreground">
                    System managed
                  </div>
                </div>

                <div className="text-center p-3 border rounded-lg bg-background">
                  <div className="flex items-center justify-center mb-2">
                    {userStatus.tenantRelationshipExists ? (
                      <UserCheck className="w-8 h-8 text-green-600" />
                    ) : (
                      <UserX className="w-8 h-8 text-red-600" />
                    )}
                  </div>
                  <div className="text-sm font-medium mb-1">User-Tenant Link</div>
                  <div className="text-xs text-muted-foreground">
                    {userStatus.tenantRelationshipExists ? 'Connected' : 'Not linked'}
                  </div>
                </div>
              </div>

              {userStatus.currentRole && (
                <div className="text-sm p-2 bg-blue-50 rounded border border-blue-200">
                  <span className="font-medium text-blue-800">Current Role:</span> 
                  <span className="text-blue-700 ml-1">{userStatus.currentRole}</span>
                </div>
              )}

              {userStatus.issues.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Issues found:</p>
                      {userStatus.issues.map((issue, index) => (
                        <div key={index} className="text-sm">• {issue}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t">
                {userStatus.authExists && !userStatus.tenantRelationshipExists && userStatus.userId && (
                  <Button
                    size="sm"
                    onClick={handleFixRelationship}
                    disabled={isFixingRelationship}
                  >
                    {isFixingRelationship ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Settings className="w-3 h-3 mr-1" />
                        Connect to Tenant
                      </>
                    )}
                  </Button>
                )}

                {userStatus.authExists && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSendReset}
                    disabled={isSendingReset}
                  >
                    {isSendingReset ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-3 h-3 mr-1" />
                        Send Password Reset
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Create New User Section */}
        {userStatus && !userStatus.authExists && (
          <div className="border-t pt-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-medium">Create Complete User Setup</h3>
            </div>
            
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                This will create a complete user setup including authentication account, 
                tenant permissions, and all necessary connections automatically.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <Button
                onClick={handleCreateUser}
                disabled={isCreatingUser || !email.trim() || !fullName.trim()}
                className="w-full"
              >
                {isCreatingUser ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Complete Setup...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create Complete User Setup
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

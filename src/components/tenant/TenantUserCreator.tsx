
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTenantUserManagement } from '@/hooks/useTenantUserManagement';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { UserPlus, Search } from 'lucide-react';

interface TenantUserCreatorProps {
  tenantId?: string;
  tenantName?: string;
  onUserCreated?: (userData: any) => void;
}

export const TenantUserCreator: React.FC<TenantUserCreatorProps> = ({
  tenantId,
  tenantName,
  onUserCreated
}) => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [userExists, setUserExists] = useState<boolean | null>(null);
  const [userCheckResult, setUserCheckResult] = useState<any>(null);
  
  const {
    isCheckingUser,
    isCreatingUser,
    checkUserExists,
    createTenantAsUser,
    createAdminUser,
    sendPasswordReset
  } = useTenantUserManagement();

  const handleCheckUser = async () => {
    if (!email) return;
    
    const result = await checkUserExists(email);
    if (result) {
      setUserExists(result.exists);
      setUserCheckResult(result);
    }
  };

  const handleCreateUser = async (asAdmin = false) => {
    if (!email || !fullName) return;
    
    const result = asAdmin 
      ? await createAdminUser(email, fullName, tenantId)
      : await createTenantAsUser(email, fullName, tenantId);
    
    if (result?.success) {
      onUserCreated?.(result);
      // Reset form
      setEmail('');
      setFullName('');
      setUserExists(null);
      setUserCheckResult(null);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!email) return;
    await sendPasswordReset(email);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Manage Tenant User
        </CardTitle>
        <CardDescription>
          Check if a user exists or create a new user for {tenantName || 'this tenant'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
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
              variant="outline"
              onClick={handleCheckUser}
              disabled={!email || isCheckingUser}
              size="sm"
            >
              {isCheckingUser ? (
                <LoadingSpinner className="h-4 w-4" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {userExists === false && (
          <div className="space-y-3">
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
              <p className="text-sm text-orange-700">
                User not found in system. You can create a new user account.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => handleCreateUser(false)}
                disabled={!email || !fullName || isCreatingUser}
                className="flex-1"
              >
                {isCreatingUser ? (
                  <LoadingSpinner className="h-4 w-4 mr-2" />
                ) : null}
                Create User
              </Button>
              <Button
                variant="outline"
                onClick={() => handleCreateUser(true)}
                disabled={!email || !fullName || isCreatingUser}
                className="flex-1"
              >
                Create Admin
              </Button>
            </div>
          </div>
        )}

        {userExists === true && userCheckResult && (
          <div className="space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700">
                User exists in system
                {userCheckResult.isAdmin && ' (Admin user)'}
                {userCheckResult.userStatus === 'pending' && ' - Email not confirmed'}
              </p>
            </div>

            {userCheckResult.userStatus === 'pending' && (
              <Button
                variant="outline"
                onClick={handleSendPasswordReset}
                disabled={isCreatingUser}
                className="w-full"
              >
                Send Password Reset Email
              </Button>
            )}
          </div>
        )}

        {userCheckResult?.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">
              Error: {userCheckResult.error}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};


import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, Mail, UserPlus, Trash2, Shield, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';

interface UsersRolesStepProps {
  tenantId: string;
  onComplete: (data: any) => void;
  data: any;
  onDataChange: (data: any) => void;
}

interface UserInvite {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: 'pending' | 'sent' | 'accepted';
}

export const UsersRolesStep: React.FC<UsersRolesStepProps> = ({
  tenantId,
  onComplete,
  data,
  onDataChange
}) => {
  const [userInvites, setUserInvites] = useState<UserInvite[]>(data.userInvites || []);
  const [existingUsers, setExistingUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'tenant_user'
  });
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const { showSuccess, showError } = useNotifications();

  const roles = [
    { value: 'tenant_admin', label: 'Admin', description: 'Full access to tenant management' },
    { value: 'tenant_user', label: 'User', description: 'Standard user access' },
    { value: 'farmer', label: 'Farmer', description: 'Farmer-specific features' },
    { value: 'dealer', label: 'Dealer', description: 'Dealer-specific features' }
  ];

  useEffect(() => {
    loadExistingUsers();
  }, [tenantId]);

  const loadExistingUsers = async () => {
    try {
      const { data: users, error } = await supabase
        .from('user_tenants')
        .select(`
          *,
          user_profiles(full_name, email)
        `)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      
      // Filter out any items that don't have user_profiles data
      const validUsers = users.filter(user => user.user_profiles);
      setExistingUsers(validUsers);
    } catch (error) {
      console.error('Error loading existing users:', error);
    }
  };

  const addUserInvite = () => {
    if (!newUser.email || !newUser.firstName) {
      showError('Please fill in required fields');
      return;
    }

    const invite: UserInvite = {
      id: Date.now().toString(),
      ...newUser,
      status: 'pending'
    };

    const updatedInvites = [...userInvites, invite];
    setUserInvites(updatedInvites);
    
    const newData = { ...data, userInvites: updatedInvites };
    onDataChange(newData);

    // Reset form
    setNewUser({
      email: '',
      firstName: '',
      lastName: '',
      role: 'tenant_user'
    });
  };

  const removeUserInvite = (id: string) => {
    const updatedInvites = userInvites.filter(invite => invite.id !== id);
    setUserInvites(updatedInvites);
    
    const newData = { ...data, userInvites: updatedInvites };
    onDataChange(newData);
  };

  const sendInvites = async () => {
    try {
      setIsSendingInvites(true);

      for (const invite of userInvites) {
        if (invite.status === 'pending') {
          // Call edge function to send invitation
          const { error } = await supabase.functions.invoke('send-user-invite', {
            body: {
              tenantId,
              email: invite.email,
              firstName: invite.firstName,
              lastName: invite.lastName,
              role: invite.role
            }
          });

          if (error) throw error;

          // Update invite status
          invite.status = 'sent';
        }
      }

      setUserInvites([...userInvites]);
      const newData = { ...data, userInvites, invitesSent: true };
      onDataChange(newData);

      showSuccess('User invitations sent successfully');
    } catch (error) {
      console.error('Error sending invites:', error);
      showError('Failed to send some invitations');
    } finally {
      setIsSendingInvites(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const stepData = {
        userInvites,
        totalUsers: existingUsers.length + userInvites.length,
        invitesSent: userInvites.some(invite => invite.status === 'sent'),
        completedAt: new Date().toISOString()
      };

      showSuccess('Users and roles configuration completed');
      onComplete(stepData);
    } catch (error) {
      console.error('Error completing users step:', error);
      showError('Failed to complete users configuration');
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    const variants: Record<string, any> = {
      'tenant_admin': 'default',
      'tenant_user': 'secondary',
      'farmer': 'outline',
      'dealer': 'outline'
    };
    return variants[role] || 'secondary';
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'pending': { variant: 'outline' as const, text: 'Pending' },
      'sent': { variant: 'secondary' as const, text: 'Sent' },
      'accepted': { variant: 'default' as const, text: 'Accepted' }
    };
    const config = variants[status as keyof typeof variants] || variants.pending;
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Users & Roles Setup</h3>
        <p className="text-muted-foreground">
          Invite team members and configure their roles and permissions
        </p>
      </div>

      {existingUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Existing Users
            </CardTitle>
            <CardDescription>
              Users already associated with this tenant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {existingUsers.map((user: any) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{user.user_profiles?.full_name || 'Unknown User'}</p>
                      <p className="text-xs text-muted-foreground">{user.user_profiles?.email || 'No email'}</p>
                    </div>
                  </div>
                  <Badge variant={getRoleBadgeVariant(user.role)}>
                    {roles.find(r => r.value === user.role)?.label || user.role}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invite New Users
          </CardTitle>
          <CardDescription>
            Add team members who will have access to this tenant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={newUser.firstName}
                onChange={(e) => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="John"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={newUser.lastName}
                onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="Doe"
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john@example.com"
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div>
                        <div className="font-medium">{role.label}</div>
                        <div className="text-xs text-muted-foreground">{role.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={addUserInvite} className="w-full">
            <UserPlus className="w-4 h-4 mr-2" />
            Add User Invitation
          </Button>
        </CardContent>
      </Card>

      {userInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              Users who will be invited to join this tenant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userInvites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">
                        {invite.firstName} {invite.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{invite.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getRoleBadgeVariant(invite.role)}>
                      {roles.find(r => r.value === invite.role)?.label}
                    </Badge>
                    {getStatusBadge(invite.status)}
                    {invite.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeUserInvite(invite.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {userInvites.some(invite => invite.status === 'pending') && (
              <div className="mt-4 pt-4 border-t">
                <Button
                  onClick={sendInvites}
                  disabled={isSendingInvites}
                  className="w-full"
                >
                  {isSendingInvites ? 'Sending Invitations...' : 'Send All Invitations'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSubmit}>
          Complete Users & Roles Setup
        </Button>
      </div>
    </div>
  );
};

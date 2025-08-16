
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Mail, CheckCircle, Clock, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';

interface User {
  id?: string;
  name: string;
  email: string;
  role: string;
  status: 'pending' | 'invited' | 'active';
  invitedAt?: string;
}

interface UsersRolesStepProps {
  tenantId: string;
  onComplete: (data: any) => void;
  data: any;
  onDataChange: (data: any) => void;
}

export const UsersRolesStep: React.FC<UsersRolesStepProps> = ({
  tenantId,
  onComplete,
  data,
  onDataChange
}) => {
  const [users, setUsers] = useState<User[]>(data.users || []);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'user'
  });
  const [isInviting, setIsInviting] = useState(false);
  const { showSuccess, showError } = useNotifications();

  const roleOptions = [
    { value: 'tenant_admin', label: 'Admin', description: 'Full access to tenant management' },
    { value: 'manager', label: 'Manager', description: 'Manage users and content' },
    { value: 'user', label: 'User', description: 'Standard user access' },
    { value: 'viewer', label: 'Viewer', description: 'Read-only access' }
  ];

  useEffect(() => {
    loadExistingUsers();
  }, [tenantId]);

  const loadExistingUsers = async () => {
    try {
      const { data: existingUsers, error } = await supabase
        .from('user_tenants')
        .select(`
          id,
          role,
          is_active,
          created_at,
          user_profiles(full_name, email)
        `)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      const formattedUsers = existingUsers?.map(user => ({
        id: user.id,
        name: user.user_profiles?.full_name || 'Unknown',
        email: user.user_profiles?.email || '',
        role: user.role,
        status: user.is_active ? 'active' : 'pending' as any
      })) || [];

      setUsers(prev => [...formattedUsers, ...prev.filter(u => !u.id)]);
    } catch (error) {
      console.error('Error loading existing users:', error);
    }
  };

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) {
      showError('Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUser.email)) {
      showError('Please enter a valid email address');
      return;
    }

    if (users.some(u => u.email === newUser.email)) {
      showError('User with this email already exists');
      return;
    }

    const user: User = {
      ...newUser,
      status: 'pending'
    };

    const updatedUsers = [...users, user];
    setUsers(updatedUsers);
    onDataChange({ ...data, users: updatedUsers });

    setNewUser({ name: '', email: '', role: 'user' });
  };

  const handleRemoveUser = (index: number) => {
    const updatedUsers = users.filter((_, i) => i !== index);
    setUsers(updatedUsers);
    onDataChange({ ...data, users: updatedUsers });
  };

  const handleRoleChange = (index: number, newRole: string) => {
    const updatedUsers = [...users];
    updatedUsers[index] = { ...updatedUsers[index], role: newRole };
    setUsers(updatedUsers);
    onDataChange({ ...data, users: updatedUsers });
  };

  const sendInvite = async (user: User, index: number) => {
    try {
      setIsInviting(true);

      // Create invitation record
      const { data: invitation, error: inviteError } = await supabase
        .from('user_invitations')
        .insert({
          tenant_id: tenantId,
          email: user.email,
          role: user.role,
          invited_by: (await supabase.auth.getUser()).data.user?.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          invitation_token: crypto.randomUUID()
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      // Send invitation email via edge function
      const { error: emailError } = await supabase.functions.invoke('send-user-invitation', {
        body: {
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: tenantId,
          invitationToken: invitation.invitation_token
        }
      });

      if (emailError) throw emailError;

      // Update user status
      const updatedUsers = [...users];
      updatedUsers[index] = { 
        ...updatedUsers[index], 
        status: 'invited',
        invitedAt: new Date().toISOString()
      };
      setUsers(updatedUsers);
      onDataChange({ ...data, users: updatedUsers });

      showSuccess(`Invitation sent to ${user.email}`);
    } catch (error) {
      console.error('Error sending invitation:', error);
      showError('Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (users.length === 0) {
        showError('Please add at least one user');
        return;
      }

      // Send invitations to all pending users
      const pendingUsers = users.filter(u => u.status === 'pending');
      
      for (let i = 0; i < pendingUsers.length; i++) {
        const userIndex = users.findIndex(u => u.email === pendingUsers[i].email);
        await sendInvite(pendingUsers[i], userIndex);
      }

      showSuccess('User setup completed successfully');
      onComplete({ users });
    } catch (error) {
      console.error('Error completing user setup:', error);
      showError('Failed to complete user setup');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'invited':
        return <Mail className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-orange-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'active': 'default',
      'invited': 'secondary',
      'pending': 'outline'
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Users & Roles Setup</h3>
        <p className="text-muted-foreground">
          Add team members and assign roles for your organization
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add New User
          </CardTitle>
          <CardDescription>Invite team members to join your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="userName">Name</Label>
              <Input
                id="userName"
                value={newUser.name}
                onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter full name"
              />
            </div>
            <div>
              <Label htmlFor="userEmail">Email</Label>
              <Input
                id="userEmail"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <Label htmlFor="userRole">Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
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
            <div className="flex items-end">
              <Button onClick={handleAddUser} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Manage your team members and their roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No users added yet</p>
              <p className="text-sm">Add team members using the form above</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.id ? (
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleRoleChange(index, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roleOptions.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline">
                          {roleOptions.find(r => r.value === user.role)?.label || user.role}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(user.status)}
                        {getStatusBadge(user.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendInvite(user, index)}
                            disabled={isInviting}
                          >
                            <Mail className="w-4 h-4 mr-1" />
                            Invite
                          </Button>
                        )}
                        {!user.id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveUser(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>Understanding different role capabilities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roleOptions.map((role) => (
              <div key={role.value} className="p-4 border rounded-lg">
                <h4 className="font-medium text-sm">{role.label}</h4>
                <p className="text-xs text-muted-foreground mt-1">{role.description}</p>
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    {users.filter(u => u.role === role.value).length} assigned
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={isInviting || users.length === 0}>
          {isInviting ? 'Sending Invitations...' : 'Complete User Setup'}
        </Button>
      </div>
    </div>
  );
};

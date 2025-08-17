
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, Mail, CheckCircle, Clock, XCircle, RotateCcw, Trash2, Crown, Shield, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';

interface UserInvitation {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  status: string;
  created_at: string;
  sent_at?: string | null;
  expires_at: string;
}

interface EnhancedUsersRolesStepProps {
  tenantId: string;
  onComplete: (data: any) => void;
  data: any;
  onDataChange: (data: any) => void;
}

const roleOptions = [
  {
    value: 'tenant_owner',
    label: 'Tenant Owner',
    description: 'Full access to all features and settings',
    icon: Crown,
    color: 'text-yellow-600'
  },
  {
    value: 'tenant_admin',
    label: 'Tenant Admin',
    description: 'Manage users, settings, and most features',
    icon: Shield,
    color: 'text-blue-600'
  },
  {
    value: 'tenant_user',
    label: 'Tenant User',
    description: 'Standard user access to core features',
    icon: User,
    color: 'text-green-600'
  }
];

export const EnhancedUsersRolesStep: React.FC<EnhancedUsersRolesStepProps> = ({
  tenantId,
  onComplete,
  data,
  onDataChange
}) => {
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState<string | null>(null);
  const [tenantData, setTenantData] = useState<any>(null);
  const { showSuccess, showError } = useNotifications();

  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'tenant_user'
  });

  useEffect(() => {
    loadInvitations();
    loadTenantData();
  }, [tenantId]);

  const loadTenantData = async () => {
    try {
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('name, metadata')
        .eq('id', tenantId)
        .single();

      if (error) throw error;
      setTenantData(tenant);
    } catch (error) {
      console.error('Error loading tenant data:', error);
    }
  };

  const loadInvitations = async () => {
    try {
      setIsLoading(true);
      const { data: rawInvitations, error } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map the raw data to our UserInvitation interface with proper fallbacks
      const mappedInvitations: UserInvitation[] = (rawInvitations || []).map(invitation => {
        // Safely parse the metadata JSONB field
        const metadata = invitation.metadata as any;
        
        return {
          id: invitation.id,
          email: invitation.email,
          first_name: metadata?.first_name || '',
          last_name: metadata?.last_name || '',
          role: metadata?.role || 'tenant_user',
          status: invitation.status,
          created_at: invitation.created_at,
          sent_at: invitation.sent_at,
          expires_at: invitation.expires_at
        };
      });

      setInvitations(mappedInvitations);
    } catch (error) {
      console.error('Error loading invitations:', error);
      showError('Failed to load user invitations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!newUser.firstName.trim() || !newUser.lastName.trim() || !newUser.email.trim()) {
      showError('Please fill in all required fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUser.email)) {
      showError('Please enter a valid email address');
      return;
    }

    // Check if email already exists
    const existingInvitation = invitations.find(inv => 
      inv.email.toLowerCase() === newUser.email.toLowerCase() && 
      inv.status !== 'expired' && 
      inv.status !== 'cancelled'
    );

    if (existingInvitation) {
      showError('An invitation for this email already exists');
      return;
    }

    try {
      setIsSending(newUser.email);

      // Get current user info for the invitation
      const { data: { user } } = await supabase.auth.getUser();
      const inviterName = user?.user_metadata?.full_name || 'Team Admin';

      // Call the edge function to send invitation
      const { data, error } = await supabase.functions.invoke('send-user-invite', {
        body: {
          tenantId,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          tenantName: tenantData?.name || 'Your Organization',
          inviterName
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      showSuccess(`Invitation sent to ${newUser.email}`);
      
      // Reset form and close dialog
      setNewUser({
        firstName: '',
        lastName: '',
        email: '',
        role: 'tenant_user'
      });
      setIsDialogOpen(false);
      
      // Reload invitations
      await loadInvitations();
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      showError(error.message || 'Failed to send invitation');
    } finally {
      setIsSending(null);
    }
  };

  const handleResendInvitation = async (invitation: UserInvitation) => {
    try {
      setIsSending(invitation.id);

      const { data: { user } } = await supabase.auth.getUser();
      const inviterName = user?.user_metadata?.full_name || 'Team Admin';

      const { data, error } = await supabase.functions.invoke('send-user-invite', {
        body: {
          tenantId,
          email: invitation.email,
          firstName: invitation.first_name,
          lastName: invitation.last_name,
          role: invitation.role,
          tenantName: tenantData?.name || 'Your Organization',
          inviterName
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to resend invitation');
      }

      showSuccess('Invitation resent successfully');
      await loadInvitations();
    } catch (error: any) {
      console.error('Error resending invitation:', error);
      showError(error.message || 'Failed to resend invitation');
    } finally {
      setIsSending(null);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('user_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;

      showSuccess('Invitation cancelled');
      await loadInvitations();
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      showError('Failed to cancel invitation');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Mail className="w-4 h-4 text-blue-500" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'expired':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'pending': { variant: 'secondary', text: 'Pending' },
      'sent': { variant: 'outline', text: 'Sent' },
      'accepted': { variant: 'default', text: 'Accepted' },
      'expired': { variant: 'destructive', text: 'Expired' },
      'cancelled': { variant: 'secondary', text: 'Cancelled' }
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const getRoleInfo = (role: string) => {
    return roleOptions.find(option => option.value === role) || roleOptions[2];
  };

  const handleComplete = () => {
    const completedData = {
      invitations: invitations.length,
      roles_configured: true,
      team_setup_completed: true
    };
    
    onDataChange(completedData);
    onComplete(completedData);
  };

  const canComplete = invitations.length > 0 || data.skip_team_setup;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Team Setup & User Roles</h3>
        <p className="text-muted-foreground">
          Invite team members and configure their roles and permissions
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Manage user invitations and role assignments
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Invite New User</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join your organization
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
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
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={newUser.lastName}
                        onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="john.doe@example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={newUser.role} onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((role) => {
                          const Icon = role.icon;
                          return (
                            <SelectItem key={role.value} value={role.value}>
                              <div className="flex items-center gap-2">
                                <Icon className={`w-4 h-4 ${role.color}`} />
                                <div>
                                  <div className="font-medium">{role.label}</div>
                                  <div className="text-xs text-gray-500">{role.description}</div>
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> The user will receive an email invitation with instructions to join your organization.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleInviteUser}
                      disabled={isSending === newUser.email}
                    >
                      {isSending === newUser.email ? 'Sending...' : 'Send Invitation'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8">
              <UserPlus className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No team members yet</h4>
              <p className="text-gray-500 mb-4">Start building your team by inviting users to your organization.</p>
              <Button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Invite First User
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invited</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => {
                    const roleInfo = getRoleInfo(invitation.role);
                    const Icon = roleInfo.icon;
                    
                    return (
                      <TableRow key={invitation.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {invitation.first_name} {invitation.last_name}
                            </div>
                            <div className="text-sm text-gray-500">{invitation.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${roleInfo.color}`} />
                            <span className="font-medium">{roleInfo.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(invitation.status)}
                            {getStatusBadge(invitation.status)}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(invitation.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {invitation.status === 'pending' || invitation.status === 'sent' ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleResendInvitation(invitation)}
                                  disabled={isSending === invitation.id}
                                  className="flex items-center gap-1"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  {isSending === invitation.id ? 'Sending...' : 'Resend'}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCancelInvitation(invitation.id)}
                                  className="flex items-center gap-1 text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <span className="text-sm text-gray-500">
                                {invitation.status === 'accepted' ? 'User joined' : 'No actions available'}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions Overview</CardTitle>
          <CardDescription>
            Understanding what each role can do in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roleOptions.map((role) => {
              const Icon = role.icon;
              return (
                <div key={role.value} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={`w-5 h-5 ${role.color}`} />
                    <h4 className="font-medium">{role.label}</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{role.description}</p>
                  <div className="space-y-1">
                    {role.value === 'tenant_owner' && (
                      <>
                        <div className="text-xs text-green-600">✓ Full system access</div>
                        <div className="text-xs text-green-600">✓ Manage billing & subscriptions</div>
                        <div className="text-xs text-green-600">✓ Delete organization</div>
                      </>
                    )}
                    {role.value === 'tenant_admin' && (
                      <>
                        <div className="text-xs text-green-600">✓ Manage users & roles</div>
                        <div className="text-xs text-green-600">✓ Configure settings</div>
                        <div className="text-xs text-green-600">✓ View all data</div>
                      </>
                    )}
                    {role.value === 'tenant_user' && (
                      <>
                        <div className="text-xs text-green-600">✓ Access core features</div>
                        <div className="text-xs text-green-600">✓ Manage own data</div>
                        <div className="text-xs text-gray-500">✗ Cannot manage users</div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => {
            const skipData = { ...data, skip_team_setup: true };
            onDataChange(skipData);
            onComplete(skipData);
          }}
        >
          Skip Team Setup
        </Button>
        <Button
          onClick={handleComplete}
          disabled={!canComplete}
        >
          Complete Team Setup
        </Button>
      </div>
    </div>
  );
};

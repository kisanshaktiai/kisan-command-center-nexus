
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Mail, UserPlus, CheckCircle, XCircle, RotateCcw, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';

interface EnhancedUsersRolesStepProps {
  tenantId: string;
  onComplete: (data: any) => void;
  data: any;
  onDataChange: (data: any) => void;
}

interface UserInvitation {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  created_at: string;
  sent_at?: string;
  expires_at: string;
}

const roles = [
  { value: 'tenant_admin', label: 'Admin', description: 'Full access to tenant management' },
  { value: 'tenant_user', label: 'User', description: 'Standard user access' },
  { value: 'farmer', label: 'Farmer', description: 'Farmer-specific features' },
  { value: 'dealer', label: 'Dealer', description: 'Dealer-specific features' }
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
      const mappedInvitations: UserInvitation[] = (rawInvitations || []).map((invitation) => {
        // Safely parse the metadata JSONB field
        const metadata = invitation.metadata || {};
        return {
          id: invitation.id,
          email: invitation.email,
          first_name: metadata.first_name || '',
          last_name: metadata.last_name || '',
          role: metadata.role || 'tenant_user',
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
    const existingInvitation = invitations.find(
      inv => inv.email.toLowerCase() === newUser.email.toLowerCase() && 
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
    } catch (error) {
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
    } catch (error) {
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
        return <Mail className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'pending': { variant: 'outline' as const, text: 'Pending' },
      'sent': { variant: 'secondary' as const, text: 'Sent' },
      'accepted': { variant: 'default' as const, text: 'Accepted' },
      'expired': { variant: 'destructive' as const, text: 'Expired' },
      'cancelled': { variant: 'secondary' as const, text: 'Cancelled' },
      'failed': { variant: 'destructive' as const, text: 'Failed' }
    };
    const config = variants[status as keyof typeof variants] || variants.pending;
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const handleCompleteStep = () => {
    const stepData = {
      totalInvitations: invitations.length,
      sentInvitations: invitations.filter(inv => inv.status === 'sent').length,
      acceptedInvitations: invitations.filter(inv => inv.status === 'accepted').length,
      completedAt: new Date().toISOString()
    };

    onComplete(stepData);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Users & Roles Setup</h3>
        <p className="text-muted-foreground">
          Invite team members and configure their roles and permissions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              User Invitations
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite New User</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join this tenant
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
                  <Button 
                    onClick={handleInviteUser} 
                    disabled={isSending === newUser.email}
                    className="w-full"
                  >
                    {isSending === newUser.email ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading invitations...</div>
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No invitations sent yet. Click "Invite User" to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(invitation.status)}
                    <div>
                      <p className="font-medium text-sm">
                        {invitation.first_name} {invitation.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{invitation.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      {roles.find(r => r.value === invitation.role)?.label || invitation.role}
                    </Badge>
                    {getStatusBadge(invitation.status)}
                    <div className="flex items-center gap-1">
                      {invitation.status === 'failed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResendInvitation(invitation)}
                          disabled={isSending === invitation.id}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}
                      {invitation.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelInvitation(invitation.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleCompleteStep}>
          Complete Users & Roles Setup
        </Button>
      </div>
    </div>
  );
};

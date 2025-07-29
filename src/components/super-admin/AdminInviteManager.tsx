import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  UserPlus, 
  Send, 
  Loader2, 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Calendar,
  Shield,
  AlertTriangle,
  Copy,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Define AdminInvite interface locally
interface AdminInvite {
  id: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  invite_token: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  invited_by: string;
  accepted_at?: string;
  metadata?: Record<string, any>;
}

interface InviteAnalytics {
  invite_id: string;
  event_type: string;
  created_at: string;
  ip_address?: string;
}

export const AdminInviteManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    role: 'admin' as 'admin' | 'platform_admin' | 'super_admin'
  });

  // Fetch existing invites
  const { data: invites, isLoading: invitesLoading } = useQuery({
    queryKey: ['admin-invites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_invites')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AdminInvite[];
    }
  });

  // Fetch invite analytics
  const { data: analytics } = useQuery({
    queryKey: ['admin-invite-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_invite_analytics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as InviteAnalytics[];
    }
  });

  // Send invite mutation
  const sendInviteMutation = useMutation({
    mutationFn: async (inviteData: { email: string; role: string }) => {
      const response = await supabase.functions.invoke('send-admin-invite', {
        body: JSON.stringify({
          email: inviteData.email,
          role: inviteData.role,
          invitedBy: user?.id,
          organizationName: 'Platform Admin',
          primaryColor: '#2563eb'
        })
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invites'] });
      toast.success('Admin invitation sent successfully!');
      setIsDialogOpen(false);
      setFormData({ email: '', role: 'admin' });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send invitation');
    }
  });

  // Resend invite mutation
  const resendInviteMutation = useMutation({
    mutationFn: async (invite: AdminInvite) => {
      // Cancel old invite
      await supabase
        .from('admin_invites')
        .update({ status: 'cancelled' })
        .eq('id', invite.id);

      // Send new invite
      const response = await supabase.functions.invoke('send-admin-invite', {
        body: JSON.stringify({
          email: invite.email,
          role: invite.role,
          invitedBy: user?.id,
          organizationName: 'Platform Admin',
          primaryColor: '#2563eb'
        })
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invites'] });
      toast.success('Invitation resent successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to resend invitation');
    }
  });

  // Cancel invite mutation
  const cancelInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from('admin_invites')
        .update({ status: 'cancelled' })
        .eq('id', inviteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invites'] });
      toast.success('Invitation cancelled successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to cancel invitation');
    }
  });

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.role) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await sendInviteMutation.mutateAsync(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRole = (role: string) => {
    return role.replace('_', ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-3 h-3" />;
      case 'accepted': return <CheckCircle className="w-3 h-3" />;
      case 'expired': return <XCircle className="w-3 h-3" />;
      case 'cancelled': return <XCircle className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  const copyInviteLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/register?invite=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    toast.success('Invite link copied to clipboard');
  };

  const getInviteAnalytics = (inviteId: string) => {
    return analytics?.filter(a => a.invite_id === inviteId) || [];
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header with Send Invite Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Invitations</h2>
          <p className="text-gray-600 mt-1">Manage admin user invitations and access</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Send Invite
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Admin Invitation</DialogTitle>
              <DialogDescription>
                Send a secure invitation to grant admin access to a new user.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSendInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="admin@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Admin Role</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select admin role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div>
                        <div className="font-medium">Admin</div>
                        <div className="text-sm text-gray-500">Basic administrative access</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="platform_admin">
                      <div>
                        <div className="font-medium">Platform Admin</div>
                        <div className="text-sm text-gray-500">Advanced platform management</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="super_admin">
                      <div>
                        <div className="font-medium">Super Admin</div>
                        <div className="text-sm text-gray-500">Full system access and control</div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  The invitation will expire in 24 hours for security. The recipient will receive 
                  an email with instructions to complete their registration.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Invitations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Recent Invitations
          </CardTitle>
          <CardDescription>
            Track and manage admin invitation status and analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2">Loading invitations...</span>
            </div>
          ) : !invites || invites.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <UserPlus className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No admin invitations sent yet</p>
              <p className="text-sm">Send your first invitation to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => {
                  const inviteAnalytics = getInviteAnalytics(invite.id);
                  const hasBeenOpened = inviteAnalytics.some(a => a.event_type === 'opened');
                  const expired = isExpired(invite.expires_at);
                  
                  return (
                    <TableRow key={invite.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{invite.email}</span>
                          {hasBeenOpened && (
                            <Badge variant="outline" className="text-xs">
                              Opened
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {formatRole(invite.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(expired && invite.status === 'pending' ? 'expired' : invite.status)}>
                          {getStatusIcon(expired && invite.status === 'pending' ? 'expired' : invite.status)}
                          <span className="ml-1">
                            {expired && invite.status === 'pending' ? 'Expired' : invite.status}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="w-3 h-3" />
                          {new Date(invite.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">
                          {new Date(invite.expires_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {invite.status === 'pending' && !expired && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyInviteLink(invite.invite_token)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => resendInviteMutation.mutate(invite)}
                                disabled={resendInviteMutation.isPending}
                              >
                                <RefreshCw className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => cancelInviteMutation.mutate(invite.id)}
                                disabled={cancelInviteMutation.isPending}
                              >
                                <XCircle className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                          
                          {(expired || invite.status === 'expired') && invite.status !== 'accepted' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resendInviteMutation.mutate(invite)}
                              disabled={resendInviteMutation.isPending}
                            >
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Resend
                            </Button>
                          )}
                          
                          {invite.status === 'accepted' && (
                            <Badge variant="secondary" className="text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
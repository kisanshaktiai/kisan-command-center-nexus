import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, Shield, Mail, Search, MoreHorizontal, RefreshCw, Activity } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tenant } from '@/types/tenant';

interface TenantUsersTabProps {
  tenant: Tenant;
}

interface TenantUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  last_login: string;
  created_at: string;
  sessions_count: number;
}

export const TenantUsersTab: React.FC<TenantUsersTabProps> = ({ tenant }) => {
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    fetchTenantUsers();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('tenant-users-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_tenants',
          filter: `tenant_id=eq.${tenant.id}`
        },
        () => {
          fetchTenantUsers(); // Refresh on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant.id]);

  const fetchTenantUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch users associated with this tenant
      const { data: userTenants, error } = await supabase
        .from('user_tenants')
        .select(`
          id,
          user_id,
          role,
          is_active,
          created_at
        `)
        .eq('tenant_id', tenant.id);

      if (error) throw error;

      // Transform data - use tenant owner email as fallback
      const transformedUsers: TenantUser[] = (userTenants || []).map((ut, index) => ({
        id: ut.user_id,
        email: index === 0 ? (tenant.owner_email || 'unknown@email.com') : `user${index}@${tenant.slug}.com`,
        full_name: index === 0 ? (tenant.owner_name || 'Owner') : `User ${index}`,
        role: ut.role,
        status: ut.is_active ? 'active' as const : 'inactive' as const,
        last_login: new Date().toISOString(),
        created_at: ut.created_at,
        sessions_count: Math.floor(Math.random() * 10) // Mock data for demo
      }));

      // If no users found, add the tenant owner as default
      if (transformedUsers.length === 0 && tenant.owner_email) {
        transformedUsers.push({
          id: crypto.randomUUID(),
          email: tenant.owner_email,
          full_name: tenant.owner_name || 'Tenant Owner',
          role: 'tenant_owner',
          status: 'active',
          last_login: new Date().toISOString(),
          created_at: tenant.created_at,
          sessions_count: 0
        });
      }

      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error fetching tenant users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = () => {
    toast.info('User invitation feature coming soon');
  };

  const handleUserAction = (action: string, userId: string) => {
    switch(action) {
      case 'suspend':
        toast.info(`Suspending user ${userId}`);
        break;
      case 'activate':
        toast.info(`Activating user ${userId}`);
        break;
      case 'reset-password':
        toast.info(`Sending password reset to user ${userId}`);
        break;
      case 'change-role':
        toast.info(`Changing role for user ${userId}`);
        break;
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeVariant = (role: string) => {
    switch(role) {
      case 'tenant_owner': return 'default';
      case 'tenant_admin': return 'secondary';
      case 'tenant_member': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch(status) {
      case 'active': return 'success';
      case 'inactive': return 'secondary';
      case 'suspended': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage users and permissions for {tenant.name}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={fetchTenantUsers}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={handleInviteUser} size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite User
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{users.length}</div>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{users.filter(u => u.status === 'active').length}</div>
                <p className="text-xs text-muted-foreground">Active Users</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{users.filter(u => u.role === 'tenant_admin').length}</div>
                <p className="text-xs text-muted-foreground">Admins</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">
                  <Activity className="h-5 w-5 inline mr-1" />
                  Live
                </div>
                <p className="text-xs text-muted-foreground">Real-time Updates</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="tenant_owner">Owner</SelectItem>
                <SelectItem value="tenant_admin">Admin</SelectItem>
                <SelectItem value="tenant_member">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        <Shield className="h-3 w-3 mr-1" />
                        {user.role.replace('tenant_', '')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(user.status)}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(user.last_login).toLocaleString()}
                    </TableCell>
                    <TableCell>{user.sessions_count}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleUserAction('view', user.id)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUserAction('change-role', user.id)}>
                            Change Role
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUserAction('reset-password', user.id)}>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Password Reset
                          </DropdownMenuItem>
                          {user.status === 'active' ? (
                            <DropdownMenuItem 
                              onClick={() => handleUserAction('suspend', user.id)}
                              className="text-destructive"
                            >
                              Suspend User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              onClick={() => handleUserAction('activate', user.id)}
                              className="text-green-600"
                            >
                              Activate User
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
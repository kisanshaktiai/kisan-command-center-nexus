
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  UserPlus, 
  Shield, 
  Edit3, 
  Trash2, 
  RefreshCw, 
  Search,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateUserForm {
  email: string;
  password: string;
  full_name: string;
  role: string;
}

export const AdminUserManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const queryClient = useQueryClient();

  const [createForm, setCreateForm] = useState<CreateUserForm>({
    email: '',
    password: '',
    full_name: '',
    role: 'admin'
  });

  const [resetPasswordForm, setResetPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  // Fetch admin users
  const { data: adminUsers, isLoading, error } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AdminUser[];
    }
  });

  // Create admin user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserForm) => {
      const { data, error } = await supabase.functions.invoke('create-super-admin', {
        body: {
          email: userData.email,
          password: userData.password,
          fullName: userData.full_name,
          role: userData.role
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Admin user created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setIsCreateDialogOpen(false);
      setCreateForm({
        email: '',
        password: '',
        full_name: '',
        role: 'admin'
      });
    },
    onError: (error: any) => {
      toast.error(`Failed to create user: ${error.message}`);
    }
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Password reset successfully');
      setIsResetPasswordDialogOpen(false);
      setResetPasswordForm({ newPassword: '', confirmPassword: '' });
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast.error(`Failed to reset password: ${error.message}`);
    }
  });

  // Toggle user active status
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('User status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to update user status: ${error.message}`);
    }
  });

  // Filter users based on search and role
  const filteredUsers = adminUsers?.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const handleCreateUser = () => {
    if (!createForm.email || !createForm.password || !createForm.full_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (createForm.password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    createUserMutation.mutate(createForm);
  };

  const handleResetPassword = () => {
    if (!selectedUser) return;

    if (resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (resetPasswordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    resetPasswordMutation.mutate({
      userId: selectedUser.id,
      newPassword: resetPasswordForm.newPassword
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-500 text-white';
      case 'platform_admin':
        return 'bg-orange-500 text-white';
      case 'admin':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load admin users: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Admin User Management</h2>
          <p className="text-muted-foreground">
            Manage administrative users and their permissions
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Create Admin User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Admin User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Full Name</label>
                <Input
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Role</label>
                <Select value={createForm.role} onValueChange={(value) => setCreateForm(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="platform_admin">Platform Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={createForm.password}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Minimum 8 characters"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleCreateUser}
                  disabled={createUserMutation.isPending}
                  className="flex-1"
                >
                  {createUserMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <UserPlus className="w-4 h-4 mr-2" />
                  )}
                  Create User
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="platform_admin">Platform Admin</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Users ({filteredUsers?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.full_name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRoleBadgeColor(user.role)}>
                      {user.role.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? "default" : "secondary"}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setIsResetPasswordDialogOpen(true);
                        }}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleUserStatusMutation.mutate({
                          userId: user.id,
                          isActive: !user.is_active
                        })}
                        disabled={toggleUserStatusMutation.isPending}
                      >
                        <Shield className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">User</label>
              <Input
                value={selectedUser?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>
            <div>
              <label className="text-sm font-medium">New Password</label>
              <Input
                type="password"
                value={resetPasswordForm.newPassword}
                onChange={(e) => setResetPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Minimum 8 characters"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Confirm Password</label>
              <Input
                type="password"
                value={resetPasswordForm.confirmPassword}
                onChange={(e) => setResetPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleResetPassword}
                disabled={resetPasswordMutation.isPending}
                className="flex-1"
              >
                {resetPasswordMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Shield className="w-4 h-4 mr-2" />
                )}
                Reset Password
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsResetPasswordDialogOpen(false);
                  setSelectedUser(null);
                  setResetPasswordForm({ newPassword: '', confirmPassword: '' });
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

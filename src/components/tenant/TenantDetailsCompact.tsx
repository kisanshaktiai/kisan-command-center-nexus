import React, { useState, useEffect } from 'react';
import { Tenant } from '@/types/tenant';
import { User } from '@supabase/supabase-js';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreVertical, UserPlus, Mail, Loader2, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { authenticationService } from '@/services/AuthenticationService';
import { toast } from 'sonner';

interface TenantDetailsCompactProps {
  tenant: Tenant;
  onRefresh: () => void;
}

export const TenantDetailsCompact = ({ tenant, onRefresh }: TenantDetailsCompactProps) => {
  const { user } = useAuth();
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [userProfile, setUserProfile] = useState<User | null>(null);

  // Fix: Get actual user status from auth state - userStatus should include more states
  const userStatus = user?.user_metadata?.status || 'not_found';
  
  useEffect(() => {
    const fetchAdminUser = async () => {
      try {
        const adminUser = await authenticationService.getAdminUserForTenant(tenant.id);
        setUserProfile(adminUser);
      } catch (error) {
        console.error('Failed to fetch admin user:', error);
        setUserProfile(null);
      }
    };

    fetchAdminUser();
  }, [tenant.id]);

  const handleCreateUser = async () => {
    setIsCreatingUser(true);
    try {
      const newUser = await authenticationService.createTenantAdminUser(tenant.id);
      setUserProfile(newUser);
      toast.success('Admin user created successfully!');
      onRefresh();
    } catch (error) {
      console.error('Failed to create user:', error);
      toast.error('Failed to create admin user');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleSendInvite = async () => {
    try {
      await authenticationService.sendAdminInvite(tenant.id);
      toast.success('Invite sent successfully!');
    } catch (error) {
      console.error('Failed to send invite:', error);
      toast.error('Failed to send invite');
    }
  };

  const handleToggleStatus = async () => {
    setIsToggling(true);
    try {
      const newStatus = tenant.status === 'active' ? 'inactive' : 'active';
      await authenticationService.updateTenantStatus(tenant.id, newStatus);
      toast.success(`Tenant status updated to ${newStatus}`);
      onRefresh();
    } catch (error) {
      console.error('Failed to toggle status:', error);
      toast.error('Failed to toggle tenant status');
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">{tenant.name}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleStatus} disabled={isToggling}>
                {tenant.status === 'active' ? (
                  <>
                    <ToggleLeft className="h-4 w-4 mr-2" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <ToggleRight className="h-4 w-4 mr-2" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium">Slug</p>
            <p className="text-sm text-muted-foreground">{tenant.slug}</p>
          </div>
          <div>
            <p className="text-xs font-medium">Type</p>
            <p className="text-sm text-muted-foreground">{tenant.type}</p>
          </div>
          <div>
            <p className="text-xs font-medium">Status</p>
            <p className="text-sm text-muted-foreground">{tenant.status}</p>
          </div>
          <div>
            <p className="text-xs font-medium">Subscription</p>
            <p className="text-sm text-muted-foreground">{tenant.subscription_plan}</p>
          </div>
        </div>

        {/* Admin User Section */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm">Admin User</h4>
            {/* Fix: Update the condition to handle the actual user status types */}
            {(!user || userStatus === 'not_found' || userStatus === 'error') && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleCreateUser}
                disabled={isCreatingUser || userStatus === 'registering'}
                className="text-xs"
              >
                {isCreatingUser ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3 w-3 mr-1" />
                    Create User
                  </>
                )}
              </Button>
            )}
          </div>

          {userProfile ? (
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarImage src={`https://avatar.vercel.sh/${userProfile.email}.png`} />
                <AvatarFallback>{userProfile.email?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{userProfile.email}</p>
                <p className="text-xs text-muted-foreground">
                  <Mail className="h-3 w-3 mr-1 inline-block" />
                  {userProfile.email}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No admin user found.</p>
          )}

          {userProfile && (
            <Button size="sm" variant="secondary" onClick={handleSendInvite} className="mt-2 text-xs">
              Send Invite
            </Button>
          )}
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium text-sm">Metrics</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-medium">Farmers</p>
              <p className="text-sm text-muted-foreground">100 / 1000</p>
            </div>
            <div>
              <p className="text-xs font-medium">Dealers</p>
              <p className="text-sm text-muted-foreground">10 / 50</p>
            </div>
            <div>
              <p className="text-xs font-medium">Products</p>
              <p className="text-sm text-muted-foreground">50 / 100</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

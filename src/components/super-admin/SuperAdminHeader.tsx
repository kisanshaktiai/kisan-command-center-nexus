
import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, LogOut, User, Settings, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

interface SuperAdminHeaderProps {
  setSidebarOpen: (open: boolean) => void;
  adminUser: any;
}

export const SuperAdminHeader = ({ setSidebarOpen, adminUser }: SuperAdminHeaderProps) => {
  // Mock alerts count for now since we can't query super_admin schema directly
  const { data: alertsCount } = useQuery({
    queryKey: ['super-admin-alerts-count'],
    queryFn: async () => {
      // This would normally query super_admin.system_alerts
      // For now, return a mock count
      return 3;
    },
    refetchInterval: 30000,
  });

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Logged out successfully');
    } catch (error: any) {
      toast.error('Error logging out: ' + error.message);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-500 text-white';
      case 'platform_admin':
        return 'bg-orange-500 text-white';
      case 'security_admin':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'SA';
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <header className="bg-card border-b px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {/* Header content - hamburger button removed since it's now in sidebar */}
          <div className="ml-12 lg:ml-0">
            <h1 className="text-xl font-semibold text-foreground">
              Super Admin Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Platform management and monitoring
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Alerts Bell */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-5 h-5" />
            {alertsCount && alertsCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs"
              >
                {alertsCount > 99 ? '99+' : alertsCount}
              </Badge>
            )}
          </Button>

          {/* Admin User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {getInitials(adminUser.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium">{adminUser.full_name || 'Super Admin'}</p>
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${getRoleColor(adminUser.role || 'super_admin')}`}
                  >
                    {(adminUser.role || 'super_admin').replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium">{adminUser.full_name || 'Super Admin'}</p>
                  <p className="text-xs text-muted-foreground">{adminUser.email}</p>
                </div>
              </DropdownMenuLabel>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem>
                <User className="w-4 h-4 mr-2" />
                Profile Settings
              </DropdownMenuItem>
              
              <DropdownMenuItem>
                <Shield className="w-4 h-4 mr-2" />
                Security Settings
              </DropdownMenuItem>
              
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                Preferences
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={handleLogout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

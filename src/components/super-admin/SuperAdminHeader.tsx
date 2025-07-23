
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
import { Bell, LogOut, User, Settings, Shield, Menu } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

interface SuperAdminHeaderProps {
  setSidebarOpen: (open: boolean) => void;
  adminUser: any;
  sidebarOpen: boolean;
}

export const SuperAdminHeader = ({ setSidebarOpen, adminUser, sidebarOpen }: SuperAdminHeaderProps) => {
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
        return 'bg-gradient-to-r from-red-500 to-pink-500 text-white';
      case 'platform_admin':
        return 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white';
      case 'security_admin':
        return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
      default:
        return 'bg-gradient-to-r from-gray-500 to-slate-500 text-white';
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
    <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 px-4 py-4 sm:px-6 lg:px-8 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Hamburger Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-6 w-6" />
          </Button>

          {/* Desktop Sidebar Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Super Admin Dashboard
            </h1>
            <p className="text-sm text-slate-500">
              Platform management and monitoring
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Alerts Bell */}
          <Button variant="ghost" size="sm" className="relative text-slate-600 hover:text-slate-900 hover:bg-slate-100">
            <Bell className="w-5 h-5" />
            {alertsCount && alertsCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-gradient-to-r from-red-500 to-pink-500 border-0"
              >
                {alertsCount > 99 ? '99+' : alertsCount}
              </Badge>
            )}
          </Button>

          {/* Admin User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-3 hover:bg-slate-100 p-2 rounded-lg">
                <Avatar className="h-10 w-10 ring-2 ring-slate-200 ring-offset-2">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                    {getInitials(adminUser.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-slate-800">{adminUser.full_name || 'Super Admin'}</p>
                  <Badge 
                    variant="secondary" 
                    className={`text-xs font-medium ${getRoleColor(adminUser.role || 'super_admin')} border-0`}
                  >
                    {(adminUser.role || 'super_admin').replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-64 bg-white/95 backdrop-blur-sm border border-slate-200 shadow-xl">
              <DropdownMenuLabel className="bg-gradient-to-r from-slate-50 to-slate-100">
                <div>
                  <p className="font-semibold text-slate-800">{adminUser.full_name || 'Super Admin'}</p>
                  <p className="text-xs text-slate-500">{adminUser.email}</p>
                </div>
              </DropdownMenuLabel>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem className="hover:bg-slate-50 cursor-pointer">
                <User className="w-4 h-4 mr-3 text-slate-500" />
                <span className="text-slate-700">Profile Settings</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem className="hover:bg-slate-50 cursor-pointer">
                <Shield className="w-4 h-4 mr-3 text-slate-500" />
                <span className="text-slate-700">Security Settings</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem className="hover:bg-slate-50 cursor-pointer">
                <Settings className="w-4 h-4 mr-3 text-slate-500" />
                <span className="text-slate-700">Preferences</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={handleLogout}
                className="text-red-600 hover:bg-red-50 cursor-pointer focus:text-red-600"
              >
                <LogOut className="w-4 h-4 mr-3" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

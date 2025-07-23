
import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, LogOut, User, Settings, Menu } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SuperAdminHeaderProps {
  setSidebarOpen: (open: boolean) => void;
  adminUser: any;
  sidebarOpen: boolean;
}

export const SuperAdminHeader = ({ setSidebarOpen, adminUser, sidebarOpen }: SuperAdminHeaderProps) => {
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Logged out successfully');
    } catch (error: any) {
      toast.error('Error logging out: ' + error.message);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'AD';
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
              Admin Dashboard
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
          </Button>

          {/* Admin User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-3 hover:bg-slate-100 p-2 rounded-lg">
                <Avatar className="h-10 w-10 ring-2 ring-slate-200 ring-offset-2">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                    {getInitials(adminUser.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-slate-800">{adminUser.email}</p>
                  <p className="text-xs text-slate-500">Administrator</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-64 bg-white/95 backdrop-blur-sm border border-slate-200 shadow-xl">
              <DropdownMenuLabel className="bg-gradient-to-r from-slate-50 to-slate-100">
                <div>
                  <p className="font-semibold text-slate-800">{adminUser.email}</p>
                  <p className="text-xs text-slate-500">Administrator</p>
                </div>
              </DropdownMenuLabel>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem className="hover:bg-slate-50 cursor-pointer">
                <User className="w-4 h-4 mr-3 text-slate-500" />
                <span className="text-slate-700">Profile Settings</span>
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

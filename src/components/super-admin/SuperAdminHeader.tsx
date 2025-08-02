
import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, Bell, Search, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';

interface SuperAdminHeaderProps {
  setSidebarOpen: (open: boolean) => void;
  adminUser: any;
  sidebarOpen: boolean;
}

export function SuperAdminHeader({ setSidebarOpen, adminUser, sidebarOpen }: SuperAdminHeaderProps) {
  const { signOut } = useAuth();

  // Add keyboard shortcut for sidebar toggle
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        setSidebarOpen(!sidebarOpen);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [setSidebarOpen, sidebarOpen]);

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hover:bg-gray-100 transition-colors"
            title="Toggle sidebar (Ctrl+B)"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="hidden md:flex items-center gap-2">
            <h1 className="text-xl font-semibold text-gray-900">
              Super Admin Dashboard
            </h1>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Live
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="hover:bg-gray-100">
            <Search className="h-4 w-4" />
          </Button>
          
          <Button variant="ghost" size="sm" className="relative hover:bg-gray-100">
            <Bell className="h-4 w-4" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 text-xs bg-red-500 text-white rounded-full flex items-center justify-center">
              3
            </Badge>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:bg-gray-100">
                <User className="h-4 w-4" />
                <span className="hidden md:inline text-sm font-medium">
                  {adminUser?.full_name || adminUser?.email}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <User className="h-4 w-4 mr-2" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-red-600 focus:text-red-600">
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

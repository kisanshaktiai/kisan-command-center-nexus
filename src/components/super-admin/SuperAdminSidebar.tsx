
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Settings,
  Brain,
  Activity,
  HeadphonesIcon,
  Database,
  GitBranch,
  Shield,
  FileBarChart,
  X,
  Users,
  AlertTriangle,
  Flag,
  Wrench
} from 'lucide-react';

interface SuperAdminSidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const navigation = [
  {
    name: 'Overview',
    href: '/super-admin',
    icon: LayoutDashboard,
    end: true
  },
  {
    name: 'Tenant Management',
    href: '/super-admin/tenants',
    icon: Building2
  },
  {
    name: 'User Management',
    href: '/super-admin/users',
    icon: Users
  },
  {
    name: 'Subscriptions & Billing',
    href: '/super-admin/billing',
    icon: CreditCard
  },
  {
    name: 'System Alerts',
    href: '/super-admin/alerts',
    icon: AlertTriangle
  },
  {
    name: 'Feature Flags',
    href: '/super-admin/features',
    icon: Flag
  },
  {
    name: 'Platform Configuration',
    href: '/super-admin/config',
    icon: Settings
  },
  {
    name: 'AI Model Management',
    href: '/super-admin/ai-models',
    icon: Brain
  },
  {
    name: 'System Monitoring',
    href: '/super-admin/monitoring',
    icon: Activity
  },
  {
    name: 'Support Tickets',
    href: '/super-admin/support',
    icon: HeadphonesIcon
  },
  {
    name: 'Database Management',
    href: '/super-admin/database',
    icon: Database
  },
  {
    name: 'DevOps Tools',
    href: '/super-admin/devops',
    icon: GitBranch
  },
  {
    name: 'Security & Compliance',
    href: '/super-admin/security',
    icon: Shield
  },
  {
    name: 'Analytics & Reports',
    href: '/super-admin/analytics',
    icon: FileBarChart
  },
  {
    name: 'System Maintenance',
    href: '/super-admin/maintenance',
    icon: Wrench
  }
];

export const SuperAdminSidebar = ({ open, setOpen }: SuperAdminSidebarProps) => {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div 
          className="fixed inset-0 z-40 lg:hidden bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <div className="flex items-center space-x-2">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-lg font-bold">Super Admin</h1>
              <p className="text-xs text-muted-foreground">KisanShaktiAI</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {navigation.map((item) => {
              const isActive = item.end 
                ? location.pathname === item.href
                : location.pathname.startsWith(item.href);
              
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  onClick={() => setOpen(false)}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
        </ScrollArea>
        
        <Separator />
        
        <div className="p-4">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>System Operational</span>
          </div>
        </div>
      </div>
    </>
  );
};

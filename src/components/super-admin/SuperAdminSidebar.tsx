
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Home, 
  Users, 
  UserPlus, 
  CreditCard, 
  DollarSign,
  Flag, 
  Palette, 
  Activity,
  Settings,
  ChevronDown,
  LogOut,
  Shield,
  Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';

const navigationItems = [
  {
    title: 'Platform Management',
    items: [
      { title: 'Overview', tab: 'overview', route: '/super-admin/overview', icon: Home },
      { title: 'Tenant Management', tab: 'tenant-management', route: '/super-admin/tenant-management', icon: Users },
      { title: 'Lead Management', tab: 'lead-management', route: '/super-admin/lead-management', icon: Briefcase },
      { title: 'Admin Users', tab: 'admin-user-management', route: '/super-admin/admin-user-management', icon: Shield },
      { title: 'Platform Monitoring', tab: 'platform-monitoring', route: '/super-admin/platform-monitoring', icon: Activity },
    ]
  },
  {
    title: 'Billing & Revenue',
    items: [
      { title: 'Billing Management', tab: 'billing-management', route: '/super-admin/billing-management', icon: CreditCard },
    ]
  }
];

interface SuperAdminSidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function SuperAdminSidebar({ isOpen, setIsOpen, activeTab, onTabChange }: SuperAdminSidebarProps) {
  const { signOut } = useAuth();
  const [openGroups, setOpenGroups] = useState<string[]>(['Platform Management']);
  const location = useLocation();

  const toggleGroup = (groupTitle: string) => {
    setOpenGroups(prev => 
      prev.includes(groupTitle) 
        ? prev.filter(title => title !== groupTitle)
        : [...prev, groupTitle]
    );
  };

  const closeSidebar = () => setIsOpen(false);

  const handleSignOut = async () => {
    await signOut();
    closeSidebar();
  };

  const handleTabClick = (tab: string) => {
    onTabChange(tab);
    if (window.innerWidth < 1024) {
      closeSidebar();
    }
  };

  const NavItem = ({ item }: { item: any }) => {
    const isActive = location.pathname === item.route;
    
    const itemContent = (
      <Link
        to={item.route}
        onClick={() => handleTabClick(item.tab)}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group w-full text-left",
          isActive
            ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
            : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
        )}
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        {isOpen && (
          <span className="transition-opacity duration-200">
            {item.title}
          </span>
        )}
        {isActive && isOpen && (
          <div className="w-2 h-2 bg-white rounded-full ml-auto" />
        )}
      </Link>
    );

    if (!isOpen) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {itemContent}
            </TooltipTrigger>
            <TooltipContent side="right" className="ml-2">
              {item.title}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return itemContent;
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700 shadow-2xl transform transition-all duration-300 ease-in-out",
        isOpen ? "w-72" : "w-16",
        "translate-x-0"
      )}>
        {/* Header */}
        <div className="border-b border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Settings className="w-5 h-5 text-white" />
            </div>
            {isOpen && (
              <div className="transition-opacity duration-200">
                <h2 className="font-bold text-white text-lg">Super Admin</h2>
                <p className="text-xs text-slate-300">Platform Management</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {navigationItems.map((group) => (
            <div key={group.title}>
              {isOpen ? (
                <Collapsible
                  open={openGroups.includes(group.title)}
                  onOpenChange={() => toggleGroup(group.title)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-3 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200"
                    >
                      <span className="text-xs font-semibold uppercase tracking-wider">
                        {group.title}
                      </span>
                      <ChevronDown className={cn(
                        "w-4 h-4 transition-transform duration-200",
                        openGroups.includes(group.title) && "transform rotate-180"
                      )} />
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="space-y-1 mt-2">
                    {group.items.map((item) => (
                      <NavItem key={item.title} item={item} />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <NavItem key={item.title} item={item} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer - Sign Out */}
        <div className="border-t border-slate-700 p-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 text-sm text-slate-300 hover:text-white transition-colors duration-200 p-3 rounded-lg hover:bg-slate-700/50",
                    !isOpen && "justify-center px-3"
                  )}
                >
                  <LogOut className="w-4 h-4" />
                  {isOpen && (
                    <span className="transition-opacity duration-200">
                      Sign Out
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              {!isOpen && (
                <TooltipContent side="right" className="ml-2">
                  Sign Out
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </>
  );
}

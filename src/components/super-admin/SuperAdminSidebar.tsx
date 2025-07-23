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
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';

const navigationItems = [
  {
    title: 'Platform Management',
    items: [
      { title: 'Overview', href: '/super-admin', icon: Home },
      { title: 'Tenant Management', href: '/super-admin/tenants', icon: Users },
      { title: 'Tenant Onboarding', href: '/super-admin/onboarding', icon: UserPlus },
      { title: 'Platform Monitoring', href: '/super-admin/monitoring', icon: Activity },
    ]
  },
  {
    title: 'Billing & Revenue',
    items: [
      { title: 'Subscription Management', href: '/super-admin/subscriptions', icon: CreditCard },
      { title: 'Billing & Payments', href: '/super-admin/billing', icon: DollarSign },
    ]
  },
  {
    title: 'Configuration',
    items: [
      { title: 'Feature Flags', href: '/super-admin/features', icon: Flag },
      { title: 'White Label Config', href: '/super-admin/white-label', icon: Palette },
    ]
  }
];

interface SuperAdminSidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function SuperAdminSidebar({ isOpen, setIsOpen }: SuperAdminSidebarProps) {
  const location = useLocation();
  const { signOut } = useAuth();
  const [openGroups, setOpenGroups] = useState<string[]>(['Platform Management']);

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

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700 shadow-2xl transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:shadow-xl",
        isOpen ? "translate-x-0" : "-translate-x-full lg:w-16"
      )}>
        {/* Header */}
        <div className="border-b border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Settings className="w-5 h-5 text-white" />
            </div>
            {(isOpen || window.innerWidth >= 1024) && (
              <div className={cn("transition-opacity duration-200", !isOpen && "lg:opacity-0 lg:w-0 lg:overflow-hidden")}>
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
              <Collapsible
                open={openGroups.includes(group.title)}
                onOpenChange={() => toggleGroup(group.title)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-between p-3 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200",
                      (!isOpen && window.innerWidth >= 1024) && "lg:justify-center lg:px-2"
                    )}
                  >
                    {(isOpen || window.innerWidth < 1024) && (
                      <>
                        <span className="text-xs font-semibold uppercase tracking-wider">
                          {group.title}
                        </span>
                        <ChevronDown className={cn(
                          "w-4 h-4 transition-transform duration-200",
                          openGroups.includes(group.title) && "transform rotate-180"
                        )} />
                      </>
                    )}
                    {(!isOpen && window.innerWidth >= 1024) && (
                      <div className="w-2 h-2 bg-slate-400 rounded-full" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="space-y-1 mt-2">
                  {group.items.map((item) => (
                    <Link
                      key={item.title}
                      to={item.href}
                      onClick={closeSidebar}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group",
                        location.pathname === item.href
                          ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                          : "text-slate-300 hover:bg-slate-700/50 hover:text-white",
                        (!isOpen && window.innerWidth >= 1024) && "lg:justify-center lg:px-3"
                      )}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {(isOpen || window.innerWidth < 1024) && (
                        <span className={cn(
                          "transition-opacity duration-200",
                          (!isOpen && window.innerWidth >= 1024) && "lg:opacity-0 lg:w-0 lg:overflow-hidden"
                        )}>
                          {item.title}
                        </span>
                      )}
                      {location.pathname === item.href && (
                        <div className="w-2 h-2 bg-white rounded-full ml-auto" />
                      )}
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </div>
          ))}
        </div>

        {/* Footer - Sign Out */}
        <div className="border-t border-slate-700 p-4">
          <Button
            onClick={handleSignOut}
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 text-sm text-slate-300 hover:text-white transition-colors duration-200 p-3 rounded-lg hover:bg-slate-700/50",
              (!isOpen && window.innerWidth >= 1024) && "lg:justify-center lg:px-3"
            )}
          >
            <LogOut className="w-4 h-4" />
            {(isOpen || window.innerWidth < 1024) && (
              <span className={cn(
                "transition-opacity duration-200",
                (!isOpen && window.innerWidth >= 1024) && "lg:opacity-0 lg:w-0 lg:overflow-hidden"
              )}>
                Sign Out
              </span>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}

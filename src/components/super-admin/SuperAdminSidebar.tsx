
import React from 'react';
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
  ChevronLeft,
  Settings
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';

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

export function SuperAdminSidebar() {
  const location = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Settings className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold">Super Admin</h2>
            <p className="text-xs text-muted-foreground">Platform Management</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navigationItems.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.href}
                    >
                      <Link to={item.href} className="flex items-center gap-2">
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <Link 
          to="/" 
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Application
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}

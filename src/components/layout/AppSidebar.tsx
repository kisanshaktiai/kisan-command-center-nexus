
import React from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  UserPlus, 
  CreditCard, 
  Receipt, 
  Flag, 
  Palette, 
  Activity,
  Settings,
  LogOut
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';

const navigationItems = [
  {
    title: 'Overview',
    url: '/super-admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Tenant Management',
    url: '/super-admin/tenants',
    icon: Building2,
  },
  {
    title: 'Tenant Onboarding',
    url: '/super-admin/onboarding',
    icon: UserPlus,
  },
  {
    title: 'Subscriptions',
    url: '/super-admin/subscriptions',
    icon: CreditCard,
  },
  {
    title: 'Billing',
    url: '/super-admin/billing',
    icon: Receipt,
  },
  {
    title: 'Feature Flags',
    url: '/super-admin/features',
    icon: Flag,
  },
  {
    title: 'White Label',
    url: '/super-admin/white-label',
    icon: Palette,
  },
  {
    title: 'Monitoring',
    url: '/super-admin/monitoring',
    icon: Activity,
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const { user, profile, signOut } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = profile?.full_name || user?.email || 'Admin User';

  return (
    <Sidebar collapsible="icon" className="border-r bg-background">
      <SidebarHeader className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">KS</span>
          </div>
          {state === 'expanded' && (
            <div className="flex flex-col">
              <h2 className="font-semibold text-foreground">KisanShakti</h2>
              <p className="text-xs text-muted-foreground">Admin Portal</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Platform Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                    className="w-full"
                  >
                    <NavLink to={item.url} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors">
                      <item.icon className="h-4 w-4" />
                      {state === 'expanded' && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t px-3 py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 px-3 py-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url} alt={displayName} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              {state === 'expanded' && (
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-medium truncate">{displayName}</span>
                  <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                </div>
              )}
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={signOut}
                className="w-full justify-start"
              >
                <LogOut className="h-4 w-4" />
                {state === 'expanded' && <span>Sign Out</span>}
              </Button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

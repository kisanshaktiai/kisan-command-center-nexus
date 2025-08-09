
import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEnhancedTenant } from '@/contexts/EnhancedTenantContext';
import { useRBAC } from '@/components/rbac/RBACGuard';
import { UserRole, Permission } from '@/services/EnhancedRBACService';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Users,
  Settings,
  BarChart3,
  CreditCard,
  Shield,
  Home,
  Sprout,
  Package,
  TrendingUp,
  Bell,
  ChevronDown,
  LogOut,
  User,
  Palette
} from 'lucide-react';

interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  roles?: UserRole[];
  permissions?: Permission[];
  requireTenant?: boolean;
  children?: NavigationItem[];
}

const navigationConfig: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/',
    icon: Home,
  },
  {
    id: 'system',
    label: 'System Management',
    href: '/system',
    icon: Shield,
    roles: [UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN],
    children: [
      {
        id: 'tenants',
        label: 'Tenants',
        href: '/super-admin/tenants',
        icon: Building2,
        permissions: [Permission.TENANT_READ],
      },
      {
        id: 'admins',
        label: 'Administrators',
        href: '/super-admin/admins',
        icon: Users,
        permissions: [Permission.ADMIN_READ],
      },
      {
        id: 'system-analytics',
        label: 'System Analytics',
        href: '/super-admin/analytics',
        icon: BarChart3,
        permissions: [Permission.ANALYTICS_ADMIN],
      },
      {
        id: 'system-settings',
        label: 'System Settings',
        href: '/super-admin/settings',
        icon: Settings,
        permissions: [Permission.SYSTEM_CONFIG],
      },
    ],
  },
  {
    id: 'tenant-management',
    label: 'Tenant Management',
    href: '/tenant',
    icon: Building2,
    requireTenant: true,
    roles: [UserRole.TENANT_ADMIN, UserRole.TENANT_USER],
    children: [
      {
        id: 'tenant-overview',
        label: 'Overview',
        href: '/tenant/overview',
        icon: Home,
        requireTenant: true,
      },
      {
        id: 'tenant-users',
        label: 'Users',
        href: '/tenant/users',
        icon: Users,
        permissions: [Permission.USER_READ],
        requireTenant: true,
      },
      {
        id: 'tenant-farmers',
        label: 'Farmers',
        href: '/tenant/farmers',
        icon: Sprout,
        requireTenant: true,
      },
      {
        id: 'tenant-dealers',
        label: 'Dealers',
        href: '/tenant/dealers',
        icon: Package,
        requireTenant: true,
      },
      {
        id: 'tenant-analytics',
        label: 'Analytics',
        href: '/tenant/analytics',
        icon: TrendingUp,
        permissions: [Permission.ANALYTICS_READ],
        requireTenant: true,
      },
      {
        id: 'tenant-billing',
        label: 'Billing',
        href: '/tenant/billing',
        icon: CreditCard,
        permissions: [Permission.BILLING_READ],
        requireTenant: true,
      },
      {
        id: 'tenant-settings',
        label: 'Settings',
        href: '/tenant/settings',
        icon: Settings,
        permissions: [Permission.TENANT_UPDATE],
        requireTenant: true,
      },
    ],
  },
];

const EnhancedSidebar: React.FC = () => {
  const { collapsed } = useSidebar();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { currentTenant, availableTenants, switchTenant } = useEnhancedTenant();
  const { hasRole, hasPermission, context } = useRBAC();

  const shouldShowItem = (item: NavigationItem): boolean => {
    // Check roles
    if (item.roles && !hasRole(item.roles)) {
      return false;
    }

    // Check permissions
    if (item.permissions && !item.permissions.some(p => hasPermission(p))) {
      return false;
    }

    // Check tenant requirement
    if (item.requireTenant && !currentTenant) {
      return false;
    }

    return true;
  };

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const renderMenuItem = (item: NavigationItem) => {
    if (!shouldShowItem(item)) return null;

    const Icon = item.icon;
    const active = isActive(item.href);

    return (
      <SidebarMenuItem key={item.id}>
        <SidebarMenuButton asChild>
          <NavLink
            to={item.href}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {!collapsed && (
              <>
                <span>{item.label}</span>
                {item.badge && <Badge variant="secondary" className="ml-auto">{item.badge}</Badge>}
              </>
            )}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const renderMenuGroup = (items: NavigationItem[], title?: string) => {
    const visibleItems = items.filter(shouldShowItem);
    if (visibleItems.length === 0) return null;

    return (
      <SidebarGroup key={title}>
        {title && !collapsed && <SidebarGroupLabel>{title}</SidebarGroupLabel>}
        <SidebarGroupContent>
          <SidebarMenu>
            {visibleItems.map(item => {
              if (item.children) {
                return renderMenuGroup(item.children, item.label);
              }
              return renderMenuItem(item);
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar className={collapsed ? 'w-16' : 'w-64'} collapsible>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Building2 className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex-1">
              <h3 className="font-semibold text-sm">
                {currentTenant?.branding?.app_name || 'Kisan Platform'}
              </h3>
              {currentTenant && (
                <p className="text-xs text-muted-foreground">{currentTenant.name}</p>
              )}
            </div>
          )}
        </div>
      </div>

      <SidebarContent>
        {/* Tenant Selector */}
        {!collapsed && availableTenants.length > 1 && (
          <div className="p-4 border-b">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="truncate">{currentTenant?.name || 'Select Tenant'}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Switch Tenant</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableTenants.map(tenant => (
                  <DropdownMenuItem
                    key={tenant.id}
                    onClick={() => switchTenant(tenant.id)}
                    className={currentTenant?.id === tenant.id ? 'bg-muted' : ''}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span>{tenant.name}</span>
                      {currentTenant?.id === tenant.id && (
                        <Badge variant="outline" className="ml-auto">Current</Badge>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Navigation */}
        <div className="flex-1 overflow-auto">
          {renderMenuGroup(navigationConfig)}
        </div>

        {/* User Menu */}
        <div className="p-4 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start p-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback>
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="ml-3 text-left flex-1">
                    <p className="text-sm font-medium">
                      {user?.user_metadata?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {context?.userRole?.replace('_', ' ') || 'User'}
                    </p>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <NavLink to="/profile">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink to="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </NavLink>
              </DropdownMenuItem>
              {hasPermission(Permission.TENANT_CONFIG) && (
                <DropdownMenuItem asChild>
                  <NavLink to="/tenant/branding">
                    <Palette className="mr-2 h-4 w-4" />
                    Branding
                  </NavLink>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

const EnhancedHeader: React.FC = () => {
  const { user } = useAuth();
  const { currentTenant } = useEnhancedTenant();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <div>
          <h1 className="text-lg font-semibold">
            {currentTenant?.name || 'Platform'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {user?.user_metadata?.full_name || user?.email}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setNotificationsOpen(!notificationsOpen)}
        >
          <Bell className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
};

export const EnhancedNavigation: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <EnhancedSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <EnhancedHeader />
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

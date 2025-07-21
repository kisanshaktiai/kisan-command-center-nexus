
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
  ChevronLeft,
  Settings,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Hamburger Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={toggleSidebar}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:shadow-none",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="border-b p-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Settings className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold">Super Admin</h2>
              <p className="text-xs text-muted-foreground">Platform Management</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-4">
          {navigationItems.map((group) => (
            <div key={group.title} className="mb-6">
              <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.title}
              </h3>
              <nav className="space-y-1">
                {group.items.map((item) => (
                  <Link
                    key={item.title}
                    to={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      location.pathname === item.href
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t p-4">
          <Link 
            to="/" 
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Application
          </Link>
        </div>
      </div>
    </>
  );
}

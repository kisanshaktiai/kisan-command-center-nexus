
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  BarChart3, 
  Building, 
  Users, 
  Shield,
  CreditCard, 
  DollarSign, 
  Settings, 
  Palette, 
  Activity,
  UserPlus
} from 'lucide-react';

const navigation = [
  { name: 'Overview', href: '/super-admin/overview', icon: BarChart3 },
  { name: 'Tenants', href: '/super-admin/tenants', icon: Building },
  { name: 'Tenant Onboarding', href: '/super-admin/tenant-onboarding', icon: UserPlus },
  { name: 'Admin Management', href: '/super-admin/admin-management', icon: Shield },
  { name: 'Subscriptions', href: '/super-admin/subscriptions', icon: CreditCard },
  { name: 'Billing', href: '/super-admin/billing', icon: DollarSign },
  { name: 'Feature Flags', href: '/super-admin/feature-flags', icon: Settings },
  { name: 'White Label', href: '/super-admin/white-label', icon: Palette },
  { name: 'Monitoring', href: '/super-admin/monitoring', icon: Activity },
];

export const SuperAdminSidebar: React.FC = () => {
  const location = useLocation();

  return (
    <div className="w-64 bg-muted/40 border-r">
      <div className="p-6">
        <h2 className="text-lg font-semibold">Super Admin</h2>
      </div>
      
      <nav className="space-y-1 px-3">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

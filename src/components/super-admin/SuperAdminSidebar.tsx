
import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  Settings, 
  CreditCard, 
  Flag,
  Activity,
  BarChart3, 
  Bell, 
  FileText, 
  Puzzle, 
  Shield, 
  Globe
} from 'lucide-react';

interface SuperAdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const SuperAdminSidebar: React.FC<SuperAdminSidebarProps> = ({ 
  activeSection, 
  onSectionChange 
}) => {
  const menuItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
      description: 'Platform overview and statistics'
    },
    {
      id: 'tenant-management',
      label: 'Tenant Management',
      icon: Users,
      description: 'Manage tenant accounts and settings'
    },
    {
      id: 'tenant-onboarding',
      label: 'Tenant Onboarding',
      icon: UserPlus,
      description: 'Onboard new tenants'
    },
    {
      id: 'white-label-config',
      label: 'White Label Config',
      icon: Settings,
      description: 'Customize tenant branding'
    },
    {
      id: 'subscription-management',
      label: 'Subscription Management',
      icon: CreditCard,
      description: 'Manage subscriptions and billing'
    },
    {
      id: 'feature-flags',
      label: 'Feature Flags',
      icon: Flag,
      description: 'Control feature rollouts'
    },
    {
      id: 'platform-monitoring',
      label: 'Platform Monitoring',
      icon: Activity,
      description: 'Monitor system health and analytics'
    },
    {
      id: 'analytics',
      label: 'Platform Analytics',
      icon: BarChart3,
      description: 'Detailed analytics and insights'
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      description: 'System notifications and alerts'
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileText,
      description: 'Generate and view reports'
    },
    {
      id: 'integrations',
      label: 'Integrations',
      icon: Puzzle,
      description: 'Manage third-party integrations'
    },
    {
      id: 'system-health',
      label: 'System Health',
      icon: Activity,
      description: 'Monitor system performance'
    },
    {
      id: 'security',
      label: 'Security',
      icon: Shield,
      description: 'Security settings and monitoring'
    },
    {
      id: 'global-settings',
      label: 'Global Settings',
      icon: Globe,
      description: 'Platform-wide settings'
    }
  ];

  return (
    <div className="p-4 space-y-2">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Super Admin</h2>
        <p className="text-sm text-gray-600">Platform management and monitoring</p>
      </div>
      
      <nav className="space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.id}
              variant={activeSection === item.id ? "default" : "ghost"}
              className={cn(
                "w-full justify-start h-auto p-3 text-left",
                activeSection === item.id && "bg-primary text-primary-foreground"
              )}
              onClick={() => onSectionChange(item.id)}
            >
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs opacity-75 mt-1">{item.description}</div>
                </div>
              </div>
            </Button>
          );
        })}
      </nav>
    </div>
  );
};

export default SuperAdminSidebar;

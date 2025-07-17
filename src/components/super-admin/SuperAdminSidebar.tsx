
import React from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  LayoutDashboard, 
  Users, 
  Settings,
  BarChart3,
  Shield,
  Database,
  Globe,
  CreditCard,
  GitBranch,
  UserPlus,
  Palette,
  FileText,
  Package,
  Bell
} from "lucide-react";

interface SuperAdminSidebarProps {
  className?: string;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const sidebarItems = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    description: 'Platform overview and key metrics'
  },
  {
    id: 'tenant-management',
    label: 'Tenant Management',
    icon: Users,
    description: 'Manage tenant accounts and organizations'
  },
  {
    id: 'tenant-onboarding',
    label: 'Tenant Onboarding',
    icon: UserPlus,
    description: 'Onboarding workflows and automation'
  },
  {
    id: 'white-label-config',
    label: 'White-Label Config',
    icon: Palette,
    description: 'Branding and customization settings'
  },
  {
    id: 'subscription-management',
    label: 'Subscription Management',
    icon: CreditCard,
    description: 'Plans, billing, and subscriptions'
  },
  {
    id: 'feature-flags',
    label: 'Feature Flags',
    icon: GitBranch,
    description: 'Feature toggles and A/B testing'
  },
  {
    id: 'analytics',
    label: 'Platform Analytics',
    icon: BarChart3,
    description: 'Usage analytics and insights'
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    description: 'System alerts and notifications'
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
    icon: Package,
    description: 'Third-party integrations'
  },
  {
    id: 'system-health',
    label: 'System Health',
    icon: Database,
    description: 'System monitoring and health'
  },
  {
    id: 'security',
    label: 'Security',
    icon: Shield,
    description: 'Security settings and audit logs'
  },
  {
    id: 'global-settings',
    label: 'Global Settings',
    icon: Settings,
    description: 'System-wide configuration'
  }
];

export default function SuperAdminSidebar({ 
  className, 
  activeSection, 
  onSectionChange 
}: SuperAdminSidebarProps) {
  return (
    <div className={cn("pb-12", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Super Admin
          </h2>
          <ScrollArea className="h-[600px] px-1">
            <div className="space-y-1">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    variant={activeSection === item.id ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start h-auto p-3",
                      activeSection === item.id && "bg-muted font-medium"
                    )}
                    onClick={() => onSectionChange(item.id)}
                  >
                    <Icon className="mr-3 h-4 w-4 flex-shrink-0" />
                    <div className="text-left">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.description}
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

import {
  Users,
  Building2,
  BarChart3,
  Settings,
  Shield,
  CreditCard,
  Database,
  Bell,
  Flag,
  Palette,
  UserPlus,
  Briefcase
} from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  description?: string;
}

export const navItems: NavItem[] = [
  {
    title: "Overview",
    url: "/super-admin",
    icon: BarChart3,
    roles: ["super_admin", "platform_admin"],
    description: "System overview and metrics"
  },
  {
    title: "Tenant Management",
    url: "/super-admin/tenant-management",
    icon: Building2,
    roles: ["super_admin", "platform_admin"],
    description: "Manage tenant organizations"
  },
  {
    title: "Tenant Onboarding",
    url: "/super-admin/tenant-onboarding",
    icon: UserPlus,
    roles: ["super_admin", "platform_admin"],
    description: "Standard tenant onboarding workflows"
  },
  {
    title: "Enhanced Onboarding",
    url: "/super-admin/enhanced-onboarding",
    icon: Briefcase,
    roles: ["super_admin", "platform_admin"],
    description: "Advanced onboarding workflow management"
  },
  {
    title: "Admin Users",
    url: "/super-admin/admin-users",
    icon: Users,
    roles: ["super_admin", "platform_admin"],
    description: "Manage admin users and permissions"
  },
  {
    title: "Lead Management",
    url: "/super-admin/leads",
    icon: Database,
    roles: ["super_admin", "platform_admin"],
    description: "Manage platform leads"
  },
  {
    title: "Billing Management",
    url: "/super-admin/billing",
    icon: CreditCard,
    roles: ["super_admin", "platform_admin"],
    description: "Billing and subscription management"
  },
  {
    title: "Subscription Management",
    url: "/super-admin/subscriptions",
    icon: CreditCard,
    roles: ["super_admin", "platform_admin"],
    description: "Manage tenant subscriptions"
  },
  {
    title: "Platform Monitoring",
    url: "/super-admin/monitoring",
    icon: BarChart3,
    roles: ["super_admin", "platform_admin"],
    description: "System performance and monitoring"
  },
  {
    title: "Feature Flags",
    url: "/super-admin/feature-flags",
    icon: Flag,
    roles: ["super_admin"],
    description: "Manage feature flags and rollouts"
  },
  {
    title: "White Label Config",
    url: "/super-admin/white-label",
    icon: Palette,
    roles: ["super_admin"],
    description: "White label configuration"
  }
];

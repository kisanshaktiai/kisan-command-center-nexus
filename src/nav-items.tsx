
import {
  User,
  Settings,
  Users,
  Shield,
  Home,
  FileText,
  TrendingUp,
  Building2,
  UserPlus,
  CreditCard,
  ToggleLeft,
  Palette,
  Bell,
  Database,
  BarChart3,
  UserCheck,
  Monitor,
  Trash2
} from "lucide-react";

export const navItems = [
  {
    title: "Overview",
    to: "/super-admin",
    icon: <Home className="h-4 w-4" />,
    variant: "default" as const,
  },
  {
    title: "Tenant Management",
    to: "/super-admin/tenant-management",
    icon: <Building2 className="h-4 w-4" />,
    variant: "ghost" as const,
  },
  {
    title: "Lead Management",
    to: "/super-admin/lead-management",
    icon: <UserCheck className="h-4 w-4" />,
    variant: "ghost" as const,
  },
  {
    title: "User Management",
    to: "/super-admin/admin-user-management",
    icon: <Users className="h-4 w-4" />,
    variant: "ghost" as const,
  },
  {
    title: "Tenant Onboarding",
    to: "/super-admin/tenant-onboarding",
    icon: <UserPlus className="h-4 w-4" />,
    variant: "ghost" as const,
  },
  {
    title: "Billing Management",
    to: "/super-admin/billing-management",
    icon: <CreditCard className="h-4 w-4" />,
    variant: "ghost" as const,
  },
  {
    title: "Subscription Management",
    to: "/super-admin/subscription-management",
    icon: <FileText className="h-4 w-4" />,
    variant: "ghost" as const,
  },
  {
    title: "Platform Monitoring",
    to: "/super-admin/platform-monitoring",
    icon: <Monitor className="h-4 w-4" />,
    variant: "ghost" as const,
  },
  {
    title: "Feature Flags",
    to: "/super-admin/feature-flags",
    icon: <ToggleLeft className="h-4 w-4" />,
    variant: "ghost" as const,
  },
  {
    title: "White Label Config",
    to: "/super-admin/white-label-config",
    icon: <Palette className="h-4 w-4" />,
    variant: "ghost" as const,
  },
  {
    title: "Data Management",
    to: "/super-admin/data-management",
    icon: <Database className="h-4 w-4" />,
    variant: "ghost" as const,
  },
];

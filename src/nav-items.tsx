
import { Home, Users, Building2, CreditCard, Settings, Activity, UserPlus, Briefcase } from "lucide-react";

export const navItems = [
  {
    title: "Overview",
    to: "/super-admin/overview",
    icon: <Home className="h-4 w-4" />,
    page: <div>Overview placeholder</div>,
  },
  {
    title: "Tenant Management",
    to: "/super-admin/tenant-management",
    icon: <Building2 className="h-4 w-4" />,
    page: <div>Tenant Management placeholder</div>,
  },
  {
    title: "Lead Management",
    to: "/super-admin/lead-management", 
    icon: <Briefcase className="h-4 w-4" />,
    page: <div>Lead Management placeholder</div>,
  },
  {
    title: "Admin Users",
    to: "/super-admin/admin-user-management",
    icon: <UserPlus className="h-4 w-4" />,
    page: <div>Admin User Management placeholder</div>,
  },
  {
    title: "Billing Management",
    to: "/super-admin/billing-management",
    icon: <CreditCard className="h-4 w-4" />,
    page: <div>Billing Management placeholder</div>,
  },
  {
    title: "Platform Monitoring",
    to: "/super-admin/platform-monitoring",
    icon: <Activity className="h-4 w-4" />,
    page: <div>Platform Monitoring placeholder</div>,
  },
];


import { HomeIcon, Users, Building2, Settings, BarChart3, Mail } from "lucide-react";
import Index from "./pages/Index";
import SuperAdmin from "./pages/SuperAdmin";
import TenantOnboarding from "./pages/onboarding/TenantOnboarding";

/**
 * Central place for defining the navigation structure of our app.
 * iconVariant prop controls the icon style:
 * - "outline" (default): For regular nav items
 * - "solid": For active/selected nav items
 */
export const navItems = [
  {
    title: "Home",
    to: "/",
    icon: HomeIcon,
    page: <Index />,
  },
  {
    title: "Super Admin",
    to: "/super-admin",
    icon: Settings,
    page: <SuperAdmin />,
  },
  {
    title: "Tenant Onboarding",
    to: "/onboarding",
    icon: Building2,
    page: <TenantOnboarding />,
  },
];

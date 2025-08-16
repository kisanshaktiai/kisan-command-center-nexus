// This file is deprecated and no longer used for routing
// The actual navigation is handled by SuperAdminSidebar.tsx
// Keeping this file for potential future reference but it's not actively used

export const navItems = [];

// Add the onboarding route
export const onboardingNavItem = {
  title: "Onboarding",
  to: "/onboarding",
  icon: <User className="h-4 w-4" />,
  page: <TenantOnboarding />,
};

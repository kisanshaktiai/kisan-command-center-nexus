// Centralized role system types
export interface SystemRole {
  id: string;
  role_code: string;
  role_name: string;
  role_description?: string;
  role_level: number;
  permissions: string[];
  is_active: boolean;
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
}

// Role codes from the centralized system_roles table
export const SYSTEM_ROLE_CODES = {
  // System Level Roles
  SUPER_ADMIN: 'super_admin',
  PLATFORM_ADMIN: 'platform_admin',
  
  // Tenant Level Roles
  TENANT_OWNER: 'tenant_owner',
  TENANT_ADMIN: 'tenant_admin',
  TENANT_MANAGER: 'tenant_manager',
  
  // Operational Roles
  DEALER: 'dealer',
  AGENT: 'agent',
  
  // End User Roles
  FARMER: 'farmer',
  TENANT_USER: 'tenant_user'
} as const;

export type SystemRoleCode = typeof SYSTEM_ROLE_CODES[keyof typeof SYSTEM_ROLE_CODES];

// Role hierarchy levels
export const ROLE_LEVELS = {
  SUPER_ADMIN: 100,
  PLATFORM_ADMIN: 90,
  TENANT_OWNER: 80,
  TENANT_ADMIN: 70,
  TENANT_MANAGER: 60,
  DEALER: 40,
  AGENT: 35,
  FARMER: 20,
  TENANT_USER: 10
} as const;

// Permission categories
export const PERMISSION_CATEGORIES = {
  SYSTEM: 'system',
  TENANT: 'tenant',
  USER: 'user',
  BILLING: 'billing',
  ANALYTICS: 'analytics',
  PRODUCTS: 'products',
  CUSTOMERS: 'customers',
  ORDERS: 'orders',
  COMMISSION: 'commission',
  FARMERS: 'farmers',
  TASKS: 'tasks',
  REPORTS: 'reports',
  PROFILE: 'profile',
  CROPS: 'crops',
  WEATHER: 'weather',
  MARKETPLACE: 'marketplace',
  DASHBOARD: 'dashboard',
  API: 'api'
} as const;

// Helper function to check if a role is system level
export const isSystemRole = (roleCode: string): boolean => {
  return roleCode === SYSTEM_ROLE_CODES.SUPER_ADMIN || roleCode === SYSTEM_ROLE_CODES.PLATFORM_ADMIN;
};

// Helper function to check if a role is tenant level
export const isTenantRole = (roleCode: string): boolean => {
  const tenantRoles = [
    SYSTEM_ROLE_CODES.TENANT_OWNER,
    SYSTEM_ROLE_CODES.TENANT_ADMIN,
    SYSTEM_ROLE_CODES.TENANT_MANAGER
  ];
  return tenantRoles.includes(roleCode);
};

// Helper function to get role level
export const getRoleLevel = (roleCode: string): number => {
  const roleLevelMap: Record<string, number> = {
    [SYSTEM_ROLE_CODES.SUPER_ADMIN]: ROLE_LEVELS.SUPER_ADMIN,
    [SYSTEM_ROLE_CODES.PLATFORM_ADMIN]: ROLE_LEVELS.PLATFORM_ADMIN,
    [SYSTEM_ROLE_CODES.TENANT_OWNER]: ROLE_LEVELS.TENANT_OWNER,
    [SYSTEM_ROLE_CODES.TENANT_ADMIN]: ROLE_LEVELS.TENANT_ADMIN,
    [SYSTEM_ROLE_CODES.TENANT_MANAGER]: ROLE_LEVELS.TENANT_MANAGER,
    [SYSTEM_ROLE_CODES.DEALER]: ROLE_LEVELS.DEALER,
    [SYSTEM_ROLE_CODES.AGENT]: ROLE_LEVELS.AGENT,
    [SYSTEM_ROLE_CODES.FARMER]: ROLE_LEVELS.FARMER,
    [SYSTEM_ROLE_CODES.TENANT_USER]: ROLE_LEVELS.TENANT_USER
  };
  
  return roleLevelMap[roleCode] || 0;
};

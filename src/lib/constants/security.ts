
/**
 * Security constants and configurations
 */

export const SECURITY_CONFIG = {
  // Session Management
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes in milliseconds
  REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
  
  // Authentication
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REQUIRE_SPECIAL: true,
  
  // RBAC
  ROLES: {
    SUPER_ADMIN: 'super_admin',
    PLATFORM_ADMIN: 'platform_admin', 
    ADMIN: 'admin',
    USER: 'user',
  } as const,
  
  // Permissions
  PERMISSIONS: {
    // Admin permissions
    MANAGE_USERS: 'manage_users',
    MANAGE_TENANTS: 'manage_tenants',
    MANAGE_BILLING: 'manage_billing',
    VIEW_ANALYTICS: 'view_analytics',
    
    // User permissions
    VIEW_DASHBOARD: 'view_dashboard',
    MANAGE_LEADS: 'manage_leads',
    VIEW_REPORTS: 'view_reports',
  } as const,
  
  // Rate Limiting
  RATE_LIMITS: {
    API_CALLS_PER_MINUTE: 60,
    LOGIN_ATTEMPTS_PER_HOUR: 5,
    PASSWORD_RESET_PER_HOUR: 3,
  },
} as const;

export type Role = typeof SECURITY_CONFIG.ROLES[keyof typeof SECURITY_CONFIG.ROLES];
export type Permission = typeof SECURITY_CONFIG.PERMISSIONS[keyof typeof SECURITY_CONFIG.PERMISSIONS];

// Role-Permission mapping
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [SECURITY_CONFIG.ROLES.SUPER_ADMIN]: Object.values(SECURITY_CONFIG.PERMISSIONS),
  [SECURITY_CONFIG.ROLES.PLATFORM_ADMIN]: [
    SECURITY_CONFIG.PERMISSIONS.MANAGE_USERS,
    SECURITY_CONFIG.PERMISSIONS.MANAGE_TENANTS,
    SECURITY_CONFIG.PERMISSIONS.VIEW_ANALYTICS,
    SECURITY_CONFIG.PERMISSIONS.VIEW_DASHBOARD,
  ],
  [SECURITY_CONFIG.ROLES.ADMIN]: [
    SECURITY_CONFIG.PERMISSIONS.MANAGE_LEADS,
    SECURITY_CONFIG.PERMISSIONS.VIEW_DASHBOARD,
    SECURITY_CONFIG.PERMISSIONS.VIEW_REPORTS,
  ],
  [SECURITY_CONFIG.ROLES.USER]: [
    SECURITY_CONFIG.PERMISSIONS.VIEW_DASHBOARD,
  ],
};

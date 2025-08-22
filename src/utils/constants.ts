
// Application constants organized by domain
export const APP_CONFIG = {
  name: 'TenantX',
  version: '1.0.0',
  description: 'Multi-tenant SaaS platform',
  support: {
    email: 'support@tenantx.com',
    phone: '+1-800-TENANTX'
  }
} as const;

export const API_CONFIG = {
  baseUrl: process.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000
} as const;

export const UI_CONFIG = {
  animations: {
    duration: {
      fast: 150,
      normal: 300,
      slow: 500
    },
    easing: 'ease-in-out'
  },
  breakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1280
  },
  pagination: {
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100]
  }
} as const;

export const VALIDATION_CONFIG = {
  password: {
    minLength: 8,
    maxLength: 128,
    requireSpecialChars: true,
    requireNumbers: true,
    requireUppercase: true
  },
  tenant: {
    nameMinLength: 2,
    nameMaxLength: 100,
    slugMinLength: 3,
    slugMaxLength: 50
  },
  file: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
  }
} as const;

export const STORAGE_KEYS = {
  authToken: 'auth_token',
  userPreferences: 'user_preferences',
  theme: 'theme',
  language: 'language'
} as const;

export const ROUTES = {
  auth: {
    login: '/auth/login',
    signup: '/auth/signup',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password'
  },
  dashboard: '/',
  tenants: {
    list: '/tenants',
    create: '/tenants/create',
    edit: (id: string) => `/tenants/${id}/edit`,
    view: (id: string) => `/tenants/${id}`
  },
  admin: {
    dashboard: '/admin',
    users: '/admin/users',
    settings: '/admin/settings'
  }
} as const;

export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  TIMEOUT: 'TIMEOUT'
} as const;

export const SUCCESS_MESSAGES = {
  TENANT_CREATED: 'Tenant created successfully',
  TENANT_UPDATED: 'Tenant updated successfully',
  TENANT_DELETED: 'Tenant deleted successfully',
  USER_CREATED: 'User created successfully',
  USER_UPDATED: 'User updated successfully',
  SETTINGS_SAVED: 'Settings saved successfully'
} as const;

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection problem. Please check your internet connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied. You do not have permission for this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  TIMEOUT: 'Request timed out. Please try again.'
} as const;

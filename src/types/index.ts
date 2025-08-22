
// Re-export all type definitions from centralized location
export * from './common';
export * from './api';

// Auth types - carefully managed exports
export type { 
  User, 
  AuthState, 
  AuthContextType,
  SignInCredentials as LoginCredentials,
  AdminRegistrationData,
  SuperAdminSetupData,
  UserProfile,
  TenantData,
  AuthResult,
  AdminStatus,
  AuthError,
  SignUpCredentials,
  AdminInvite,
  BootstrapData,
  AdminStatusResult,
  BootstrapStatusResult,
  SupabaseRpcResponse
} from './auth';

// Tenant types
export type { 
  Tenant, 
  TenantFilters, 
  CreateTenantDTO, 
  UpdateTenantDTO,
  DatabaseTenant 
} from './tenant';

// Enum types - avoid duplicate exports
export { 
  TenantType, 
  TenantStatus, 
  SubscriptionPlan 
} from './enums';

// API types
export type { 
  ServiceResult, 
  PaginatedResponse, 
  QueryOptions,
  ApiError,
  ApiResponse
} from './api';

// Domain types
export type { DomainEntity, DomainService, DomainRepository } from './common';

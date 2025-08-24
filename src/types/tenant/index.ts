
// Single source of truth for all tenant types - with complete exports

// Re-export everything with wildcard exports for maximum compatibility
export * from './enums';
export * from './interfaces'; 
export * from './dto';
export * from './utils';

// Also include explicit exports for clarity
export {
  TenantType,
  TenantStatus,
  SubscriptionPlan,
  tenantTypeOptions,
  tenantStatusOptions,
  subscriptionPlanOptions
} from './enums';

export type {
  TenantStatusValue,
  TenantTypeValue,  
  SubscriptionPlanValue
} from './enums';

export {
  createTenantID
} from './interfaces';

export type {
  Tenant,
  TenantID,
  TenantBranding,
  TenantFeatures,
  TenantFilters,
  TenantFormData,
  RpcResponse
} from './interfaces';

export type {
  CreateTenantDTO,
  UpdateTenantDTO
} from './dto';

export {
  convertDatabaseTenant,
  convertEnumToString
} from './utils';

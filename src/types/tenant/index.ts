
// Single source of truth for all tenant types - complete export structure

// Re-export everything from sub-modules
export * from './enums';
export * from './interfaces'; 
export * from './dto';
export * from './utils';

// Explicit re-exports to ensure availability
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
  createTenantID,
  convertDatabaseTenant
} from './interfaces';

export {
  convertEnumToString
} from './utils';

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

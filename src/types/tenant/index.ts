
// Single source of truth for all tenant types
export * from './enums';
export * from './interfaces';
export * from './dto';
export * from './utils';

// Backward compatibility - re-export everything that was in the old files
export type {
  TenantType,
  TenantStatus, 
  SubscriptionPlan,
  TenantStatusValue,
  TenantTypeValue,
  SubscriptionPlanValue,
  Tenant,
  TenantID,
  TenantBranding,
  TenantFeatures,
  TenantFilters,
  TenantFormData,
  CreateTenantDTO,
  UpdateTenantDTO,
  RpcResponse
} from './interfaces';

export {
  tenantTypeOptions,
  tenantStatusOptions,
  subscriptionPlanOptions,
  convertDatabaseTenant,
  convertEnumToString,
  createTenantID
} from './enums';

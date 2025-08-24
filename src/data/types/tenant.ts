
// DEPRECATED: This file now re-exports from centralized types for backward compatibility
// All types have been moved to /types/tenant/index.ts

// Re-export everything from the centralized tenant types
export * from '@/types/tenant';

// Explicit re-exports to ensure no missing imports
export type {
  Tenant,
  TenantID,
  TenantBranding,
  TenantFeatures,
  TenantFilters,
  TenantFormData,
  CreateTenantDTO,
  UpdateTenantDTO,
  RpcResponse,
  TenantType,
  TenantStatus,
  SubscriptionPlan,
  TenantStatusValue,
  TenantTypeValue,
  SubscriptionPlanValue
} from '@/types/tenant';

export {
  tenantTypeOptions,
  tenantStatusOptions,
  subscriptionPlanOptions,
  convertDatabaseTenant,
  convertEnumToString,
  createTenantID,
  TenantType,
  TenantStatus,
  SubscriptionPlan
} from '@/types/tenant';

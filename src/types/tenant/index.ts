
// Single source of truth for all tenant types

// Import everything from sub-modules first
import { TenantType, TenantStatus, SubscriptionPlan, TenantStatusValue, TenantTypeValue, SubscriptionPlanValue, tenantTypeOptions, tenantStatusOptions, subscriptionPlanOptions } from './enums';
import { Tenant, TenantID, TenantBranding, TenantFeatures, TenantFilters, TenantFormData, RpcResponse, createTenantID } from './interfaces';
import { CreateTenantDTO, UpdateTenantDTO } from './dto';
import { convertDatabaseTenant, convertEnumToString } from './utils';

// Re-export everything explicitly to ensure TypeScript can find them
export type {
  // Core interfaces
  Tenant,
  TenantID,
  TenantBranding,
  TenantFeatures,
  TenantFilters,
  TenantFormData,
  RpcResponse,
  
  // DTOs
  CreateTenantDTO,
  UpdateTenantDTO,
  
  // Enum types and values
  TenantType,
  TenantStatus,
  SubscriptionPlan,
  TenantStatusValue,
  TenantTypeValue,
  SubscriptionPlanValue
};

// Re-export functions and constants
export {
  // Enum constants
  TenantType,
  TenantStatus,
  SubscriptionPlan,
  
  // Option arrays
  tenantTypeOptions,
  tenantStatusOptions,
  subscriptionPlanOptions,
  
  // Utility functions
  convertDatabaseTenant,
  convertEnumToString,
  createTenantID
};

// Backward compatibility - ensure everything is accessible
export * from './enums';
export * from './interfaces';
export * from './dto';
export * from './utils';


// Tenant-related type definitions

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  subscription_plan: string;
  created_at: string;
  updated_at: string;
  organization_name?: string;
  contact_email?: string;
  contact_phone?: string;
  settings?: Record<string, unknown>;
}

export interface TenantFilters {
  search?: string;
  type?: string;
  status?: string;
  subscription_plan?: string;
}

export interface CreateTenantDTO {
  name: string;
  slug: string;
  type: string;
  organization_name?: string;
  contact_email?: string;
  contact_phone?: string;
  settings?: Record<string, unknown>;
}

export interface UpdateTenantDTO extends Partial<CreateTenantDTO> {
  id: string;
  status?: string;
  subscription_plan?: string;
}

export interface DatabaseTenant {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  subscription_plan: string;
  organization_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  settings: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

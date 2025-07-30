
export interface TenantDTO {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive' | 'trial' | 'suspended';
  subscription_plan: string;
  created_at: string;
  updated_at: string;
  owner_email?: string;
  owner_name?: string;
}

export interface CreateTenantDTO {
  name: string;
  slug: string;
  subscription_plan: string;
  owner_email: string;
  owner_name: string;
  metadata?: Record<string, any>;
}

export interface UpdateTenantDTO {
  name?: string;
  status?: string;
  subscription_plan?: string;
  metadata?: Record<string, any>;
}

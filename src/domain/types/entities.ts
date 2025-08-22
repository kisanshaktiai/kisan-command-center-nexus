
import { BaseEntity } from '@/types/common';

export interface DomainEntity extends BaseEntity {
  // Base properties for all domain entities
}

export interface UserEntity extends DomainEntity {
  email: string;
  full_name?: string;
  avatar_url?: string;
}

export interface TenantEntity extends DomainEntity {
  name: string;
  slug: string;
  type: string;
  status: string;
}

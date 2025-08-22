
export interface DomainService {
  // Base interface for domain services
}

export interface AuthDomainService extends DomainService {
  authenticate(credentials: any): Promise<any>;
  authorize(user: any, resource: string): Promise<boolean>;
}

export interface TenantDomainService extends DomainService {
  createTenant(data: any): Promise<any>;
  updateTenant(id: string, data: any): Promise<any>;
}

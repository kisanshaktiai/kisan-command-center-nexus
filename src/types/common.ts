
// Common utility types for better type safety across the application

export type UUID = string;
export type Timestamp = string;
export type JSONValue = string | number | boolean | null | { [key: string]: JSONValue } | JSONValue[];

// Generic response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp: Timestamp;
}

// Async operation result
export type AsyncResult<TData, TError = Error> = 
  | { success: true; data: TData }
  | { success: false; error: TError };

// Generic entity base
export interface BaseEntity {
  id: UUID;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// Form states
export type FormMode = 'create' | 'edit' | 'view';
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// UI component size variants
export type ComponentSize = 'small' | 'medium' | 'large';
export type ComponentVariant = 'default' | 'outline' | 'ghost' | 'destructive';

// View preferences
export interface ViewPreferences {
  mode: 'grid' | 'list' | 'cards';
  density: 'compact' | 'comfortable' | 'spacious';
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// Filter states
export interface BaseFilters {
  search?: string;
  page?: number;
  limit?: number;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  context?: Record<string, unknown>;
  timestamp: Timestamp;
}

// Domain types
export interface DomainEntity extends BaseEntity {
  // Base properties for all domain entities
}

export interface DomainService {
  // Base interface for domain services
}

export interface DomainRepository<T extends DomainEntity> {
  findById(id: UUID): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(entity: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T>;
  update(id: UUID, updates: Partial<T>): Promise<T>;
  delete(id: UUID): Promise<void>;
}

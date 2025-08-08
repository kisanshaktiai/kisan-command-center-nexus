
// Core service types
export interface ServiceConfig {
  retryAttempts: number;
  timeout: number;
  enableLogging: boolean;
}

export interface ServiceContext {
  requestId?: string;
  userId?: string;
  tenantId?: string;
  sessionId?: string;
}

export interface ServiceMetrics {
  executionTime: number;
  memoryUsage?: number;
  cacheHits?: number;
  cacheMisses?: number;
}

export interface EnhancedServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  context?: ServiceContext;
  metrics?: ServiceMetrics;
  warnings?: string[];
}

// Error types
export interface ServiceError extends Error {
  code: string;
  context?: ServiceContext;
  retryable?: boolean;
  statusCode?: number;
}

// Query types
export interface QueryOptions {
  cacheTime?: number;
  staleTime?: number;
  refetchInterval?: number;
  refetchOnWindowFocus?: boolean;
  retry?: boolean | number;
}

// Mutation types
export interface MutationOptions {
  optimisticUpdate?: boolean;
  rollbackOnError?: boolean;
  invalidateQueries?: string[][];
}

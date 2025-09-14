
// Strict API response types to eliminate 'any' usage
export interface ApiResponse<TData = unknown> {
  success: boolean;
  data?: TData;
  error?: string;
  code?: string;
  timestamp: string;
}

export interface PaginatedResponse<TData = unknown> extends ApiResponse<TData[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: Record<string, unknown>;
}

// Utility type for async operations
export type AsyncResult<TData, TError = ApiError> = 
  | { success: true; data: TData }
  | { success: false; error: TError };

// Form validation result type
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings?: Record<string, string[]>;
}

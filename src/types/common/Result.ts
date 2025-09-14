
/**
 * Standardized Result Pattern for Consistent Error Handling
 * Replaces mixed error patterns throughout the application
 */

export interface Result<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface ResultWithMetadata<T = void> extends Result<T> {
  metadata?: {
    timestamp?: string;
    requestId?: string;
    context?: string;
  };
}

/**
 * Helper functions for creating Results
 */
export const ResultHelpers = {
  success: <T>(data?: T): Result<T> => ({
    success: true,
    data,
  }),

  error: <T>(error: string, code?: string): Result<T> => ({
    success: false,
    error,
    code,
  }),

  fromException: <T>(exception: unknown): Result<T> => ({
    success: false,
    error: exception instanceof Error ? exception.message : 'Unknown error occurred',
    code: exception instanceof Error ? exception.name : 'UNKNOWN_ERROR',
  }),

  withMetadata: <T>(result: Result<T>, metadata: ResultWithMetadata<T>['metadata']): ResultWithMetadata<T> => ({
    ...result,
    metadata,
  }),
};

/**
 * Type guards for Result checking
 */
export const isSuccess = <T>(result: Result<T>): result is Result<T> & { success: true; data: T } => {
  return result.success === true;
};

export const isError = <T>(result: Result<T>): result is Result<T> & { success: false; error: string } => {
  return result.success === false;
};

/**
 * Async Result wrapper for promise-based operations
 */
export const wrapAsync = async <T>(
  operation: () => Promise<T>,
  context?: string
): Promise<Result<T>> => {
  try {
    const data = await operation();
    return ResultHelpers.success(data);
  } catch (error) {
    const result = ResultHelpers.fromException<T>(error);
    if (context) {
      return ResultHelpers.withMetadata(result, { context, timestamp: new Date().toISOString() });
    }
    return result;
  }
};

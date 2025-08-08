
import { BaseService } from '../BaseService';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface ErrorInfo {
  message: string;
  code?: string;
  status?: number;
  context?: ErrorContext;
  timestamp: Date;
  stack?: string;
}

/**
 * Core error processing service - handles parsing and structuring errors
 */
export class ErrorProcessor extends BaseService {
  private static instance: ErrorProcessor;

  private constructor() {
    super();
  }

  public static getInstance(): ErrorProcessor {
    if (!ErrorProcessor.instance) {
      ErrorProcessor.instance = new ErrorProcessor();
    }
    return ErrorProcessor.instance;
  }

  /**
   * Parse various error types into standardized format
   */
  parseError(error: unknown, context?: ErrorContext): ErrorInfo {
    const timestamp = new Date();

    if (error instanceof Error) {
      return {
        message: error.message,
        code: (error as any).code,
        status: (error as any).status,
        context,
        timestamp,
        stack: error.stack
      };
    }

    if (typeof error === 'string') {
      return {
        message: error,
        context,
        timestamp
      };
    }

    if (typeof error === 'object' && error !== null) {
      const errorObj = error as any;
      return {
        message: errorObj.message || errorObj.error || 'Unknown error',
        code: errorObj.code,
        status: errorObj.status || errorObj.statusCode,
        context,
        timestamp,
        stack: errorObj.stack
      };
    }

    return {
      message: 'Unknown error occurred',
      context,
      timestamp
    };
  }

  /**
   * Create error context helper
   */
  createContext(component: string, action?: string, metadata?: Record<string, any>): ErrorContext {
    return {
      component,
      action,
      metadata,
      userId: undefined // This would be populated from auth context
    };
  }
}

export const errorProcessor = ErrorProcessor.getInstance();

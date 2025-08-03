import { BaseService } from './BaseService';

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

export interface ErrorHandlingOptions {
  logToConsole?: boolean;
  logToServer?: boolean;
  fallbackMessage?: string;
}

export interface ErrorResult {
  errorInfo: ErrorInfo;
  userMessage: string;
  shouldShowNotification: boolean;
  notificationType: 'error' | 'warning';
}

/**
 * Centralized Error Handling Service
 * Provides consistent error handling across the application
 * UI-agnostic - returns structured results for UI to consume
 */
export class ErrorHandlingService extends BaseService {
  private static instance: ErrorHandlingService;
  private errorLog: ErrorInfo[] = [];
  private readonly MAX_LOG_SIZE = 100;

  private constructor() {
    super();
  }

  public static getInstance(): ErrorHandlingService {
    if (!ErrorHandlingService.instance) {
      ErrorHandlingService.instance = new ErrorHandlingService();
    }
    return ErrorHandlingService.instance;
  }

  /**
   * Process and handle errors - returns structured result for UI consumption
   */
  processError(
    error: unknown,
    context?: ErrorContext,
    options: ErrorHandlingOptions = {}
  ): ErrorResult {
    const {
      logToConsole = true,
      logToServer = false,
      fallbackMessage = 'An unexpected error occurred'
    } = options;

    // Parse error into standardized format
    const errorInfo = this.parseError(error, context);

    // Log to local storage
    this.addToErrorLog(errorInfo);

    // Console logging
    if (logToConsole) {
      console.error('ErrorHandlingService:', errorInfo);
    }

    // Server logging (if enabled)
    if (logToServer) {
      this.logToServer(errorInfo).catch(err => 
        console.warn('Failed to log error to server:', err)
      );
    }

    // Return structured result for UI to handle
    return {
      errorInfo,
      userMessage: this.getUserFriendlyMessage(errorInfo, fallbackMessage),
      shouldShowNotification: true,
      notificationType: this.getNotificationType(errorInfo)
    };
  }

  /**
   * Parse various error types into standardized format
   */
  private parseError(error: unknown, context?: ErrorContext): ErrorInfo {
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
   * Add error to local log
   */
  private addToErrorLog(errorInfo: ErrorInfo): void {
    this.errorLog.unshift(errorInfo);
    
    // Keep log size manageable
    if (this.errorLog.length > this.MAX_LOG_SIZE) {
      this.errorLog = this.errorLog.slice(0, this.MAX_LOG_SIZE);
    }
  }

  /**
   * Determine notification type based on error severity
   */
  private getNotificationType(errorInfo: ErrorInfo): 'error' | 'warning' {
    if (errorInfo.status && errorInfo.status >= 500) {
      return 'error';
    } else if (errorInfo.status && errorInfo.status >= 400) {
      return 'warning';
    }
    return 'error';
  }

  /**
   * Convert technical errors to user-friendly messages
   */
  private getUserFriendlyMessage(errorInfo: ErrorInfo, fallback: string): string {
    const { message, code, status } = errorInfo;

    // Map common error codes/messages to user-friendly text
    const errorMap: Record<string, string> = {
      'NETWORK_ERROR': 'Network connection problem. Please check your internet connection.',
      'TIMEOUT': 'Request timed out. Please try again.',
      'UNAUTHORIZED': 'You are not authorized to perform this action.',
      'FORBIDDEN': 'Access denied. You do not have permission to access this resource.',
      'NOT_FOUND': 'The requested resource was not found.',
      'VALIDATION_ERROR': 'Please check your input and try again.',
      'DUPLICATE_ENTRY': 'This entry already exists.',
      'EMAIL_ALREADY_EXISTS': 'An account with this email already exists.',
      'INVALID_CREDENTIALS': 'Invalid email or password.',
      'TOKEN_EXPIRED': 'Your session has expired. Please log in again.',
      'RATE_LIMITED': 'Too many requests. Please wait a moment and try again.'
    };

    // Check by error code first
    if (code && errorMap[code]) {
      return errorMap[code];
    }

    // Check by status code
    if (status) {
      switch (status) {
        case 400: return 'Invalid request. Please check your input.';
        case 401: return 'Authentication required. Please log in.';
        case 403: return 'Access denied. You do not have permission for this action.';
        case 404: return 'The requested resource was not found.';
        case 409: return 'Conflict detected. The resource may already exist.';
        case 429: return 'Too many requests. Please wait and try again.';
        case 500: return 'Server error. Please try again later.';
        case 503: return 'Service temporarily unavailable. Please try again later.';
      }
    }

    // Check message content for common patterns
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('network')) {
      return 'Network connection problem. Please check your internet connection.';
    }
    if (lowerMessage.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    if (lowerMessage.includes('authentication') || lowerMessage.includes('unauthorized')) {
      return 'Authentication failed. Please log in again.';
    }

    // If message is user-friendly (not too technical), use it
    if (message && !this.isTechnicalMessage(message)) {
      return message;
    }

    return fallback;
  }

  /**
   * Check if a message is too technical for end users
   */
  private isTechnicalMessage(message: string): boolean {
    const technicalTerms = [
      'stack trace', 'null pointer', 'undefined reference',
      'segmentation fault', 'heap', 'buffer overflow',
      'sql', 'database', 'query', 'connection pool',
      'jwt', 'oauth', 'cors', 'csrf'
    ];

    const lowerMessage = message.toLowerCase();
    return technicalTerms.some(term => lowerMessage.includes(term));
  }

  /**
   * Log error to server for monitoring
   */
  private async logToServer(errorInfo: ErrorInfo): Promise<void> {
    try {
      // In a real implementation, this would send to your logging service
      console.log('Would log to server:', errorInfo);
    } catch (error) {
      console.warn('Failed to log to server:', error);
    }
  }

  /**
   * Get recent error logs
   */
  getErrorLog(): ErrorInfo[] {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
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

  /**
   * Convenience methods for common error scenarios
   */
  handleAuthError(error: unknown, action: string = 'authentication'): ErrorResult {
    return this.processError(error, this.createContext('Auth', action), {
      fallbackMessage: 'Authentication failed. Please try again.'
    });
  }

  handleApiError(error: unknown, endpoint: string, action: string = 'API call'): ErrorResult {
    return this.processError(error, this.createContext('API', action, { endpoint }), {
      fallbackMessage: 'Unable to complete request. Please try again.'
    });
  }

  handleFormError(error: unknown, formName: string, field?: string): ErrorResult {
    return this.processError(error, this.createContext('Form', 'validation', { formName, field }), {
      fallbackMessage: 'Please check your input and try again.'
    });
  }
}

export const errorHandlingService = ErrorHandlingService.getInstance();

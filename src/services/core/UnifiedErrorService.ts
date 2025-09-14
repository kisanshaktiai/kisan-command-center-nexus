
import { BaseService } from '../BaseService';
import { ErrorProcessor, ErrorContext, ErrorInfo } from './ErrorProcessor';
import { UserMessageService } from './UserMessageService';
import { ErrorLoggingService } from './ErrorLoggingService';

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
 * Unified Error Handling Service - orchestrates error processing, messaging, and logging
 */
export class UnifiedErrorService extends BaseService {
  private static instance: UnifiedErrorService;
  private errorProcessor: ErrorProcessor;
  private userMessageService: UserMessageService;
  private errorLoggingService: ErrorLoggingService;

  private constructor() {
    super();
    this.errorProcessor = ErrorProcessor.getInstance();
    this.userMessageService = UserMessageService.getInstance();
    this.errorLoggingService = ErrorLoggingService.getInstance();
  }

  public static getInstance(): UnifiedErrorService {
    if (!UnifiedErrorService.instance) {
      UnifiedErrorService.instance = new UnifiedErrorService();
    }
    return UnifiedErrorService.instance;
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
    const errorInfo = this.errorProcessor.parseError(error, context);

    // Log to local storage
    this.errorLoggingService.addToErrorLog(errorInfo);

    // Console logging
    if (logToConsole) {
      console.error('UnifiedErrorService:', errorInfo);
    }

    // Server logging (if enabled)
    if (logToServer) {
      this.errorLoggingService.logToServer(errorInfo).catch(err => 
        console.warn('Failed to log error to server:', err)
      );
    }

    // Return structured result for UI to handle
    return {
      errorInfo,
      userMessage: this.userMessageService.getUserFriendlyMessage(errorInfo, fallbackMessage),
      shouldShowNotification: true,
      notificationType: this.userMessageService.getNotificationType(errorInfo)
    };
  }

  /**
   * Convenience methods for common error scenarios
   */
  handleAuthError(error: unknown, action: string = 'authentication'): ErrorResult {
    return this.processError(error, this.errorProcessor.createContext('Auth', action), {
      fallbackMessage: 'Authentication failed. Please try again.'
    });
  }

  handleApiError(error: unknown, endpoint: string, action: string = 'API call'): ErrorResult {
    return this.processError(error, this.errorProcessor.createContext('API', action, { endpoint }), {
      fallbackMessage: 'Unable to complete request. Please try again.'
    });
  }

  handleFormError(error: unknown, formName: string, field?: string): ErrorResult {
    return this.processError(error, this.errorProcessor.createContext('Form', 'validation', { formName, field }), {
      fallbackMessage: 'Please check your input and try again.'
    });
  }
}

export const unifiedErrorService = UnifiedErrorService.getInstance();

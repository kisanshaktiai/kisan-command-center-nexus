import { BaseService } from '../BaseService';
import { ErrorInfo } from './ErrorProcessor';

/**
 * Service for error logging and storage
 */
export class ErrorLoggingService extends BaseService {
  private static instance: ErrorLoggingService;
  private errorLog: ErrorInfo[] = [];
  private readonly MAX_LOG_SIZE = 100;

  private constructor() {
    super();
  }

  public static getInstance(): ErrorLoggingService {
    if (!ErrorLoggingService.instance) {
      ErrorLoggingService.instance = new ErrorLoggingService();
    }
    return ErrorLoggingService.instance;
  }

  /**
   * Add error to local log
   */
  addToErrorLog(errorInfo: ErrorInfo): void {
    this.errorLog.unshift(errorInfo);
    
    // Keep log size manageable
    if (this.errorLog.length > this.MAX_LOG_SIZE) {
      this.errorLog = this.errorLog.slice(0, this.MAX_LOG_SIZE);
    }
  }

  /**
   * Log error to server for monitoring
   */
  async logToServer(errorInfo: ErrorInfo): Promise<void> {
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
}

export const errorLoggingService = ErrorLoggingService.getInstance();

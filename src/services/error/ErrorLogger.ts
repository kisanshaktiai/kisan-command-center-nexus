import { BaseService } from '@/services/BaseService';

export interface ErrorLogEntry {
  message: string;
  stack?: string;
  componentStack?: string;
  errorId: string;
  timestamp: string;
  context?: {
    component?: string;
    level?: 'low' | 'medium' | 'high' | 'critical';
    metadata?: Record<string, any>;
  };
  userAgent?: string;
  url?: string;
}

export class ErrorLogger extends BaseService {
  private static instance: ErrorLogger;
  private errorLog: ErrorLogEntry[] = [];
  private readonly MAX_LOG_SIZE = 100;

  private constructor() {
    super();
  }

  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  logError(error: Error, errorInfo: React.ErrorInfo, context?: ErrorLogEntry['context']): string {
    const errorId = this.generateErrorId();
    
    const logEntry: ErrorLogEntry = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId,
      timestamp: new Date().toISOString(),
      context,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Add to local log
    this.addToLog(logEntry);
    
    // Console logging
    console.error('ErrorLogger:', logEntry);
    
    // In production, this would send to monitoring service
    this.sendToMonitoringService(logEntry).catch(err => 
      console.warn('Failed to send error to monitoring service:', err)
    );

    return errorId;
  }

  private generateErrorId(): string {
    return `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private addToLog(entry: ErrorLogEntry): void {
    this.errorLog.unshift(entry);
    
    // Keep log size manageable
    if (this.errorLog.length > this.MAX_LOG_SIZE) {
      this.errorLog = this.errorLog.slice(0, this.MAX_LOG_SIZE);
    }
  }

  private async sendToMonitoringService(logEntry: ErrorLogEntry): Promise<void> {
    // In a real implementation, this would send to your monitoring service
    // For now, just log it
    console.log('Would send to monitoring service:', logEntry);
  }

  getErrorLog(): ErrorLogEntry[] {
    return [...this.errorLog];
  }

  clearErrorLog(): void {
    this.errorLog = [];
  }
}

export const errorLogger = ErrorLogger.getInstance();

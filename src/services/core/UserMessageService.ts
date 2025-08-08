
import { BaseService } from '../BaseService';
import { ErrorInfo } from './ErrorProcessor';

/**
 * Service for converting technical errors to user-friendly messages
 */
export class UserMessageService extends BaseService {
  private static instance: UserMessageService;

  private constructor() {
    super();
  }

  public static getInstance(): UserMessageService {
    if (!UserMessageService.instance) {
      UserMessageService.instance = new UserMessageService();
    }
    return UserMessageService.instance;
  }

  /**
   * Convert technical errors to user-friendly messages
   */
  getUserFriendlyMessage(errorInfo: ErrorInfo, fallback: string = 'An unexpected error occurred'): string {
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
   * Determine notification type based on error severity
   */
  getNotificationType(errorInfo: ErrorInfo): 'error' | 'warning' {
    if (errorInfo.status && errorInfo.status >= 500) {
      return 'error';
    } else if (errorInfo.status && errorInfo.status >= 400) {
      return 'warning';
    }
    return 'error';
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
}

export const userMessageService = UserMessageService.getInstance();

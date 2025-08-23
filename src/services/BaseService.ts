
import { AuthError } from '@supabase/supabase-js';

export interface ServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export abstract class BaseService {
  protected handleSuccess<T>(data: T): ServiceResult<T> {
    return {
      success: true,
      data
    };
  }

  protected handleError<T = unknown>(message: string, error?: any): ServiceResult<T> {
    console.error(`${this.constructor.name}: ${message}`, error);
    
    let errorMessage = message;
    
    if (error) {
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }

  protected async executeOperation<T>(
    operation: () => Promise<T>,
    operationName?: string
  ): Promise<ServiceResult<T>> {
    try {
      const result = await operation();
      return this.handleSuccess(result);
    } catch (error) {
      const name = operationName || 'operation';
      return this.handleError(`Failed to ${name}`, error);
    }
  }
}

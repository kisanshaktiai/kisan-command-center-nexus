/**
 * Base Service Class
 * Provides consistent error handling and common patterns for all services
 */
export abstract class BaseService {
  protected constructor() {}

  /**
   * Get singleton instance of a service (to be overridden by concrete classes)
   */
  protected static createInstance<T extends BaseService>(
    constructor: { new(): T },
    instanceStorage: { instance?: T }
  ): T {
    if (!instanceStorage.instance) {
      instanceStorage.instance = Reflect.construct(constructor, []);
    }
    return instanceStorage.instance;
  }

  /**
   * Standardized error handling
   */
  protected handleError(error: unknown, context: string): never {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`${this.constructor.name}: Error in ${context}:`, error);
    throw new Error(`${context}: ${errorMessage}`);
  }

  /**
   * Standardized result wrapper
   */
  protected createResult<T>(success: boolean, data?: T, error?: string): ServiceResult<T> {
    return { success, data, error };
  }

  /**
   * Standardized async operation wrapper
   */
  protected async executeOperation<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<ServiceResult<T>> {
    try {
      const data = await operation();
      return this.createResult(true, data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`${this.constructor.name}: Error in ${context}:`, error);
      return this.createResult(false, undefined, errorMessage);
    }
  }
}

/**
 * Standardized service result interface
 */
export interface ServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
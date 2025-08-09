
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface ApiRequestConfig {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  tenantId?: string;
  skipTenantInjection?: boolean;
  skipErrorToast?: boolean;
  retries?: number;
  timeout?: number;
}

class ApiFactoryClass {
  private defaultTimeout = 30000; // 30 seconds
  private defaultRetries = 3;
  private baseDelay = 1000; // 1 second

  private getCurrentTenantId(): string | null {
    return localStorage.getItem('currentTenantId');
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateBackoffDelay(attempt: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay;
    return exponentialDelay + jitter;
  }

  private async refreshAuth(): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      return !!data.session;
    } catch (error) {
      console.error('Auth refresh failed:', error);
      return false;
    }
  }

  private async executeRequest<T>(config: ApiRequestConfig, attempt = 0): Promise<ApiResponse<T>> {
    const {
      endpoint,
      method = 'GET',
      data,
      params,
      headers = {},
      tenantId,
      skipTenantInjection = false,
      skipErrorToast = false,
      retries = this.defaultRetries,
      timeout = this.defaultTimeout
    } = config;

    try {
      // Inject tenant ID if not skipped
      const currentTenantId = tenantId || this.getCurrentTenantId();
      if (!skipTenantInjection && currentTenantId) {
        headers['X-Tenant-ID'] = currentTenantId;
        
        // Also inject into data for POST/PUT requests
        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
          data.tenant_id = currentTenantId;
        }
      }

      // Add correlation ID for request tracking
      const correlationId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      headers['X-Correlation-ID'] = correlationId;

      // Add user agent
      headers['X-User-Agent'] = navigator.userAgent;

      // Execute the request based on method
      let response;
      const startTime = Date.now();

      switch (method) {
        case 'GET':
          if (endpoint.startsWith('functions/')) {
            // Edge function call
            response = await supabase.functions.invoke(
              endpoint.replace('functions/', ''),
              { body: params }
            );
          } else {
            // Use a more generic approach for database queries
            response = await this.executeDatabaseQuery(endpoint, method, data, params);
          }
          break;

        case 'POST':
          if (endpoint.startsWith('functions/')) {
            response = await supabase.functions.invoke(
              endpoint.replace('functions/', ''),
              { body: data }
            );
          } else {
            response = await this.executeDatabaseQuery(endpoint, method, data, params);
          }
          break;

        case 'PUT':
        case 'PATCH':
          response = await this.executeDatabaseQuery(endpoint, method, data, params);
          break;

        case 'DELETE':
          response = await this.executeDatabaseQuery(endpoint, method, data, params);
          break;

        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      const duration = Date.now() - startTime;

      // Log successful requests
      console.log(`API Request [${correlationId}]:`, {
        method,
        endpoint,
        duration: `${duration}ms`,
        tenantId: currentTenantId,
        attempt: attempt + 1
      });

      if (response.error) {
        throw new Error(response.error.message || 'Request failed');
      }

      return {
        success: true,
        data: response.data,
        message: 'Request completed successfully'
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Check if it's an auth error
      if (errorMessage.includes('JWT') || errorMessage.includes('unauthorized')) {
        if (attempt === 0) {
          const refreshed = await this.refreshAuth();
          if (refreshed) {
            // Retry with refreshed auth
            return this.executeRequest(config, attempt + 1);
          }
        }
        
        // Redirect to login if auth refresh fails
        window.location.href = '/auth';
        return {
          success: false,
          error: 'Authentication required'
        };
      }

      // Check if we should retry
      if (attempt < retries && this.shouldRetry(error)) {
        const delay = this.calculateBackoffDelay(attempt);
        console.warn(`API Request failed, retrying in ${delay}ms:`, {
          endpoint,
          attempt: attempt + 1,
          maxRetries: retries,
          error: errorMessage
        });
        
        await this.delay(delay);
        return this.executeRequest(config, attempt + 1);
      }

      // Show error toast if not skipped
      if (!skipErrorToast) {
        toast.error(`Request failed: ${errorMessage}`);
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  private async executeDatabaseQuery(endpoint: string, method: string, data?: any, params?: Record<string, any>) {
    // Use type assertion to bypass strict typing for dynamic table names
    const table = (supabase as any).from(endpoint);
    
    switch (method) {
      case 'GET':
        let query = table.select(params?.select || '*');
        
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            if (key !== 'select' && value !== undefined) {
              query = query.eq(key, value);
            }
          });
        }
        
        return await query;

      case 'POST':
        return await table.insert(data).select();

      case 'PUT':
      case 'PATCH':
        if (params?.id) {
          return await table
            .update(data)
            .eq('id', params.id)
            .select();
        } else {
          throw new Error('ID required for update operations');
        }

      case 'DELETE':
        if (params?.id) {
          return await table
            .delete()
            .eq('id', params.id);
        } else {
          throw new Error('ID required for delete operations');
        }

      default:
        throw new Error(`Unsupported database method: ${method}`);
    }
  }

  private shouldRetry(error: any): boolean {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Retry on network errors, timeouts, and certain HTTP status codes
    return (
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('502') ||
      errorMessage.includes('503') ||
      errorMessage.includes('504')
    );
  }

  // Public API methods
  async get<T>(endpoint: string, params?: Record<string, any>, options?: Partial<ApiRequestConfig>): Promise<ApiResponse<T>> {
    return this.executeRequest({ endpoint, method: 'GET', params, ...options });
  }

  async post<T>(endpoint: string, data: any, options?: Partial<ApiRequestConfig>): Promise<ApiResponse<T>> {
    return this.executeRequest({ endpoint, method: 'POST', data, ...options });
  }

  async put<T>(endpoint: string, id: string, data: any, options?: Partial<ApiRequestConfig>): Promise<ApiResponse<T>> {
    return this.executeRequest({ endpoint, method: 'PUT', data, params: { id }, ...options });
  }

  async patch<T>(endpoint: string, id: string, data: any, options?: Partial<ApiRequestConfig>): Promise<ApiResponse<T>> {
    return this.executeRequest({ endpoint, method: 'PATCH', data, params: { id }, ...options });
  }

  async delete<T>(endpoint: string, id: string, options?: Partial<ApiRequestConfig>): Promise<ApiResponse<T>> {
    return this.executeRequest({ endpoint, method: 'DELETE', params: { id }, ...options });
  }

  // Edge function wrapper
  async invokeFunction<T>(functionName: string, data?: any, options?: Partial<ApiRequestConfig>): Promise<ApiResponse<T>> {
    return this.executeRequest({ 
      endpoint: `functions/${functionName}`, 
      method: 'POST', 
      data,
      skipTenantInjection: true, // Functions handle tenant context internally
      ...options 
    });
  }
}

export const ApiFactory = new ApiFactoryClass();

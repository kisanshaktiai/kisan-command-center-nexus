
import { supabase } from '@/integrations/supabase/client';
import { tenantContextService } from '@/middleware/TenantContextMiddleware';
import { toast } from 'sonner';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  correlationId?: string;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    performance?: {
      duration: number;
      cached: boolean;
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
  correlationId?: string;
  version?: 'v1' | 'v2';
}

class EnhancedApiFactory {
  private static instance: EnhancedApiFactory;
  private defaultTimeout = 30000;
  private defaultRetries = 3;
  private baseDelay = 1000;
  private rateLimitCache = new Map<string, { count: number; resetTime: number }>();

  public static getInstance(): EnhancedApiFactory {
    if (!EnhancedApiFactory.instance) {
      EnhancedApiFactory.instance = new EnhancedApiFactory();
    }
    return EnhancedApiFactory.instance;
  }

  private generateCorrelationId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async checkRateLimit(tenantId?: string): Promise<boolean> {
    if (!tenantId) return true;

    const key = `rate-limit-${tenantId}`;
    const now = Date.now();
    const limit = this.rateLimitCache.get(key);

    if (!limit || now > limit.resetTime) {
      this.rateLimitCache.set(key, { count: 1, resetTime: now + 60000 }); // 1 minute window
      return true;
    }

    if (limit.count >= 1000) { // 1000 requests per minute per tenant
      toast.error('Rate limit exceeded. Please try again later.');
      return false;
    }

    limit.count++;
    return true;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateBackoffDelay(attempt: number): number {
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
      timeout = this.defaultTimeout,
      correlationId = this.generateCorrelationId(),
      version = 'v1'
    } = config;

    const startTime = Date.now();

    try {
      // Get current tenant context if not provided
      const currentTenantId = tenantId || tenantContextService.getCurrentContext().tenantId;
      
      // Check rate limit
      if (!(await this.checkRateLimit(currentTenantId || undefined))) {
        return {
          success: false,
          error: 'Rate limit exceeded',
          correlationId
        };
      }

      // Inject tenant ID if not skipped
      if (!skipTenantInjection && currentTenantId) {
        headers['X-Tenant-ID'] = currentTenantId;
        
        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
          data.tenant_id = currentTenantId;
        }
      }

      // Add standard headers
      headers['X-Correlation-ID'] = correlationId;
      headers['X-API-Version'] = version;
      headers['X-User-Agent'] = navigator.userAgent;

      // Execute the request
      let response;
      
      if (endpoint.startsWith('functions/')) {
        // Edge function call
        response = await supabase.functions.invoke(
          endpoint.replace('functions/', ''),
          { 
            body: method === 'GET' ? params : data,
            headers 
          }
        );
      } else {
        // Database operation
        response = await this.executeDatabaseQuery(endpoint, method, data, params);
      }

      const duration = Date.now() - startTime;

      if (response.error) {
        throw new Error(response.error.message || 'Request failed');
      }

      return {
        success: true,
        data: response.data,
        message: 'Request completed successfully',
        correlationId,
        meta: {
          performance: {
            duration,
            cached: false
          }
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Check if it's an auth error
      if (errorMessage.includes('JWT') || errorMessage.includes('unauthorized')) {
        if (attempt === 0) {
          const refreshed = await this.refreshAuth();
          if (refreshed) {
            return this.executeRequest(config, attempt + 1);
          }
        }
        
        window.location.href = '/auth';
        return {
          success: false,
          error: 'Authentication required',
          correlationId
        };
      }

      // Check if we should retry
      if (attempt < retries && this.shouldRetry(error)) {
        const delay = this.calculateBackoffDelay(attempt);
        console.warn(`API Request failed, retrying in ${delay}ms:`, {
          endpoint,
          attempt: attempt + 1,
          maxRetries: retries,
          error: errorMessage,
          correlationId
        });
        
        await this.delay(delay);
        return this.executeRequest(config, attempt + 1);
      }

      // Log error for observability
      console.error(`API Request failed [${correlationId}]:`, {
        endpoint,
        method,
        attempt: attempt + 1,
        error: errorMessage,
        tenantId: tenantId || tenantContextService.getCurrentContext().tenantId
      });

      if (!skipErrorToast) {
        toast.error(`Request failed: ${errorMessage}`);
      }

      return {
        success: false,
        error: errorMessage,
        correlationId
      };
    }
  }

  private async executeDatabaseQuery(endpoint: string, method: string, data?: any, params?: Record<string, any>) {
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

  async invokeFunction<T>(functionName: string, data?: any, options?: Partial<ApiRequestConfig>): Promise<ApiResponse<T>> {
    return this.executeRequest({ 
      endpoint: `functions/${functionName}`, 
      method: 'POST', 
      data,
      skipTenantInjection: true,
      ...options 
    });
  }
}

export const enhancedApiFactory = EnhancedApiFactory.getInstance();

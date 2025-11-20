import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Rate limit configurations by sensitivity
export const RATE_LIMITS = {
  HIGH_SENSITIVITY: { requests: 3, windowMs: 60000 },      // 3 req/min - Email, payments
  MEDIUM: { requests: 10, windowMs: 60000 },                // 10 req/min - Validation, auth
  LOW: { requests: 30, windowMs: 60000 },                   // 30 req/min - Read operations
  WEBHOOK: { requests: 100, windowMs: 60000 },              // 100 req/min - External webhooks
  EXPENSIVE: { requests: 5, windowMs: 300000 },             // 5 req/5min - AI, satellite APIs
  EXPENSIVE_BATCH: { requests: 3, windowMs: 300000 },       // 3 req/5min - Batch operations
  EXPENSIVE_MODERATE: { requests: 10, windowMs: 300000 },   // 10 req/5min - Moderate cost APIs
};

export interface RateLimitConfig {
  requests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter: number;
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'Retry-After'?: string;
}

export class RateLimiter {
  private supabase: SupabaseClient;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    this.supabase = createClient(
      supabaseUrl || Deno.env.get('SUPABASE_URL') || '',
      supabaseKey || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );
  }

  /**
   * Extract client IP from request
   */
  getClientIP(req: Request): string {
    // Try various headers in order of preference
    const headers = req.headers;
    const cfConnectingIP = headers.get('cf-connecting-ip');
    const xForwardedFor = headers.get('x-forwarded-for');
    const xRealIP = headers.get('x-real-ip');

    if (cfConnectingIP) return cfConnectingIP;
    if (xForwardedFor) return xForwardedFor.split(',')[0].trim();
    if (xRealIP) return xRealIP;

    return 'unknown';
  }

  /**
   * Check if request should be rate limited
   */
  async checkLimit(
    identifier: string,
    functionName: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowMs);

    try {
      // Get or create rate limit bucket
      const { data: existingBucket, error: fetchError } = await this.supabase
        .from('rate_limit_buckets')
        .select('*')
        .eq('identifier', identifier)
        .eq('function_name', functionName)
        .gte('window_end', now.toISOString())
        .order('window_end', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error('[RateLimiter] Error fetching bucket:', fetchError);
        // On error, allow request but log it
        return {
          allowed: true,
          limit: config.requests,
          remaining: config.requests - 1,
          resetAt: Math.floor((now.getTime() + config.windowMs) / 1000),
          retryAfter: 0,
        };
      }

      // If no active bucket exists, create one
      if (!existingBucket) {
        const newWindowEnd = new Date(now.getTime() + config.windowMs);
        
        const { error: insertError } = await this.supabase
          .from('rate_limit_buckets')
          .insert({
            identifier,
            function_name: functionName,
            request_count: 1,
            window_start: now.toISOString(),
            window_end: newWindowEnd.toISOString(),
            last_request: now.toISOString(),
            metadata: { created_at_timestamp: now.getTime() }
          });

        if (insertError) {
          console.error('[RateLimiter] Error creating bucket:', insertError);
        }

        return {
          allowed: true,
          limit: config.requests,
          remaining: config.requests - 1,
          resetAt: Math.floor(newWindowEnd.getTime() / 1000),
          retryAfter: 0,
        };
      }

      // Check if limit exceeded
      if (existingBucket.request_count >= config.requests) {
        const resetAt = new Date(existingBucket.window_end);
        const retryAfter = Math.ceil((resetAt.getTime() - now.getTime()) / 1000);

        return {
          allowed: false,
          limit: config.requests,
          remaining: 0,
          resetAt: Math.floor(resetAt.getTime() / 1000),
          retryAfter: Math.max(retryAfter, 1),
        };
      }

      // Increment request count
      const { error: updateError } = await this.supabase
        .from('rate_limit_buckets')
        .update({
          request_count: existingBucket.request_count + 1,
          last_request: now.toISOString(),
        })
        .eq('id', existingBucket.id);

      if (updateError) {
        console.error('[RateLimiter] Error updating bucket:', updateError);
      }

      const resetAt = new Date(existingBucket.window_end);
      return {
        allowed: true,
        limit: config.requests,
        remaining: config.requests - (existingBucket.request_count + 1),
        resetAt: Math.floor(resetAt.getTime() / 1000),
        retryAfter: 0,
      };

    } catch (error) {
      console.error('[RateLimiter] Unexpected error:', error);
      // On unexpected error, allow request
      return {
        allowed: true,
        limit: config.requests,
        remaining: config.requests - 1,
        resetAt: Math.floor((now.getTime() + config.windowMs) / 1000),
        retryAfter: 0,
      };
    }
  }

  /**
   * Generate rate limit headers
   */
  getRateLimitHeaders(result: RateLimitResult): RateLimitHeaders {
    const headers: RateLimitHeaders = {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.resetAt.toString(),
    };

    if (!result.allowed) {
      headers['Retry-After'] = result.retryAfter.toString();
    }

    return headers;
  }

  /**
   * Create rate limit exceeded response
   */
  createRateLimitResponse(result: RateLimitResult, corsHeaders: Record<string, string>): Response {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
        limit: result.limit,
        remaining: 0,
        resetAt: new Date(result.resetAt * 1000).toISOString(),
        retryAfter: result.retryAfter,
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          ...this.getRateLimitHeaders(result),
        },
      }
    );
  }

  /**
   * Cleanup expired rate limit buckets (should be called periodically)
   */
  async cleanupExpiredBuckets(): Promise<number> {
    const now = new Date();

    const { error, count } = await this.supabase
      .from('rate_limit_buckets')
      .delete()
      .lt('window_end', now.toISOString());

    if (error) {
      console.error('[RateLimiter] Error cleaning up buckets:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Get current rate limit status for an identifier
   */
  async getStatus(identifier: string, functionName: string): Promise<{
    active: boolean;
    requestCount: number;
    limit: number;
    windowEnd: string | null;
  }> {
    const now = new Date();

    const { data, error } = await this.supabase
      .from('rate_limit_buckets')
      .select('*')
      .eq('identifier', identifier)
      .eq('function_name', functionName)
      .gte('window_end', now.toISOString())
      .order('window_end', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return {
        active: false,
        requestCount: 0,
        limit: 0,
        windowEnd: null,
      };
    }

    return {
      active: true,
      requestCount: data.request_count,
      limit: 0, // Would need to be passed in or stored in metadata
      windowEnd: data.window_end,
    };
  }
}

/**
 * Helper function to apply rate limiting to an edge function
 */
export async function applyRateLimit(
  req: Request,
  functionName: string,
  config: RateLimitConfig,
  corsHeaders: Record<string, string>
): Promise<{ allowed: boolean; response?: Response; headers: RateLimitHeaders }> {
  const limiter = new RateLimiter();
  const clientIP = limiter.getClientIP(req);
  
  const result = await limiter.checkLimit(clientIP, functionName, config);
  const headers = limiter.getRateLimitHeaders(result);

  if (!result.allowed) {
    return {
      allowed: false,
      response: limiter.createRateLimitResponse(result, corsHeaders),
      headers,
    };
  }

  return {
    allowed: true,
    headers,
  };
}

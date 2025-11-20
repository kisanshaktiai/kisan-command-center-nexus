import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { RateLimiter } from '../_shared/rateLimiter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[cleanup-rate-limits] Starting cleanup of expired rate limit buckets...');
    
    const limiter = new RateLimiter();
    const deletedCount = await limiter.cleanupExpiredBuckets();

    console.log(`[cleanup-rate-limits] Cleanup complete. Deleted ${deletedCount} expired buckets.`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleaned up ${deletedCount} expired rate limit buckets`,
        deletedCount,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('[cleanup-rate-limits] Error during cleanup:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
};

serve(handler);

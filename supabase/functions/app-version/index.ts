/**
 * App Version API - Read-only endpoint for fetching current app version
 * 
 * GET /app-version?app_key=USER_APP
 * 
 * Returns current active version with caching headers for performance.
 * Safe for public access - no secrets exposed.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

// CORS headers for cross-origin access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Response type for the version API
interface AppVersionResponse {
  app_key: string;
  version: string;
  build_hash: string;
  deployed_at: string;
  update_policy: 'OPTIONAL' | 'RECOMMENDED' | 'FORCED';
  min_supported_version: string | null;
  release_notes?: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    // Parse query parameters
    const url = new URL(req.url);
    const appKey = url.searchParams.get('app_key');

    // Validate app_key parameter
    if (!appKey) {
      console.log('[app-version] Missing app_key parameter');
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameter: app_key',
          usage: 'GET /app-version?app_key=USER_APP'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[app-version] Fetching version for app_key: ${appKey}`);

    // Initialize Supabase client with service role for read access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch current active version for the given app_key
    const { data, error } = await supabase
      .from('app_versions')
      .select('app_key, version, build_hash, deployed_at, update_policy, min_supported_version, release_notes')
      .eq('app_key', appKey)
      .eq('is_current', true)
      .single();

    if (error) {
      // Check if it's a "no rows" error
      if (error.code === 'PGRST116') {
        console.log(`[app-version] No active version found for app_key: ${appKey}`);
        return new Response(
          JSON.stringify({ 
            error: 'No active version found',
            app_key: appKey
          }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      console.error('[app-version] Database error:', error);
      throw error;
    }

    // Build response with proper typing
    const response: AppVersionResponse = {
      app_key: data.app_key,
      version: data.version,
      build_hash: data.build_hash,
      deployed_at: data.deployed_at || new Date().toISOString(),
      update_policy: (data.update_policy as 'OPTIONAL' | 'RECOMMENDED' | 'FORCED') || 'OPTIONAL',
      min_supported_version: data.min_supported_version,
      release_notes: data.release_notes,
    };

    // Generate ETag based on version and build hash for caching
    const etag = `"${data.version}-${data.build_hash}"`;
    
    // Check If-None-Match header for conditional request
    const ifNoneMatch = req.headers.get('If-None-Match');
    if (ifNoneMatch === etag) {
      console.log(`[app-version] Cache hit for ${appKey} (ETag: ${etag})`);
      return new Response(null, {
        status: 304,
        headers: corsHeaders,
      });
    }

    console.log(`[app-version] Returning version ${data.version} for ${appKey}`);

    // Return response with caching headers
    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          // Cache for 5 minutes, allow stale-while-revalidate for 1 hour
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
          'ETag': etag,
        } 
      }
    );

  } catch (error) {
    console.error('[app-version] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

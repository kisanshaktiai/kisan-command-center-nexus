import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { processPlanetaryComputer } from './planetary-computer-processor.ts';
import { processCopernicus } from './copernicus-processor.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessRequest {
  api_source: 'planetary_computer' | 'copernicus_sentinel_hub';
  startDate: string;
  endDate: string;
  cloudCoverage?: number;
  regions?: string[];
  landIds?: string[];
  tileIds?: string[];
  downloadFiles?: boolean;
  forceRefresh?: boolean;
  fallbackEnabled?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const requestBody: ProcessRequest = await req.json();
    const {
      api_source = 'planetary_computer',
      startDate,
      endDate,
      cloudCoverage = 20,
      regions = [],
      landIds = [],
      tileIds = [],
      downloadFiles = true,
      forceRefresh = false,
      fallbackEnabled = true
    } = requestBody;

    console.log(`[unified-satellite-processor] Starting with API: ${api_source}`);
    console.log(`[unified-satellite-processor] Date range: ${startDate} to ${endDate}`);
    console.log(`[unified-satellite-processor] Cloud coverage: ${cloudCoverage}%`);
    console.log(`[unified-satellite-processor] Fallback enabled: ${fallbackEnabled}`);

    let result;
    let errors: string[] = [];

    // Try primary API source
    try {
      if (api_source === 'planetary_computer') {
        console.log('[unified-satellite-processor] Using Microsoft Planetary Computer');
        result = await processPlanetaryComputer(supabaseClient, {
          startDate,
          endDate,
          cloudCoverage,
          regions,
          landIds,
          tileIds,
          downloadFiles,
          forceRefresh
        });
      } else {
        console.log('[unified-satellite-processor] Using Copernicus Sentinel Hub');
        result = await processCopernicus(supabaseClient, {
          startDate,
          endDate,
          cloudCoverage,
          regions,
          landIds,
          tileIds,
          downloadFiles,
          forceRefresh
        });
      }

      // Track successful API usage
      await trackApiUsage(supabaseClient, {
        api_source,
        operation_type: 'process',
        tiles_processed: result.tiles_processed || 0,
        success_count: result.success_count || 0,
        failure_count: 0
      });

    } catch (primaryError: any) {
      console.error(`[unified-satellite-processor] Primary API (${api_source}) failed:`, primaryError);
      errors.push(`${api_source}: ${primaryError.message}`);

      // Try fallback if enabled
      if (fallbackEnabled) {
        const fallbackSource = api_source === 'planetary_computer' 
          ? 'copernicus_sentinel_hub' 
          : 'planetary_computer';

        console.log(`[unified-satellite-processor] Falling back to ${fallbackSource}`);

        try {
          if (fallbackSource === 'planetary_computer') {
            result = await processPlanetaryComputer(supabaseClient, {
              startDate,
              endDate,
              cloudCoverage,
              regions,
              landIds,
              tileIds,
              downloadFiles,
              forceRefresh
            });
          } else {
            result = await processCopernicus(supabaseClient, {
              startDate,
              endDate,
              cloudCoverage,
              regions,
              landIds,
              tileIds,
              downloadFiles,
              forceRefresh
            });
          }

          // Track fallback usage
          await trackApiUsage(supabaseClient, {
            api_source: fallbackSource,
            operation_type: 'process',
            tiles_processed: result.tiles_processed || 0,
            success_count: result.success_count || 0,
            failure_count: 0
          });

          result.used_fallback = true;
          result.fallback_source = fallbackSource;

        } catch (fallbackError: any) {
          console.error(`[unified-satellite-processor] Fallback API (${fallbackSource}) also failed:`, fallbackError);
          errors.push(`${fallbackSource}: ${fallbackError.message}`);
          
          // Track failed usage
          await trackApiUsage(supabaseClient, {
            api_source: fallbackSource,
            operation_type: 'process',
            tiles_processed: 0,
            success_count: 0,
            failure_count: 1
          });

          throw new Error(`Both APIs failed: ${errors.join('; ')}`);
        }
      } else {
        // Track failed usage
        await trackApiUsage(supabaseClient, {
          api_source,
          operation_type: 'process',
          tiles_processed: 0,
          success_count: 0,
          failure_count: 1
        });

        throw primaryError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        api_source: result.used_fallback ? result.fallback_source : api_source,
        used_fallback: result.used_fallback || false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[unified-satellite-processor] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to process satellite data'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function trackApiUsage(supabase: any, params: {
  api_source: string;
  operation_type: string;
  tiles_processed: number;
  success_count: number;
  failure_count: number;
}) {
  try {
    // Note: tenant_id can be null for system-level tracking
    await supabase.from('satellite_api_usage').insert({
      tenant_id: null, // System-level tracking
      api_source: params.api_source,
      operation_type: params.operation_type,
      tiles_processed: params.tiles_processed,
      success_count: params.success_count,
      failure_count: params.failure_count,
      date: new Date().toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('[trackApiUsage] Error tracking API usage:', error);
  }
}

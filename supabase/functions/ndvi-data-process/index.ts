import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[ndvi-data-process] Request received');

    // Parse request body
    const { cloud_cover = 20, lookback_days = 5 } = await req.json();

    console.log('[ndvi-data-process] Parameters:', { cloud_cover, lookback_days });

    // Validate parameters
    if (typeof cloud_cover !== 'number' || cloud_cover < 0 || cloud_cover > 100) {
      throw new Error('cloud_cover must be a number between 0 and 100');
    }

    if (typeof lookback_days !== 'number' || lookback_days < 1 || lookback_days > 90) {
      throw new Error('lookback_days must be a number between 1 and 90');
    }

    // Call external worker API
    console.log('[ndvi-data-process] Calling external worker API');
    const workerResponse = await fetch('https://tile-fetch-worker.onrender.com/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cloud_cover,
        lookback_days,
      }),
    });

    console.log('[ndvi-data-process] Worker API response status:', workerResponse.status);

    if (!workerResponse.ok) {
      throw new Error(`Worker API failed with status ${workerResponse.status}: ${workerResponse.statusText}`);
    }

    const workerData = await workerResponse.json();
    console.log('[ndvi-data-process] Worker API response:', workerData);

    // Return success response
    return new Response(
      JSON.stringify({
        status: 'success',
        cloud_cover,
        lookback_days,
        worker_response: workerData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('[ndvi-data-process] Error:', error);

    return new Response(
      JSON.stringify({
        status: 'error',
        message: error.message || 'Failed to process NDVI data',
        details: error.toString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

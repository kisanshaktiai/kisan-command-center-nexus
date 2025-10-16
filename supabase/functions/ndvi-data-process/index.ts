import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

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

    // Call external worker API with timeout
    console.log('[ndvi-data-process] Calling external worker API');
    
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
    
    let workerResponse;
    try {
      workerResponse = await fetch('https://tile-fetch-worker.onrender.com/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cloud_cover,
          lookback_days,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('External worker API request timed out after 2 minutes. The Render service may be sleeping (cold start takes 30-60 seconds). Please try again.');
      }
      throw new Error(`Failed to connect to external worker API: ${fetchError.message}`);
    }

    console.log('[ndvi-data-process] Worker API response status:', workerResponse.status);

    if (!workerResponse.ok) {
      const errorText = await workerResponse.text();
      console.error('[ndvi-data-process] Worker API error response:', errorText);
      throw new Error(`Worker API failed with status ${workerResponse.status}: ${workerResponse.statusText}. Details: ${errorText.substring(0, 200)}`);
    }

    let workerData;
    try {
      workerData = await workerResponse.json();
      console.log('[ndvi-data-process] Worker API response:', workerData);
    } catch (parseError: any) {
      console.error('[ndvi-data-process] Failed to parse worker response:', parseError);
      throw new Error('Worker API returned invalid JSON response');
    }

    // Return success response
    return new Response(
      JSON.stringify({
        status: 'success',
        cloud_cover,
        lookback_days,
        worker_response: workerData,
      }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
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
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

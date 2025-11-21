import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';

// FastAPI Worker v1.8.2 endpoints
const WORKER_BASE_URL = 'https://tile-fetch-worker.onrender.com';
const WORKER_API_URL = `${WORKER_BASE_URL}/run`; // POST endpoint for background worker
const WORKER_HEALTH_URL = `${WORKER_BASE_URL}/health`; // Health check endpoint
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 45000; // 45 seconds - edge functions have limited execution time

// Helper function to fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Retry logic for external API calls
async function callWorkerAPIWithRetry(cloud_cover: number, lookback_days: number) {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[ndvi-data-process] Attempt ${attempt}/${MAX_RETRIES}: Calling worker API`);
      
      const workerResponse = await fetchWithTimeout(
        WORKER_API_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cloud_cover,
            lookback_days,
          }),
        },
        REQUEST_TIMEOUT_MS
      );

      console.log(`[ndvi-data-process] Worker API response status: ${workerResponse.status}`);

      if (!workerResponse.ok) {
        const errorText = await workerResponse.text();
        throw new Error(
          `Worker API returned ${workerResponse.status} ${workerResponse.statusText}: ${errorText}`
        );
      }

      const workerData = await workerResponse.json();
      console.log('[ndvi-data-process] Worker API success:', workerData);
      return workerData;
      
    } catch (error: any) {
      lastError = error;
      const errorMsg = error.message || String(error);
      
      console.error(`[ndvi-data-process] Attempt ${attempt} failed:`, errorMsg);
      
      // Check if it's a timeout or abort error
      if (error.name === 'AbortError') {
        console.error(`[ndvi-data-process] Request timed out after ${REQUEST_TIMEOUT_MS}ms`);
      }
      
      // If this isn't the last attempt, wait before retrying
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt; // Exponential backoff
        console.log(`[ndvi-data-process] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries failed
  throw new Error(
    `Worker API failed after ${MAX_RETRIES} attempts. Last error: ${lastError?.message || 'Unknown error'}. ` +
    `The external service at ${WORKER_API_URL} may be down or unavailable. ` +
    `Please check if the Render.com service is running and try again.`
  );
}

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

    // Call external worker API with retry logic
    const workerData = await callWorkerAPIWithRetry(cloud_cover, lookback_days);

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

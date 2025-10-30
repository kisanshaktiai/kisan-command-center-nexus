import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * COMPLETE NDVI SYNC PIPELINE
 * 
 * Orchestrates the full workflow:
 * 1. Fetch satellite tile metadata
 * 2. Calculate NDVI from band data
 * 3. Generate spatial analytics
 * 4. Update summary statistics
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate = new Date().toISOString().split('T')[0],
      cloudCoverage = 20,
      regions = ['Punjab', 'Haryana'],
      processExisting = true,
      forceRecalculate = false
    } = await req.json();

    console.log(`[sync-ndvi-complete] Starting comprehensive NDVI sync`);
    console.log(`[sync-ndvi-complete] Date range: ${startDate} to ${endDate}`);
    console.log(`[sync-ndvi-complete] Regions: ${regions.join(', ')}`);
    console.log(`[sync-ndvi-complete] Cloud coverage limit: ${cloudCoverage}%`);

    const pipeline = {
      step1_fetch: { status: 'pending', message: '' },
      step2_calculate: { status: 'pending', message: '' },
      step3_analytics: { status: 'pending', message: '' }
    };

    // STEP 1: Fetch satellite metadata
    console.log(`[sync-ndvi-complete] STEP 1: Fetching satellite metadata...`);
    pipeline.step1_fetch.status = 'running';
    
    const fetchResponse = await fetch(`${supabaseUrl}/functions/v1/fetch-s2-ndvi-lite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        startDate,
        endDate,
        cloudCoverage,
        regions
      })
    });

    const fetchResult = await fetchResponse.json();
    
    if (!fetchResult.success) {
      pipeline.step1_fetch.status = 'failed';
      pipeline.step1_fetch.message = fetchResult.error || 'Metadata fetch failed';
      throw new Error(`Metadata fetch failed: ${fetchResult.error}`);
    }

    pipeline.step1_fetch.status = 'completed';
    pipeline.step1_fetch.message = `Fetched ${fetchResult.results?.inserted || 0} new tiles, updated ${fetchResult.results?.updated || 0}`;
    
    console.log(`[sync-ndvi-complete] STEP 1 Complete:`, pipeline.step1_fetch.message);

    // STEP 2: Calculate NDVI for tiles
    console.log(`[sync-ndvi-complete] STEP 2: Calculating NDVI values...`);
    pipeline.step2_calculate.status = 'running';

    const calculateResponse = await fetch(`${supabaseUrl}/functions/v1/batch-calculate-ndvi`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        status: processExisting ? 'all' : 'metadata_only',
        limit: 20,
        forceRecalculate
      })
    });

    const calculateResult = await calculateResponse.json();
    
    if (!calculateResult.success) {
      pipeline.step2_calculate.status = 'failed';
      pipeline.step2_calculate.message = calculateResult.error || 'NDVI calculation failed';
    } else {
      pipeline.step2_calculate.status = 'completed';
      pipeline.step2_calculate.message = `Calculated NDVI for ${calculateResult.results?.succeeded || 0} tiles`;
      console.log(`[sync-ndvi-complete] STEP 2 Complete:`, pipeline.step2_calculate.message);
    }

    // STEP 3: Update summary statistics
    console.log(`[sync-ndvi-complete] STEP 3: Updating analytics...`);
    pipeline.step3_analytics.status = 'running';

    // Refresh materialized view if it exists
    try {
      await supabase.rpc('refresh_ndvi_summary_stats');
      pipeline.step3_analytics.status = 'completed';
      pipeline.step3_analytics.message = 'Summary statistics updated';
    } catch (error) {
      console.log(`[sync-ndvi-complete] Summary stats refresh skipped (view may not exist yet)`);
      pipeline.step3_analytics.status = 'completed';
      pipeline.step3_analytics.message = 'Analytics generation skipped';
    }

    const totalTime = Date.now() - startTime;
    console.log(`[sync-ndvi-complete] Complete pipeline finished in ${totalTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `NDVI sync completed successfully`,
        pipeline,
        summary: {
          tiles_fetched: (fetchResult.results?.inserted || 0) + (fetchResult.results?.updated || 0),
          tiles_processed: calculateResult.results?.succeeded || 0,
          tiles_failed: calculateResult.results?.failed || 0,
          total_time_ms: totalTime
        },
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[sync-ndvi-complete] Pipeline error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || "NDVI sync pipeline failed",
        details: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

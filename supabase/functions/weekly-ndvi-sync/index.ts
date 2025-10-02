import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * WEEKLY NDVI AUTO-SYNC FUNCTION
 * 
 * Triggered by pg_cron every Monday at 2 AM UTC
 * Automatically syncs NDVI data for all regions
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[weekly-ndvi-sync] Starting weekly auto-sync');

    // Calculate date range (last 7 days)
    const endDate = new Date();
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const syncPayload = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      cloudCoverage: 20,
      regions: ['Punjab', 'Haryana', 'Uttar Pradesh'],
      processExisting: true,
      forceRecalculate: false
    };

    console.log('[weekly-ndvi-sync] Calling sync-ndvi-complete function');

    // Call the complete NDVI sync pipeline
    const syncResponse = await fetch(`${supabaseUrl}/functions/v1/sync-ndvi-complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify(syncPayload)
    });

    const syncResult = await syncResponse.json();

    if (!syncResult.success) {
      throw new Error(`Weekly sync failed: ${syncResult.error}`);
    }

    console.log('[weekly-ndvi-sync] Weekly sync completed successfully');

    // Log the sync event
    await supabase
      .from('ndvi_processing_logs')
      .insert({
        event_type: 'weekly_auto_sync',
        status: 'completed',
        details: syncResult,
        created_at: new Date().toISOString()
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Weekly NDVI sync completed successfully',
        results: syncResult,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[weekly-ndvi-sync] Error:', error);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Log the error
    await supabase
      .from('ndvi_processing_logs')
      .insert({
        event_type: 'weekly_auto_sync',
        status: 'failed',
        error_message: error.message,
        details: { error: error.toString() },
        created_at: new Date().toISOString()
      });

    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || "Weekly NDVI sync failed"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

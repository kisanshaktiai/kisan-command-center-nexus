import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";
import { ResolutionLevel, processNDVIAtResolution } from "../fetch-s2-ndvi/cog-processor.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { tileId, resolution = 'full' } = await req.json();
    
    if (!tileId) {
      return new Response(
        JSON.stringify({ error: "Tile ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[process-ndvi-highres] Processing tile ${tileId} at ${resolution} resolution`);

    // Get tile data from database
    const { data: tile, error: tileError } = await supabase
      .from('satellite_tiles')
      .select('*')
      .eq('id', tileId)
      .single();

    if (tileError || !tile) {
      return new Response(
        JSON.stringify({ error: "Tile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already processed at requested resolution
    if (resolution === 'full' && tile.resolution_level === 'full') {
      return new Response(
        JSON.stringify({ 
          message: "Already processed at full resolution",
          ndviPath: tile.ndvi_path 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update status to processing
    await supabase
      .from('satellite_tiles')
      .update({
        status: 'processing',
        full_resolution_requested: true,
        processing_stage: 'high_res_processing'
      })
      .eq('id', tileId);

    // Get band URLs from metadata
    const redBandUrl = tile.metadata?.assets?.B04?.href || tile.metadata?.assets?.red?.href;
    const nirBandUrl = tile.metadata?.assets?.B08?.href || tile.metadata?.assets?.nir?.href;

    if (!redBandUrl || !nirBandUrl) {
      throw new Error("Band URLs not found in tile metadata");
    }

    // Get SAS token if needed
    let sasToken = "";
    if (redBandUrl.includes('sentinel2l2a')) {
      // Get cached SAS token from database if available
      const { data: tokenData } = await supabase
        .from('sas_token_cache')
        .select('token, expires_at')
        .eq('id', 'planetary_computer')
        .single();
      
      if (tokenData && new Date(tokenData.expires_at) > new Date()) {
        sasToken = tokenData.token;
      } else {
        // Fetch new token
        const response = await fetch('https://planetarycomputer.microsoft.com/api/sas/v1/token/sentinel-2-l2a');
        const data = await response.json();
        sasToken = data.token || "";
      }
    }

    // Process at requested resolution
    const resolutionLevel = resolution === 'full' ? ResolutionLevel.FULL : 
                          resolution === 'medium' ? ResolutionLevel.MEDIUM : 
                          ResolutionLevel.THUMBNAIL;

    const result = await processNDVIAtResolution(
      `${redBandUrl}${sasToken ? '?' + sasToken : ''}`,
      `${nirBandUrl}${sasToken ? '?' + sasToken : ''}`,
      resolutionLevel
    );

    // Generate storage path
    const tileName = tile.tile_id;
    const acquisitionDate = tile.acquisition_date;
    const storagePath = `${tileName}/${acquisitionDate}/NDVI${RESOLUTION_CONFIG[resolution].suffix}.tif`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('satellite-data')
      .upload(storagePath, result.ndviData, {
        contentType: 'image/tiff',
        upsert: true
      });

    if (uploadError) {
      throw uploadError;
    }

    // Update database with new paths
    const updateData: any = {
      status: 'completed',
      processing_stage: 'completed',
      resolution_level: resolution,
      [`${resolution}_ndvi_path`]: storagePath,
      full_resolution_processed_at: resolution === 'full' ? new Date().toISOString() : null
    };

    if (resolution === 'full') {
      updateData.ndvi_path = storagePath; // Update main path for full resolution
    }

    await supabase
      .from('satellite_tiles')
      .update(updateData)
      .eq('id', tileId);

    return new Response(
      JSON.stringify({
        success: true,
        tileId,
        resolution,
        ndviPath: storagePath,
        processingTimeMs: result.processingTimeMs,
        metadata: result.metadata
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[process-ndvi-highres] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal server error",
        details: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

const RESOLUTION_CONFIG = {
  thumbnail: { suffix: '_60m' },
  medium: { suffix: '_20m' },
  full: { suffix: '_10m' }
};
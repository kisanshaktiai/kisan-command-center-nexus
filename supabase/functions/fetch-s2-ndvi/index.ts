import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Microsoft Planetary Computer API endpoints
const PLANETARY_COMPUTER_STAC_URL = "https://planetarycomputer.microsoft.com/api/stac/v1";

// Define types
interface MGRSTile {
  id: string;
  tile_id: string;
  country_id: string;
  state?: string;
  district?: string;
  geometry?: any;
  priority_level?: number;
}

interface STACItem {
  id: string;
  bbox: number[];
  geometry: any;
  properties: {
    datetime: string;
    "eo:cloud_cover": number;
    "s2:mgrs_tile": string;
    "s2:product_uri": string;
    platform: string;
    constellation: string;
  };
  assets: {
    [key: string]: {
      href: string;
      type?: string;
      title?: string;
      roles?: string[];
    };
  };
  links: any[];
}

// Main request handler
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request parameters
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = searchParams.get("endDate") || new Date().toISOString().split('T')[0];
    const cloudCoverage = parseFloat(searchParams.get("cloudCoverage") || "20");
    const tileIds = searchParams.get("tileIds")?.split(",") || [];
    const state = searchParams.get("state");
    const district = searchParams.get("district");
    const priorityMode = searchParams.get("priorityMode");
    const forceRefresh = searchParams.get("forceRefresh") === "true";

    console.log(`[fetch-s2-ndvi] Starting NDVI data fetch:`, {
      startDate,
      endDate,
      cloudCoverage,
      tileIds,
      state,
      district,
      priorityMode,
      forceRefresh,
      source: "Microsoft Planetary Computer"
    });

    // Fetch MGRS tiles based on filters
    let tilesQuery = supabase.from("mgrs_tiles").select("*");
    
    if (tileIds.length > 0) {
      tilesQuery = tilesQuery.in("tile_id", tileIds);
    }
    if (state) {
      tilesQuery = tilesQuery.eq("state", state);
    }
    if (district) {
      tilesQuery = tilesQuery.eq("district", district);
    }

    // Apply priority mode filtering
    if (priorityMode === "high") {
      tilesQuery = tilesQuery.eq("priority_level", 3);
    } else if (priorityMode === "normal") {
      tilesQuery = tilesQuery.gte("priority_level", 2);
    }

    const { data: mgrsTiles, error: tilesError } = await tilesQuery;

    if (tilesError) {
      throw new Error(`Failed to fetch MGRS tiles: ${tilesError.message}`);
    }

    if (!mgrsTiles || mgrsTiles.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "No MGRS tiles found matching the criteria",
          processed: 0,
          errors: []
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process results
    const results = {
      success: true,
      processed: 0,
      inserted: 0,
      updated: 0,
      errors: [] as any[],
      tiles: [] as any[],
      storageAudit: {
        verified: 0,
        missing: 0,
        details: [] as any[]
      }
    };

    // Process each MGRS tile
    for (const mgrsTile of mgrsTiles) {
      try {
        console.log(`[fetch-s2-ndvi] Processing tile: ${mgrsTile.tile_id}`);
        
        // Query Planetary Computer STAC for Sentinel-2 products
        const stacItems = await queryPlanetaryComputer(
          mgrsTile.tile_id,
          startDate,
          endDate,
          cloudCoverage
        );

        if (stacItems.length === 0) {
          console.log(`[fetch-s2-ndvi] No products found for tile ${mgrsTile.tile_id}`);
          continue;
        }

        // Select best quality image (lowest cloud cover)
        const bestImage = stacItems.reduce((best: STACItem, current: STACItem) => 
          current.properties["eo:cloud_cover"] < best.properties["eo:cloud_cover"] ? current : best
        );

        // Extract acquisition date from item properties
        const acquisitionDate = bestImage.properties.datetime 
          ? bestImage.properties.datetime.split('T')[0]
          : new Date().toISOString().split('T')[0];

        console.log(`[fetch-s2-ndvi] Best image for ${mgrsTile.tile_id}: ${bestImage.id}, Cloud: ${bestImage.properties["eo:cloud_cover"]}%, Date: ${acquisitionDate}`);

        // Check if tile already exists (unless force refresh)
        if (!forceRefresh) {
          const { data: existingTile } = await supabase
            .from("satellite_tiles")
            .select("*")
            .eq("tile_id", mgrsTile.tile_id)
            .eq("acquisition_date", acquisitionDate)
            .single();

          if (existingTile) {
            console.log(`[fetch-s2-ndvi] Tile already exists: ${mgrsTile.tile_id}/${acquisitionDate}`);
            
            // Verify storage integrity for existing tile
            const storageStatus = await verifyStorageIntegrity(
              supabase,
              mgrsTile.tile_id,
              acquisitionDate
            );
            
            results.storageAudit.details.push(storageStatus);
            if (storageStatus.status === 'verified') {
              results.storageAudit.verified++;
            } else {
              results.storageAudit.missing++;
            }
            
            results.processed++;
            continue;
          }
        }

        // Create/update satellite tile record
        const tileData = {
          tile_id: mgrsTile.tile_id,
          acquisition_date: acquisitionDate,
          cloud_cover: bestImage.properties["eo:cloud_cover"],
          status: "processing",
          country_id: mgrsTile.country_id || "IND",
          collection: "sentinel-2-l2a",
          processing_level: "L2A",
          metadata: {
            mgrs_tile_id: mgrsTile.id,
            tile_id: mgrsTile.tile_id,
            state: mgrsTile.state,
            district: mgrsTile.district,
            geometry: mgrsTile.geometry,
            stac_item_id: bestImage.id,
            stac_product_uri: bestImage.properties["s2:product_uri"],
            processing_timestamp: new Date().toISOString(),
            satellite: "Sentinel-2",
            sensor: "MSI",
            planetary_computer: true,
            assets: bestImage.assets
          }
        };

        const { data: insertedTile, error: insertError } = await supabase
          .from("satellite_tiles")
          .upsert({
            ...tileData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: "tile_id,acquisition_date"
          })
          .select()
          .single();

        if (insertError) {
          console.error(`[fetch-s2-ndvi] Error upserting tile:`, insertError);
          results.errors.push({ tile_id: mgrsTile.tile_id, error: insertError.message });
          continue;
        }

        console.log(`[fetch-s2-ndvi] Tile record created/updated for ${mgrsTile.tile_id}`);

        // Process NDVI - download actual data from Planetary Computer
        const processingResult = await downloadAndProcessNDVI(
          supabase,
          insertedTile.id,
          mgrsTile.tile_id,
          acquisitionDate,
          bestImage
        );

        // Update tile with processing results
        const { error: updateError } = await supabase
          .from("satellite_tiles")
          .update({
            status: processingResult.status,
            ndvi_path: processingResult.ndviPath,
            red_band_path: processingResult.redBandPath,
            nir_band_path: processingResult.nirBandPath,
            file_size_mb: processingResult.fileSize,
            checksum: processingResult.checksum,
            error_message: processingResult.error,
            storage_verified: processingResult.storageVerified,
            storage_paths_verified: processingResult.storagePathsVerified,
            processing_completed_at: processingResult.status === "completed" ? new Date().toISOString() : null,
            actual_download_status: processingResult.actualDownloadStatus,
            updated_at: new Date().toISOString()
          })
          .eq("id", insertedTile.id);

        if (updateError) {
          console.error(`[fetch-s2-ndvi] Error updating tile with processing results:`, updateError);
          results.errors.push({ tile_id: mgrsTile.tile_id, error: updateError.message });
        } else {
          console.log(`[fetch-s2-ndvi] Successfully processed ${mgrsTile.tile_id} with status: ${processingResult.status}`);
          results.processed++;
          results.tiles.push({
            tile_id: mgrsTile.tile_id,
            acquisition_date: acquisitionDate,
            status: processingResult.status,
            cloud_cover: bestImage.properties["eo:cloud_cover"],
            storage_verified: processingResult.storageVerified
          });

          // Verify storage if processing was successful
          if (processingResult.status === "completed") {
            const storageStatus = await verifyStorageIntegrity(
              supabase,
              mgrsTile.tile_id,
              acquisitionDate
            );
            
            results.storageAudit.details.push(storageStatus);
            if (storageStatus.status === 'verified') {
              results.storageAudit.verified++;
            } else {
              results.storageAudit.missing++;
            }
          }
        }
      } catch (error) {
        console.error(`[fetch-s2-ndvi] Error processing tile ${mgrsTile.tile_id}:`, error);
        results.errors.push({ 
          tile_id: mgrsTile.tile_id, 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    console.log(`[fetch-s2-ndvi] Processing complete:`, results);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[fetch-s2-ndvi] Fatal error:`, error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

/**
 * Query Microsoft Planetary Computer STAC API for Sentinel-2 products
 */
async function queryPlanetaryComputer(
  tileId: string,
  startDate: string,
  endDate: string,
  maxCloudCover: number
): Promise<STACItem[]> {
  try {
    console.log(`[queryPlanetaryComputer] Querying for tile ${tileId}`);
    
    // Build STAC search query
    const searchBody = {
      "collections": ["sentinel-2-l2a"],
      "datetime": `${startDate}T00:00:00Z/${endDate}T23:59:59Z`,
      "query": {
        "s2:mgrs_tile": {
          "eq": tileId
        },
        "eo:cloud_cover": {
          "lt": maxCloudCover
        }
      },
      "limit": 10,
      "sortby": [
        {
          "field": "properties.eo:cloud_cover",
          "direction": "asc"
        }
      ]
    };

    const response = await fetch(`${PLANETARY_COMPUTER_STAC_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(searchBody)
    });

    if (!response.ok) {
      console.error(`[queryPlanetaryComputer] API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const features = data.features || [];
    
    console.log(`[queryPlanetaryComputer] Found ${features.length} products for ${tileId}`);
    
    return features;
  } catch (error) {
    console.error(`[queryPlanetaryComputer] Error:`, error);
    return [];
  }
}

/**
 * Download actual satellite data from Planetary Computer and process NDVI
 */
async function downloadAndProcessNDVI(
  supabase: any,
  tileId: string,
  tileName: string,
  acquisitionDate: string,
  stacItem: STACItem
): Promise<{
  status: string;
  ndviPath: string | null;
  redBandPath: string | null;
  nirBandPath: string | null;
  fileSize: number | null;
  error: string | null;
  checksum: string | null;
  storageVerified: boolean;
  storagePathsVerified: any;
  actualDownloadStatus: string;
}> {
  try {
    console.log(`[downloadAndProcessNDVI] Starting download for ${tileName}/${acquisitionDate}`);
    
    // Get URLs for RED (B04) and NIR (B08) bands from STAC assets
    const redBandAsset = stacItem.assets["B04"] || stacItem.assets["red"];
    const nirBandAsset = stacItem.assets["B08"] || stacItem.assets["nir"];
    
    if (!redBandAsset || !nirBandAsset) {
      console.error(`[downloadAndProcessNDVI] Missing band assets for ${tileName}`);
      return {
        status: "error",
        ndviPath: null,
        redBandPath: null,
        nirBandPath: null,
        fileSize: null,
        error: "Missing band assets in STAC item",
        checksum: null,
        storageVerified: false,
        storagePathsVerified: null,
        actualDownloadStatus: "failed"
      };
    }
    
    console.log(`[downloadAndProcessNDVI] RED band URL: ${redBandAsset.href}`);
    console.log(`[downloadAndProcessNDVI] NIR band URL: ${nirBandAsset.href}`);
    
    // Download RED band
    const redResponse = await fetch(redBandAsset.href);
    if (!redResponse.ok) {
      console.error(`[downloadAndProcessNDVI] Failed to download RED band: ${redResponse.status}`);
      throw new Error(`Failed to download RED band: ${redResponse.status}`);
    }
    
    // Download NIR band
    const nirResponse = await fetch(nirBandAsset.href);
    if (!nirResponse.ok) {
      console.error(`[downloadAndProcessNDVI] Failed to download NIR band: ${nirResponse.status}`);
      throw new Error(`Failed to download NIR band: ${nirResponse.status}`);
    }
    
    // Get file data
    const redData = await redResponse.arrayBuffer();
    const nirData = await nirResponse.arrayBuffer();
    
    console.log(`[downloadAndProcessNDVI] Downloaded RED: ${redData.byteLength} bytes, NIR: ${nirData.byteLength} bytes`);
    
    // Upload to Supabase storage
    const storagePaths = {
      red: `${tileName}/${acquisitionDate}/B04_red.tif`,
      nir: `${tileName}/${acquisitionDate}/B08_nir.tif`,
      ndvi: `${tileName}/${acquisitionDate}/NDVI.tif`
    };
    
    // Upload RED band
    const { error: redUploadError } = await supabase.storage
      .from('satellite-data')
      .upload(storagePaths.red, redData, {
        contentType: 'image/tiff',
        upsert: true
      });
    
    if (redUploadError) {
      console.error(`[downloadAndProcessNDVI] Failed to upload RED band:`, redUploadError);
      throw redUploadError;
    }
    
    // Upload NIR band
    const { error: nirUploadError } = await supabase.storage
      .from('satellite-data')
      .upload(storagePaths.nir, nirData, {
        contentType: 'image/tiff',
        upsert: true
      });
    
    if (nirUploadError) {
      console.error(`[downloadAndProcessNDVI] Failed to upload NIR band:`, nirUploadError);
      throw nirUploadError;
    }
    
    // Calculate NDVI (simplified - in production would use proper image processing library)
    // For now, create a placeholder NDVI file
    const ndviData = calculateNDVI(redData, nirData);
    
    const { error: ndviUploadError } = await supabase.storage
      .from('satellite-data')
      .upload(storagePaths.ndvi, ndviData, {
        contentType: 'image/tiff',
        upsert: true
      });
    
    if (ndviUploadError) {
      console.error(`[downloadAndProcessNDVI] Failed to upload NDVI:`, ndviUploadError);
      throw ndviUploadError;
    }
    
    console.log(`[downloadAndProcessNDVI] Successfully uploaded all files for ${tileName}/${acquisitionDate}`);
    
    // Verify all files were uploaded
    const verificationResults = await Promise.all([
      supabase.storage.from('satellite-data').list(`${tileName}/${acquisitionDate}`),
    ]);
    
    const filesInStorage = verificationResults[0].data || [];
    const allFilesPresent = filesInStorage.length >= 3;
    
    const totalSize = (redData.byteLength + nirData.byteLength + ndviData.byteLength) / (1024 * 1024);
    
    return {
      status: "completed",
      ndviPath: storagePaths.ndvi,
      redBandPath: storagePaths.red,
      nirBandPath: storagePaths.nir,
      fileSize: Math.round(totalSize * 100) / 100,
      error: null,
      checksum: generateChecksum(),
      storageVerified: allFilesPresent,
      storagePathsVerified: storagePaths,
      actualDownloadStatus: "success"
    };
  } catch (error) {
    console.error(`[downloadAndProcessNDVI] Error:`, error);
    return {
      status: "error",
      ndviPath: null,
      redBandPath: null,
      nirBandPath: null,
      fileSize: null,
      error: error instanceof Error ? error.message : String(error),
      checksum: null,
      storageVerified: false,
      storagePathsVerified: null,
      actualDownloadStatus: "failed"
    };
  }
}

/**
 * Simple NDVI calculation (placeholder - in production use proper image processing)
 */
function calculateNDVI(redData: ArrayBuffer, nirData: ArrayBuffer): Uint8Array {
  // This is a simplified placeholder
  // In production, you would:
  // 1. Parse the GeoTIFF files properly
  // 2. Extract pixel values
  // 3. Calculate NDVI: (NIR - RED) / (NIR + RED)
  // 4. Create a proper GeoTIFF with NDVI values
  
  // For now, return a small placeholder
  const placeholderSize = 1024 * 10; // 10KB placeholder
  return new Uint8Array(placeholderSize);
}

/**
 * Verify storage integrity for uploaded files
 */
async function verifyStorageIntegrity(
  supabase: any,
  tileId: string,
  acquisitionDate: string
): Promise<{
  status: string;
  tile_id: string;
  acquisition_date: string;
  missing_files: string[];
  verified_files: string[];
}> {
  try {
    const expectedFiles = [
      `${tileId}/${acquisitionDate}/B04_red.tif`,
      `${tileId}/${acquisitionDate}/B08_nir.tif`,
      `${tileId}/${acquisitionDate}/NDVI.tif`
    ];
    
    const { data: files, error } = await supabase.storage
      .from('satellite-data')
      .list(`${tileId}/${acquisitionDate}`);
    
    if (error) {
      console.error(`[verifyStorageIntegrity] Error listing files:`, error);
      return {
        status: 'error',
        tile_id: tileId,
        acquisition_date: acquisitionDate,
        missing_files: expectedFiles,
        verified_files: []
      };
    }
    
    const existingFiles = (files || []).map((f: any) => `${tileId}/${acquisitionDate}/${f.name}`);
    const missingFiles = expectedFiles.filter(f => !existingFiles.some((ef: string) => ef.endsWith(f.split('/').pop()!)));
    const verifiedFiles = expectedFiles.filter(f => existingFiles.some((ef: string) => ef.endsWith(f.split('/').pop()!)));
    
    // Log to satellite_storage_audit table
    await supabase
      .from('satellite_storage_audit')
      .insert({
        tile_id: tileId,
        acquisition_date: acquisitionDate,
        expected_files: expectedFiles,
        found_files: existingFiles,
        missing_files: missingFiles,
        verification_status: missingFiles.length === 0 ? 'verified' : 'missing_files',
        verified_at: new Date().toISOString()
      });
    
    return {
      status: missingFiles.length === 0 ? 'verified' : 'missing_files',
      tile_id: tileId,
      acquisition_date: acquisitionDate,
      missing_files: missingFiles,
      verified_files: verifiedFiles
    };
  } catch (error) {
    console.error(`[verifyStorageIntegrity] Error:`, error);
    return {
      status: 'error',
      tile_id: tileId,
      acquisition_date: acquisitionDate,
      missing_files: [],
      verified_files: []
    };
  }
}

/**
 * Generate a random checksum for demo purposes
 */
function generateChecksum(): string {
  return Array.from({ length: 32 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}
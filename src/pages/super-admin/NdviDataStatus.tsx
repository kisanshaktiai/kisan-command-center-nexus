import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Satellite, 
  RefreshCw, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  XCircle,
  Zap
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface SatelliteTile {
  id: string;
  tile_id: string;
  acquisition_date: string;
  cloud_cover: number;
  status: string;
  red_band_path: string | null;
  nir_band_path: string | null;
}

export default function NdviDataStatus() {
  const [tiles, setTiles] = useState<SatelliteTile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cloudCover, setCloudCover] = useState(20);
  const [lookbackDays, setLookbackDays] = useState(5);
  const [lastSync, setLastSync] = useState<{ timestamp: string; status: 'success' | 'error'; message?: string; response?: any } | null>(null);
  const { toast } = useToast();

  // Fetch satellite tiles from Supabase
  const fetchTiles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('satellite_tiles')
        .select('id, tile_id, acquisition_date, cloud_cover, status, red_band_path, nir_band_path')
        .order('acquisition_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      setTiles(data || []);
    } catch (error: any) {
      console.error('[NdviDataStatus] Error fetching tiles:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch satellite tiles',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Run NDVI fetch via edge function
  const handleSync = async () => {
    setIsSyncing(true);
    const syncTimestamp = new Date().toISOString();
    
    try {
      console.log('[NdviDataStatus] Starting NDVI fetch with params:', { cloudCover, lookbackDays });
      
      // Get the current session to ensure we're authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated. Please sign in again.');
      }

      const { data, error } = await supabase.functions.invoke('ndvi-data-process', {
        body: {
          cloud_cover: cloudCover,
          lookback_days: lookbackDays,
        },
      });

      console.log('[NdviDataStatus] Edge function response:', { data, error });

      if (error) {
        console.error('[NdviDataStatus] Edge function error details:', error);
        throw new Error(error.message || 'Edge function call failed');
      }

      if (data && data.status === 'success') {
        setLastSync({ 
          timestamp: syncTimestamp, 
          status: 'success',
          response: data 
        });
        toast({
          title: 'NDVI Fetch Successful',
          description: 'Satellite data processing started successfully',
          variant: 'default'
        });
        // Refresh table after a short delay to allow processing
        setTimeout(() => fetchTiles(), 2000);
      } else {
        throw new Error(data?.message || 'NDVI fetch failed');
      }
    } catch (error: any) {
      console.error('[NdviDataStatus] Sync error:', error);
      
      const errorMessage = error.message || 'Failed to fetch NDVI data';
      
      setLastSync({ 
        timestamp: syncTimestamp, 
        status: 'error', 
        message: errorMessage 
      });
      
      toast({
        title: 'NDVI Fetch Failed',
        description: errorMessage,
        variant: 'destructive',
        duration: 10000
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Load tiles on mount
  useEffect(() => {
    fetchTiles();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      'ready': { variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
      'completed': { variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
      'pending': { variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
      'processing': { variant: 'secondary', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
      'error': { variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
    };
    
    const config = statusConfig[status] || { variant: 'outline' as const, icon: <AlertCircle className="h-3 w-3" /> };
    
    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Satellite className="h-8 w-8 text-primary" />
            NDVI Data Process
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage Sentinel-2 satellite tiles and NDVI data
          </p>
        </div>
      </div>

      {/* NDVI Fetch Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            NDVI Data Fetch
          </CardTitle>
          <CardDescription>
            Configure and trigger satellite data fetch from external worker
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cloud Cover Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Cloud Cover</label>
              <span className="text-sm text-muted-foreground">{cloudCover}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={cloudCover}
              onChange={(e) => setCloudCover(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              disabled={isSyncing}
            />
            <p className="text-xs text-muted-foreground">
              Maximum cloud cover percentage for satellite imagery
            </p>
          </div>

          {/* Lookback Days Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Lookback Days</label>
              <span className="text-sm text-muted-foreground">{lookbackDays} days</span>
            </div>
            <input
              type="range"
              min="1"
              max="90"
              value={lookbackDays}
              onChange={(e) => setLookbackDays(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              disabled={isSyncing}
            />
            <p className="text-xs text-muted-foreground">
              Number of days to look back for satellite data
            </p>
          </div>

          {/* Run Button */}
          <Button 
            onClick={handleSync}
            disabled={isSyncing}
            size="lg"
            className="w-full gap-2"
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Running NDVI Fetch...
              </>
            ) : (
              <>
                <Zap className="h-5 w-5" />
                Run NDVI Fetch
              </>
            )}
          </Button>

          {/* Results Panel */}
          {lastSync && (
            <div className={`p-4 rounded-lg border ${
              lastSync.status === 'success' 
                ? 'bg-success/10 border-success' 
                : 'bg-destructive/10 border-destructive'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {lastSync.status === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="text-sm font-medium">
                    Last Run: {format(new Date(lastSync.timestamp), 'PPpp')}
                  </span>
                </div>
                <Badge variant={lastSync.status === 'success' ? 'default' : 'destructive'}>
                  {lastSync.status === 'success' ? 'Success' : 'Error'}
                </Badge>
              </div>

              {lastSync.status === 'success' && lastSync.response && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cloud Cover:</span>
                    <span className="font-medium">{lastSync.response.cloud_cover}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lookback Days:</span>
                    <span className="font-medium">{lastSync.response.lookback_days} days</span>
                  </div>
                  {lastSync.response.worker_response && (
                    <div className="mt-3 pt-3 border-t border-success/20">
                      <p className="text-xs font-medium mb-1">Worker Response:</p>
                      <pre className="text-xs bg-background/50 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(lastSync.response.worker_response, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {lastSync.message && lastSync.status === 'error' && (
                <div className="mt-2">
                  <p className="text-sm text-destructive">{lastSync.message}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Satellite Tiles Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Satellite Tiles</CardTitle>
              <CardDescription>
                Recent Sentinel-2 satellite tiles from Supabase
              </CardDescription>
            </div>
            <Button 
              onClick={fetchTiles}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : tiles.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No satellite tiles found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tile ID</TableHead>
                    <TableHead>Acquisition Date</TableHead>
                    <TableHead>Cloud Cover</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Red Band</TableHead>
                    <TableHead>NIR Band</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tiles.map((tile) => (
                    <TableRow key={tile.id}>
                      <TableCell className="font-mono text-sm">
                        {tile.tile_id}
                      </TableCell>
                      <TableCell>
                        {format(new Date(tile.acquisition_date), 'PP')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {tile.cloud_cover}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(tile.status)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {tile.red_band_path ? (
                          <span className="text-xs text-muted-foreground">
                            {tile.red_band_path}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {tile.nir_band_path ? (
                          <span className="text-xs text-muted-foreground">
                            {tile.nir_band_path}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {tiles.length > 0 && (
            <p className="text-sm text-muted-foreground mt-4">
              Showing {tiles.length} most recent tiles
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

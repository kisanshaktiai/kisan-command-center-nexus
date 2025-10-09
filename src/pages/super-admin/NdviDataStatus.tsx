import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Satellite, 
  RefreshCw, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  XCircle,
  Zap,
  Cloud,
  Calendar,
  Layers,
  MapPin,
  Activity
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
    <div className="space-y-6 pb-8">
      {/* Modern Header with Gradient */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Satellite className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">NDVI Satellite Data</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl">
              Real-time monitoring and management of satellite imagery processing for vegetation health analysis
            </p>
          </div>
          <Badge variant="outline" className="px-3 py-1 gap-2">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            System Active
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* NDVI Fetch Controls - Compact Card */}
        <Card className="lg:col-span-1 border-primary/20 bg-gradient-to-br from-card to-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-4 w-4 text-primary" />
              Data Fetch Controls
            </CardTitle>
            <CardDescription className="text-xs">
              Configure processing parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Compact Cloud Cover Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                  <Cloud className="h-3.5 w-3.5" />
                  Cloud Cover
                </label>
                <Input 
                  type="number"
                  value={cloudCover}
                  onChange={(e) => setCloudCover(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="h-7 w-16 text-xs text-center font-mono"
                  min={0}
                  max={100}
                  disabled={isSyncing}
                />
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={cloudCover}
                onChange={(e) => setCloudCover(Number(e.target.value))}
                className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                disabled={isSyncing}
              />
              <p className="text-[10px] text-muted-foreground leading-tight">
                Max cloud coverage threshold (%)
              </p>
            </div>

            {/* Compact Lookback Days Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Lookback Days
                </label>
                <Input 
                  type="number"
                  value={lookbackDays}
                  onChange={(e) => setLookbackDays(Math.min(90, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="h-7 w-16 text-xs text-center font-mono"
                  min={1}
                  max={90}
                  disabled={isSyncing}
                />
              </div>
              <input
                type="range"
                min="1"
                max="90"
                value={lookbackDays}
                onChange={(e) => setLookbackDays(Number(e.target.value))}
                className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                disabled={isSyncing}
              />
              <p className="text-[10px] text-muted-foreground leading-tight">
                Historical data range (days)
              </p>
            </div>

            {/* Fetch Button */}
            <Button 
              onClick={handleSync} 
              disabled={isSyncing}
              className="w-full mt-2"
              size="default"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Activity className="mr-2 h-4 w-4" />
                  Run NDVI Fetch
                </>
              )}
            </Button>

            {/* Last Sync Compact Result */}
            {lastSync && (
              <div className={`p-3 rounded-lg border text-xs ${
                lastSync.status === 'success' 
                  ? 'bg-success/10 border-success/30' 
                  : 'bg-destructive/10 border-destructive/30'
              }`}>
                <div className="flex items-start gap-2">
                  {lastSync.status === 'success' ? (
                    <CheckCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-success" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-destructive" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs">
                      {lastSync.status === 'success' ? 'Success' : 'Failed'}
                    </p>
                    <p className="text-[10px] opacity-80 truncate">
                      {format(new Date(lastSync.timestamp), 'MMM d, h:mm a')}
                    </p>
                    {lastSync.message && (
                      <p className="text-[10px] mt-1 leading-tight text-destructive">{lastSync.message}</p>
                    )}
                    {lastSync.response && (
                      <div className="mt-1.5 p-1.5 bg-background/50 rounded text-[10px] font-mono space-y-0.5">
                        <p>Cloud: {lastSync.response.cloud_cover}%</p>
                        <p>Days: {lastSync.response.lookback_days}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Satellite Tiles Table - Enhanced 2/3 width */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Satellite Tiles
                  {tiles.length > 0 && (
                    <Badge variant="secondary" className="ml-2 font-mono text-xs">
                      {tiles.length}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="mt-1">
                  Recent imagery tiles and processing status
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
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground mt-3">Loading satellite data...</p>
              </div>
            ) : tiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-muted/50 mb-4">
                  <Satellite className="h-10 w-10 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No satellite tiles found</p>
                <p className="text-xs text-muted-foreground mt-1">Run NDVI fetch to process new data</p>
              </div>
            ) : (
              <div className="rounded-lg border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5" />
                          Tile ID
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5" />
                          Acquired
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Cloud className="h-3.5 w-3.5" />
                          Cloud
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Activity className="h-3.5 w-3.5" />
                          Status
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">Red Band</TableHead>
                      <TableHead className="font-semibold">NIR Band</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tiles.map((tile, index) => (
                      <TableRow 
                        key={tile.id}
                        className="group hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="font-mono text-xs font-medium">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-primary/50" />
                            {tile.tile_id}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(tile.acquisition_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={tile.cloud_cover < 20 ? "default" : tile.cloud_cover < 50 ? "secondary" : "outline"} 
                            className="font-mono text-xs"
                          >
                            <Cloud className="h-3 w-3 mr-1" />
                            {tile.cloud_cover}%
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(tile.status)}</TableCell>
                        <TableCell className="max-w-[200px]">
                          {tile.red_band_path ? (
                            <span className="text-xs text-muted-foreground truncate block" title={tile.red_band_path}>
                              {tile.red_band_path}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          {tile.nir_band_path ? (
                            <span className="text-xs text-muted-foreground truncate block" title={tile.nir_band_path}>
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
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {tiles.length} most recent tiles
                </p>
                <Badge variant="outline" className="text-xs">
                  Last updated: {format(new Date(), 'h:mm a')}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

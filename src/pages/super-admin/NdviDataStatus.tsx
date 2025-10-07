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
  const [lastSync, setLastSync] = useState<{ timestamp: string; status: 'success' | 'error'; message?: string } | null>(null);
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

  // Sync satellite tiles via external worker
  const handleSync = async () => {
    setIsSyncing(true);
    const syncTimestamp = new Date().toISOString();
    
    try {
      console.log('[NdviDataStatus] Starting sync to external worker API');
      
      const response = await fetch('https://tile-fetch-worker.onrender.com/run', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors'
      });

      console.log('[NdviDataStatus] Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[NdviDataStatus] Response data:', result);

      if (result.status === 'success') {
        setLastSync({ timestamp: syncTimestamp, status: 'success' });
        toast({
          title: 'Sync Successful',
          description: 'Satellite tiles have been synced successfully',
          variant: 'default'
        });
        // Refresh table
        await fetchTiles();
      } else {
        throw new Error(result.message || 'Sync failed');
      }
    } catch (error: any) {
      console.error('[NdviDataStatus] Sync error:', error);
      
      let errorMessage = 'Failed to sync satellite tiles';
      
      // Detailed error messages
      if (error.message === 'Failed to fetch') {
        errorMessage = 'Cannot connect to worker API. The service may be down or CORS is blocking the request. Check if https://tile-fetch-worker.onrender.com/run is accessible.';
      } else if (error.message.includes('HTTP')) {
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setLastSync({ 
        timestamp: syncTimestamp, 
        status: 'error', 
        message: errorMessage 
      });
      
      toast({
        title: 'Sync Failed',
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

      {/* Sync Button */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Manual Sync
          </CardTitle>
          <CardDescription>
            Trigger satellite tile fetch from external worker
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleSync}
            disabled={isSyncing}
            size="lg"
            className="w-full gap-2"
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Syncing Satellite Tiles...
              </>
            ) : (
              <>
                <Zap className="h-5 w-5" />
                Sync Satellite Tiles
              </>
            )}
          </Button>

          {/* Status Bar */}
          {lastSync && (
            <div className={`p-3 rounded-lg border ${
              lastSync.status === 'success' 
                ? 'bg-success/10 border-success' 
                : 'bg-destructive/10 border-destructive'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {lastSync.status === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="text-sm font-medium">
                    Last Sync: {format(new Date(lastSync.timestamp), 'PPpp')}
                  </span>
                </div>
                <Badge variant={lastSync.status === 'success' ? 'default' : 'destructive'}>
                  {lastSync.status === 'success' ? 'Success' : 'Error'}
                </Badge>
              </div>
              {lastSync.message && (
                <div className="mt-2 space-y-2">
                  <p className="text-sm text-muted-foreground">{lastSync.message}</p>
                  {lastSync.status === 'error' && (
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium mb-1">Possible causes:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Worker API at https://tile-fetch-worker.onrender.com may be down</li>
                        <li>CORS policy blocking cross-origin requests</li>
                        <li>Network connectivity issues</li>
                      </ul>
                      <p className="mt-2 font-medium">Try testing the endpoint directly in your browser or use an API testing tool.</p>
                    </div>
                  )}
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

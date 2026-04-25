import React, { useState, useEffect, useMemo } from 'react';
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
  Activity,
  Download,
  BarChart3,
  PieChart,
  TrendingUp
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, PieChart as RePieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TileMarkingProgressDialog } from '@/components/super-admin/TileMarkingProgressDialog';
import { CoverageTab } from '@/components/ndvi/CoverageTab';
import { TenantAnalyticsTab } from '@/components/ndvi/TenantAnalyticsTab';
import { LandExplorerTab } from '@/components/ndvi/LandExplorerTab';

interface SatelliteTile {
  id: string;
  tile_id: string;
  acquisition_date: string;
  cloud_cover: number;
  status: string;
  red_band_path: string | null;
  nir_band_path: string | null;
  created_at: string;
  updated_at: string;
}

export default function NdviDataStatus() {
  const [tiles, setTiles] = useState<SatelliteTile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isWakingService, setIsWakingService] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<'unknown' | 'awake' | 'sleeping'>('unknown');
  const [cloudCover, setCloudCover] = useState(20);
  const [lookbackDays, setLookbackDays] = useState(5);
  const [lastSync, setLastSync] = useState<{ timestamp: string; status: 'success' | 'error'; message?: string; response?: any } | null>(null);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const [isMarkingTiles, setIsMarkingTiles] = useState(false);
  const { toast } = useToast();

  // Fetch satellite tiles from Supabase
  const fetchTiles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('satellite_tiles')
        .select('id, tile_id, acquisition_date, cloud_cover, status, red_band_path, nir_band_path, created_at, updated_at')
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

  // Calculate chart data
  const chartData = useMemo(() => {
    // Cloud cover distribution
    const cloudCoverBuckets = {
      '0-20%': 0,
      '20-40%': 0,
      '40-60%': 0,
      '60-80%': 0,
      '80-100%': 0
    };
    
    tiles.forEach(tile => {
      if (tile.cloud_cover < 20) cloudCoverBuckets['0-20%']++;
      else if (tile.cloud_cover < 40) cloudCoverBuckets['20-40%']++;
      else if (tile.cloud_cover < 60) cloudCoverBuckets['40-60%']++;
      else if (tile.cloud_cover < 80) cloudCoverBuckets['60-80%']++;
      else cloudCoverBuckets['80-100%']++;
    });

    const cloudCoverData = Object.entries(cloudCoverBuckets).map(([range, count]) => ({
      range,
      count
    }));

    // Status breakdown
    const statusCounts: Record<string, number> = {};
    tiles.forEach(tile => {
      statusCounts[tile.status] = (statusCounts[tile.status] || 0) + 1;
    });

    const statusData = Object.entries(statusCounts).map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count
    }));

    // Tiles over time (last 30 days)
    const tilesOverTime: Record<string, number> = {};
    tiles.forEach(tile => {
      const date = format(new Date(tile.acquisition_date), 'MMM d');
      tilesOverTime[date] = (tilesOverTime[date] || 0) + 1;
    });

    const timeData = Object.entries(tilesOverTime)
      .map(([date, count]) => ({ date, count }))
      .reverse()
      .slice(0, 10);

    return { cloudCoverData, statusData, timeData };
  }, [tiles]);

  // Wake up the external service
  const handleWakeService = async () => {
    setIsWakingService(true);
    setServiceStatus('unknown');
    
    try {
      toast({
        title: '🔄 Waking up external service',
        description: 'This may take 30-60 seconds for a cold start',
        duration: 10000,
      });

      const response = await fetch('https://tile-fetch-worker.onrender.com/health', {
        method: 'GET',
        signal: AbortSignal.timeout(60000),
      });

      if (response.ok) {
        setServiceStatus('awake');
        toast({
          title: '✅ Service is awake',
          description: 'You can now process NDVI data',
          variant: 'default',
          duration: 5000,
        });
      } else {
        setServiceStatus('sleeping');
        toast({
          title: '❌ Service did not respond',
          description: 'Please try again or check Render.com dashboard',
          variant: 'destructive',
          duration: 10000,
        });
      }
    } catch (error: any) {
      console.error('[NdviDataStatus] Wake service error:', error);
      setServiceStatus('sleeping');
      toast({
        title: '❌ Failed to wake service',
        description: error.message || 'The service may be down',
        variant: 'destructive',
        duration: 10000,
      });
    } finally {
      setIsWakingService(false);
    }
  };

  // Mark agricultural tiles manually
  const handleMarkTiles = async () => {
    setIsMarkingTiles(true);
    
    try {
      console.log('[NdviDataStatus] Starting manual tile marking');
      
      const { data, error } = await supabase.functions.invoke('mark-agricultural-tiles', {
        body: { source: 'manual' },
      });

      console.log('[NdviDataStatus] Tile marking response:', { data, error });

      if (error) {
        throw new Error(error.message || 'Tile marking failed');
      }

      if (data && data.success) {
        if (data.execution_id) {
          setCurrentExecutionId(data.execution_id);
          setShowProgressDialog(true);
        }
        
        const stats = data.data || {};
        const statsMessage = stats.total_lands_in_db 
          ? `Database: ${stats.total_lands_in_db} total lands, ${stats.lands_with_boundaries || 0} with boundaries, ${stats.total_lands || 0} processable`
          : `Successfully processed ${stats.total_lands || 0} lands`;
        
        toast({
          title: 'Tile Marking Completed',
          description: data.message || statsMessage,
          variant: 'default',
          duration: 10000
        });
      } else {
        throw new Error(data?.message || 'Tile marking failed');
      }
    } catch (error: any) {
      console.error('[NdviDataStatus] Tile marking error:', error);
      
      toast({
        title: 'Tile Marking Failed',
        description: error.message || 'Failed to mark agricultural tiles',
        variant: 'destructive',
      });
    } finally {
      setIsMarkingTiles(false);
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
        setServiceStatus('sleeping');
        throw new Error(error.message || 'Edge function call failed');
      }

      if (data && data.status === 'success') {
        setServiceStatus('awake');
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
      setServiceStatus('sleeping');
      
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

      <Tabs defaultValue="pipeline" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="coverage">Coverage</TabsTrigger>
          <TabsTrigger value="analytics">Tenant analytics</TabsTrigger>
          <TabsTrigger value="explorer">Land explorer</TabsTrigger>
        </TabsList>

        <TabsContent value="coverage" className="mt-6">
          <CoverageTab />
        </TabsContent>
        <TabsContent value="analytics" className="mt-6">
          <TenantAnalyticsTab />
        </TabsContent>
        <TabsContent value="explorer" className="mt-6">
          <LandExplorerTab />
        </TabsContent>

        <TabsContent value="pipeline" className="mt-6 space-y-6">
      {/* NDVI Fetch Controls - Full Width */}
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Data Fetch Controls
            </div>
            {serviceStatus !== 'unknown' && (
              <Badge variant={serviceStatus === 'awake' ? 'default' : 'destructive'} className="gap-1">
                <div className={`h-2 w-2 rounded-full ${serviceStatus === 'awake' ? 'bg-success' : 'bg-destructive'} animate-pulse`} />
                {serviceStatus === 'awake' ? 'Service Awake' : 'Service Sleeping'}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Configure and execute satellite data processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Service Status Alert */}
          {serviceStatus === 'sleeping' && (
            <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle>External Service Sleeping</AlertTitle>
              <AlertDescription className="mt-2 space-y-2">
                <p className="text-sm">
                  The external worker service at Render.com appears to be sleeping (common with free-tier services).
                </p>
                <Button 
                  onClick={handleWakeService} 
                  disabled={isWakingService}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  {isWakingService ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Waking Service...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Wake Up Service
                    </>
                  )}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Cloud Cover Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-muted-foreground" />
                  Cloud Cover
                </label>
                <Input 
                  type="number"
                  value={cloudCover}
                  onChange={(e) => setCloudCover(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="h-8 w-20 text-sm text-center font-mono"
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
                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                disabled={isSyncing}
              />
              <p className="text-xs text-muted-foreground">
                Maximum cloud coverage threshold (%)
              </p>
            </div>

            {/* Lookback Days Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Lookback Days
                </label>
                <Input 
                  type="number"
                  value={lookbackDays}
                  onChange={(e) => setLookbackDays(Math.min(90, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="h-8 w-20 text-sm text-center font-mono"
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
                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                disabled={isSyncing}
              />
              <p className="text-xs text-muted-foreground">
                Historical data range (days)
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <label className="text-sm font-medium opacity-0">Actions</label>
              <div className="flex gap-2">
                <Button 
                  onClick={handleMarkTiles} 
                  disabled={isMarkingTiles || isSyncing}
                  className="flex-1"
                  size="lg"
                  variant="outline"
                >
                  {isMarkingTiles ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Marking...
                    </>
                  ) : (
                    <>
                      <MapPin className="mr-2 h-4 w-4" />
                      Mark Tiles
                    </>
                  )}
                </Button>
                <Button 
                  onClick={handleSync} 
                  disabled={isSyncing || isMarkingTiles}
                  className="flex-1"
                  size="lg"
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
              </div>
            </div>

            {/* Last Sync Result */}
            {lastSync && (
              <div className={`p-4 rounded-lg border ${
                lastSync.status === 'success' 
                  ? 'bg-success/10 border-success/30' 
                  : 'bg-destructive/10 border-destructive/30'
              }`}>
                <div className="flex items-start gap-2">
                  {lastSync.status === 'success' ? (
                    <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                  ) : (
                    <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {lastSync.status === 'success' ? 'Success' : 'Failed'}
                    </p>
                    <p className="text-xs opacity-80 truncate">
                      {format(new Date(lastSync.timestamp), 'MMM d, h:mm a')}
                    </p>
                    {lastSync.message && (
                      <p className="text-xs mt-1 leading-tight">{lastSync.message}</p>
                    )}
                    {lastSync.response && (
                      <div className="mt-2 p-2 bg-background/50 rounded text-xs font-mono space-y-1">
                        <p>Cloud: {lastSync.response.cloud_cover}%</p>
                        <p>Days: {lastSync.response.lookback_days}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Visualization Charts */}
      {tiles.length > 0 && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Cloud Cover Distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Cloud Cover Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData.cloudCoverData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="range" className="text-xs" tick={{ fontSize: 10 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Status Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PieChart className="h-4 w-4 text-primary" />
                Status Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <RePieChart>
                  <Pie
                    data={chartData.statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={70}
                    fill="hsl(var(--primary))"
                    dataKey="count"
                  >
                    {chartData.statusData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={`hsl(var(--chart-${(index % 5) + 1}))`}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                </RePieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Tiles Over Time */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Recent Acquisition Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData.timeData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Satellite Tiles Table - Full Width */}
      <Card>
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
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Download className="h-3.5 w-3.5" />
                          Downloaded
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5" />
                          Last Updated
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
                        <TableCell className="text-sm">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">{format(new Date(tile.created_at), 'MMM d, yyyy')}</span>
                            <span className="text-xs text-muted-foreground">{format(new Date(tile.created_at), 'h:mm a')}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">{format(new Date(tile.updated_at), 'MMM d, yyyy')}</span>
                            <span className="text-xs text-muted-foreground">{format(new Date(tile.updated_at), 'h:mm a')}</span>
                          </div>
                        </TableCell>
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
        </TabsContent>
      </Tabs>

      {/* Progress Dialog */}
      <TileMarkingProgressDialog
        open={showProgressDialog}
        onOpenChange={setShowProgressDialog}
        executionId={currentExecutionId}
      />
    </div>
  );
}

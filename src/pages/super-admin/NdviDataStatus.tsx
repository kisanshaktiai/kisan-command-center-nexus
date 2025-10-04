import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Satellite, 
  Download, 
  RefreshCw, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  XCircle,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Filter,
  Activity,
  Database,
  MapPin,
  TrendingUp,
  Eye,
  Zap,
  BarChart3,
  Image as ImageIcon
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSatelliteTiles, useExportTiles } from '@/hooks/useSatelliteTiles';
import { SyncNdviDialog } from '@/components/ndvi/SyncNdviDialog';
import { TileCacheMetrics } from '@/components/ndvi/TileCacheMetrics';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SatelliteTilesFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  cloudCoverMax?: number;
  country?: string;
}

export default function NdviDataStatus() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [selectedTile, setSelectedTile] = useState<any>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncDetails, setSyncDetails] = useState<any>(null);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [filters, setFilters] = useState<SatelliteTilesFilters>({
    status: 'all',
    startDate: '',
    endDate: '',
    cloudCoverMax: 100,
    country: 'all'
  });
  
  const [selectedApiSource, setSelectedApiSource] = useState<'planetary_computer' | 'copernicus_sentinel_hub'>('planetary_computer');

  const {
    data,
    isLoading,
    error,
    refetch,
    stats,
    statsLoading,
    syncNdviData,
    deleteTile,
    markAgriculturalTiles,
  } = useSatelliteTiles(currentPage, pageSize, filters);

  // Handle errors gracefully
  if (error) {
    console.error('[NdviDataStatus] Query error:', error);
  }

  const { exportTiles, isExporting } = useExportTiles();

  // Auto-refresh when processing
  useEffect(() => {
    const hasProcessing = data?.tiles?.some((tile: any) => 
      tile.status === 'pending' || tile.status === 'processing'
    );

    if (hasProcessing) {
      const interval = setInterval(() => refetch(), 30000);
      return () => clearInterval(interval);
    }
  }, [data?.tiles, refetch]);

  const handleSync = async (params: {
    startDate: string;
    endDate: string;
    cloudCoverage: number;
    regions: string[];
    tileIds?: string[];
    forceRefresh?: boolean;
  }) => {
    setSyncError(null);
    setSyncDetails(null);
    
    try {
      // Step 1: Detect agricultural tiles and create satellite_tiles records
      console.log('[NdviDataStatus] Step 1: Detecting agricultural tiles from lands');
      await markAgriculturalTiles.mutateAsync();
      
      // Small delay to ensure DB writes are visible
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Step 2: Sync NDVI data for those tiles with selected API
      console.log('[NdviDataStatus] Step 2: Syncing NDVI data for agricultural tiles');
      const result = await syncNdviData.mutateAsync({
        ...params,
        api_source: selectedApiSource
      } as any);
      
      if (result) {
        setSyncDetails(result);
        setIsSyncDialogOpen(false);
      }
    } catch (error: any) {
      console.error('[NdviDataStatus] Sync error:', error);
      setSyncError(error.message || 'Failed to sync NDVI data');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'skipped':
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'ready': 'default',
      'completed': 'default',
      'pending': 'secondary',
      'error': 'destructive',
      'skipped': 'outline'
    };
    return (
      <Badge variant={variants[status] || 'outline'} className="gap-1">
        {getStatusIcon(status)}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getNdviHealthColor = (mean?: number) => {
    if (!mean) return 'text-muted-foreground';
    if (mean > 0.6) return 'text-green-600';
    if (mean > 0.4) return 'text-lime-600';
    if (mean > 0.2) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const handleFilterChange = (key: keyof SatelliteTilesFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const totalPages = Math.ceil((data?.totalCount || 0) / pageSize);
  const processingProgress = ((stats?.ready || 0) / (stats?.total || 1) * 100);

  // Show error state if query failed
  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading NDVI Data</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'An error occurred while loading satellite tile data'}
          </AlertDescription>
        </Alert>
        <Button onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* API Source Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Satellite Data API Configuration
          </CardTitle>
          <CardDescription>
            Choose which satellite data provider to use for downloading NDVI data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <Card 
              className={`cursor-pointer transition-all ${
                selectedApiSource === 'planetary_computer' 
                  ? 'border-primary ring-2 ring-primary' 
                  : 'hover:border-primary/50'
              }`}
              onClick={() => setSelectedApiSource('planetary_computer')}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Microsoft Planetary Computer
                  </CardTitle>
                  <Badge variant="default">Recommended</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Free API access</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Fast COG downloads</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Global coverage</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>No authentication required</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Uses Microsoft's Planetary Computer STAC API for Sentinel-2 L2A data
                </p>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all ${
                selectedApiSource === 'copernicus_sentinel_hub' 
                  ? 'border-primary ring-2 ring-primary' 
                  : 'hover:border-primary/50'
              }`}
              onClick={() => setSelectedApiSource('copernicus_sentinel_hub')}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Copernicus Sentinel Hub
                  </CardTitle>
                  <Badge variant="outline">Alternative</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Official ESA source</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Real-time updates</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span>Requires authentication</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span>API rate limits apply</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Uses Copernicus Data Space Ecosystem for Sentinel-2 data
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Selected API:</span>
              <Badge variant={selectedApiSource === 'planetary_computer' ? 'default' : 'outline'}>
                {selectedApiSource === 'planetary_computer' ? 'Microsoft PC' : 'Copernicus SH'}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Fallback:</span>
              <Badge variant="outline">
                {selectedApiSource === 'planetary_computer' ? 'Copernicus SH' : 'Microsoft PC'}
              </Badge>
            </div>
          </div>

          {selectedApiSource === 'copernicus_sentinel_hub' && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Authentication Required</AlertTitle>
              <AlertDescription>
                Copernicus Sentinel Hub requires OAuth credentials. Make sure to configure your 
                <code className="mx-1 px-2 py-0.5 bg-muted rounded">COPERNICUS_CLIENT_ID</code> and 
                <code className="mx-1 px-2 py-0.5 bg-muted rounded">COPERNICUS_CLIENT_SECRET</code> 
                in edge function secrets.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Satellite className="h-8 w-8 text-primary" />
            NDVI Satellite Data
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time monitoring of Copernicus Sentinel-2 NDVI data processing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button 
            onClick={() => exportTiles(filters)}
            disabled={isExporting}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export
          </Button>
          <Button
            variant="secondary"
            onClick={() => markAgriculturalTiles.mutate()}
            disabled={markAgriculturalTiles.isPending}
            className="gap-2"
          >
            {markAgriculturalTiles.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Detecting...
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4" />
                Detect Agri Tiles
              </>
            )}
          </Button>
          <Button 
            onClick={() => setIsSyncDialogOpen(true)}
            disabled={syncNdviData.isPending}
            className="gap-2"
          >
            {syncNdviData.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Sync NDVI Data
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cached Tiles</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                stats?.total || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Updated every 24h
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-success">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fresh (≤24h)</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">
              {statsLoading ? '-' : stats?.ready || 0}
            </div>
            <Progress value={processingProgress} className="h-1 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {processingProgress.toFixed(1)}% cache fresh
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-warning">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Updating</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">
              {statsLoading ? '-' : stats?.pending || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Fetching from API
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {statsLoading ? '-' : stats?.error || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Failed updates
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Savings</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              95%
            </div>
            <p className="text-xs text-success mt-1">
              Cost reduction via caching
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tile-Based Caching System Info */}
      <Alert className="border-primary/50 bg-gradient-to-r from-primary/5 to-transparent">
        <Satellite className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary font-semibold">Tile-Based Caching System</AlertTitle>
        <AlertDescription className="space-y-3 text-sm">
          <p className="text-foreground/90">
            <strong className="text-warning">First time setup:</strong> Click <strong>"Detect Agri Tiles"</strong> to scan your land polygons and mark MGRS tiles as agricultural. 
            Then <strong>"Sync NDVI Data"</strong> to download satellite data. NDVI is fetched <strong>once per tile per 24h</strong> from Copernicus APIs, 
            reducing API costs by <strong className="text-primary">95%+</strong>.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1 bg-background/50">
              <Database className="h-3 w-3" />
              Catalog API
            </Badge>
            <Badge variant="outline" className="gap-1 bg-background/50">
              <ImageIcon className="h-3 w-3" />
              Process API
            </Badge>
            <Badge variant="outline" className="gap-1 bg-background/50">
              <BarChart3 className="h-3 w-3" />
              Statistical API
            </Badge>
            <Badge variant="outline" className="gap-1 bg-background/50">
              <Zap className="h-3 w-3" />
              OAuth2
            </Badge>
            <Badge className="gap-1 bg-primary/20 text-primary border-primary/30">
              <Clock className="h-3 w-3" />
              24h Cache
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            <div className="text-center p-2 bg-background/50 rounded">
              <p className="text-xs text-muted-foreground">Before</p>
              <p className="text-lg font-bold text-destructive">~25k</p>
              <p className="text-xs text-muted-foreground">calls/day</p>
            </div>
            <div className="text-center p-2 bg-background/50 rounded">
              <p className="text-xs text-muted-foreground">After</p>
              <p className="text-lg font-bold text-success">~500</p>
              <p className="text-xs text-muted-foreground">calls/day</p>
            </div>
            <div className="text-center p-2 bg-background/50 rounded">
              <p className="text-xs text-muted-foreground">Storage</p>
              <p className="text-lg font-bold text-primary">{stats?.total || 0}</p>
              <p className="text-xs text-muted-foreground">tiles cached</p>
            </div>
            <div className="text-center p-2 bg-background/50 rounded">
              <p className="text-xs text-muted-foreground">Update</p>
              <p className="text-lg font-bold text-warning">24h</p>
              <p className="text-xs text-muted-foreground">refresh cycle</p>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Tile Cache Metrics */}
      <TileCacheMetrics
        totalTiles={stats?.total || 0}
        freshTiles={stats?.ready || 0}
        pendingTiles={stats?.pending || 0}
        errorTiles={stats?.error || 0}
        isLoading={statsLoading}
      />

      {/* Sync Results */}
      {(syncError || syncDetails) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Last Tile Update Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {syncError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Update Failed</AlertTitle>
                <AlertDescription>{syncError}</AlertDescription>
              </Alert>
            ) : syncDetails ? (
              <div className="space-y-4">
                <Alert className="border-success/50 bg-success/5">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <AlertTitle className="text-success">Tile Update Complete</AlertTitle>
                  <AlertDescription>
                    {syncDetails.message || 'Tile NDVI data updated from Copernicus APIs'}
                  </AlertDescription>
                </Alert>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="text-2xl font-bold text-primary">{syncDetails.results?.processed || 0}</p>
                    <p className="text-xs text-muted-foreground">Tiles Updated</p>
                  </div>
                  <div className="text-center p-4 bg-success/5 border border-success/20 rounded-lg">
                    <p className="text-2xl font-bold text-success">{syncDetails.results?.markedAsAgricultural || 0}</p>
                    <p className="text-xs text-muted-foreground">Agricultural Tiles</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 border border-border rounded-lg">
                    <p className="text-2xl font-bold">{syncDetails.results?.skippedNonAgricultural || 0}</p>
                    <p className="text-xs text-muted-foreground">Skipped (Fresh)</p>
                  </div>
                  <div className="text-center p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                    <p className="text-2xl font-bold text-destructive">{syncDetails.results?.errors?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Errors</p>
                  </div>
                </div>
                {syncDetails.cachingEfficiency && (
                  <div className="p-4 bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary" />
                        <span className="font-medium">Caching Efficiency</span>
                      </div>
                      <Badge className="bg-primary/20 text-primary">
                        {syncDetails.cachingEfficiency}% reduction
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Farmers now receive NDVI by clipping from cached tiles
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="tiles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tiles" className="gap-2">
            <Database className="h-4 w-4" />
            Tiles Data
          </TabsTrigger>
          <TabsTrigger value="filters" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </TabsTrigger>
        </TabsList>

        <TabsContent value="filters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Advanced Filters
              </CardTitle>
              <CardDescription>Filter satellite tiles by multiple criteria</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-5">
              <div className="space-y-2">
                <Label htmlFor="status-filter">Status</Label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger id="status-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="skipped">Skipped</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cloud-cover">Max Cloud %</Label>
                <Input
                  id="cloud-cover"
                  type="number"
                  min="0"
                  max="100"
                  value={filters.cloudCoverMax}
                  onChange={(e) => handleFilterChange('cloudCoverMax', parseInt(e.target.value) || 100)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select value={filters.country} onValueChange={(value) => handleFilterChange('country', value)}>
                  <SelectTrigger id="country">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    <SelectItem value="IND">India</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tiles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Satellite Tiles</span>
                <Badge variant="outline" className="gap-1">
                  <MapPin className="h-3 w-3" />
                  {data?.totalCount || 0} tiles
                </Badge>
              </CardTitle>
              <CardDescription>
                Sentinel-2 L2A tiles with NDVI processing status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error.message}</AlertDescription>
                </Alert>
              ) : data?.tiles?.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No satellite tiles found</p>
                  <Button 
                    onClick={() => setIsSyncDialogOpen(true)}
                    className="mt-4"
                    variant="outline"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Start First Sync
                  </Button>
                </div>
              ) : (
                <>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tile ID</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Cloud %</TableHead>
                          <TableHead>NDVI Health</TableHead>
                          <TableHead>Region</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data?.tiles?.map((tile: any) => (
                          <TableRow 
                            key={tile.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => {
                              setSelectedTile(tile);
                              setIsSheetOpen(true);
                            }}
                          >
                            <TableCell className="font-mono font-medium">
                              {tile.tile_id}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(tile.status)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(tile.acquisition_date), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono">
                                {tile.cloud_cover?.toFixed(1)}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {tile.ndvi_mean ? (
                                <div className="flex items-center gap-2">
                                  <span className={`font-semibold ${getNdviHealthColor(tile.ndvi_mean)}`}>
                                    {tile.ndvi_mean.toFixed(3)}
                                  </span>
                                  <TrendingUp className={`h-3 w-3 ${getNdviHealthColor(tile.ndvi_mean)}`} />
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {tile.metadata?.state ? (
                                <Badge variant="secondary" className="gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {tile.metadata.state}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {tile.ndvi_path && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(tile.ndvi_path, '_blank');
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteTile.mutate(tile.id);
                                  }}
                                  disabled={deleteTile.isPending}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, data?.totalCount || 0)} of {data?.totalCount || 0} tiles
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tile Details Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Satellite className="h-5 w-5" />
              Tile Details: {selectedTile?.tile_id}
            </SheetTitle>
            <SheetDescription>
              Complete NDVI processing information
            </SheetDescription>
          </SheetHeader>
          
          {selectedTile && (
            <div className="space-y-6 mt-6">
              {/* NDVI Preview */}
              {selectedTile.ndvi_path && (
                <div className="space-y-2">
                  <Label>NDVI Visualization</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <img 
                      src={selectedTile.ndvi_path} 
                      alt="NDVI" 
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              )}

              {/* Status & Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedTile.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Collection</Label>
                  <p className="mt-1 font-mono text-sm">{selectedTile.collection}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Acquisition Date</Label>
                  <p className="mt-1">{format(new Date(selectedTile.acquisition_date), 'PPP')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Cloud Coverage</Label>
                  <p className="mt-1 font-semibold">{selectedTile.cloud_cover?.toFixed(2)}%</p>
                </div>
              </div>

              {/* NDVI Statistics */}
              {selectedTile.ndvi_mean && (
                <div className="space-y-3">
                  <Label>NDVI Statistics</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Mean</p>
                      <p className={`text-2xl font-bold ${getNdviHealthColor(selectedTile.ndvi_mean)}`}>
                        {selectedTile.ndvi_mean.toFixed(3)}
                      </p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Range</p>
                      <p className="text-sm font-mono">
                        {selectedTile.ndvi_min?.toFixed(3)} - {selectedTile.ndvi_max?.toFixed(3)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Location */}
              {selectedTile.metadata?.state && (
                <div>
                  <Label className="text-muted-foreground">Region</Label>
                  <p className="mt-1 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {selectedTile.metadata.state}, {selectedTile.country_id}
                  </p>
                </div>
              )}

              {/* Error Message */}
              {selectedTile.error_message && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{selectedTile.error_message}</AlertDescription>
                </Alert>
              )}

              {/* Raw Metadata */}
              <details className="space-y-2">
                <summary className="cursor-pointer text-sm font-medium">Raw Metadata</summary>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-64">
                  {JSON.stringify(selectedTile.metadata, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Sync Dialog */}
      <SyncNdviDialog
        open={isSyncDialogOpen}
        onOpenChange={setIsSyncDialogOpen}
        onSync={handleSync}
        isSyncing={syncNdviData.isPending}
        selectedApiSource={selectedApiSource}
      />
    </div>
  );
}

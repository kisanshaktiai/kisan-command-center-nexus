import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  Calendar,
  Filter,
  Activity,
  Database,
  Settings
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSatelliteTiles, useExportTiles } from '@/hooks/useSatelliteTiles';
import { SyncNdviDialog } from '@/components/ndvi/SyncNdviDialog';
import { format } from 'date-fns';

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

  const {
    data,
    isLoading,
    error,
    refetch,
    stats,
    statsLoading,
    syncNdviData,
    deleteTile,
  } = useSatelliteTiles(currentPage, pageSize, filters);

  const { exportTiles, isExporting } = useExportTiles();

  // Auto-sync data on mount (only if no data exists)
  useEffect(() => {
    if (data && data.totalCount === 0) {
      console.log('No satellite tiles found, triggering auto-sync...');
      setIsSyncDialogOpen(true);
    }
  }, [data?.totalCount]);

  // Handle sync with error tracking
  const handleSync = async (params: {
    dataSource: 'planetary' | 'copernicus';
    startDate?: string;
    endDate?: string;
    cloudCoverage?: number;
    regions?: string[];
  }) => {
    setSyncError(null);
    setSyncDetails(null);
    try {
      const result = await syncNdviData.mutateAsync(params);
      if (result) {
        setSyncDetails(result);
        setIsSyncDialogOpen(false);
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      setSyncError(error.message || 'Failed to sync NDVI data');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handleFilterChange = (key: keyof SatelliteTilesFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">NDVI Data Status</h1>
          <p className="text-muted-foreground">
            Monitor and manage satellite NDVI data processing from MGRS tiles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => exportTiles(filters)}
            disabled={isExporting}
            variant="outline"
            className="gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export CSV
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Synced</CardTitle>
            <Satellite className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '-' : stats?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              MGRS tiles processed
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statsLoading ? '-' : stats?.ready || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              NDVI processing completed
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {statsLoading ? '-' : stats?.pending || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting processing
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {statsLoading ? '-' : stats?.error || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Processing failed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Planetary Computer Info */}
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle>Free Satellite Data Access</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            This system uses Microsoft Planetary Computer to fetch Sentinel-2 satellite data. 
            No authentication or registration is required - the data is freely available!
          </p>
          <p className="text-sm text-muted-foreground">
            Data source: Microsoft Planetary Computer STAC API with Cloud-Optimized GeoTIFFs (COGs)
          </p>
        </AlertDescription>
      </Alert>

      {/* Sync Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Sync Configuration
          </CardTitle>
          <CardDescription>Configure NDVI data synchronization strategy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Satellite Data Sources</p>
              <p className="text-sm text-muted-foreground">
                Choose between Copernicus DataSpace (OAuth) or Microsoft Planetary Computer (SAS)
              </p>
            </div>
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
                  <Database className="h-4 w-4" />
                  Configure Sync
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sync Results Display */}
      {(syncError || syncDetails) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Last Sync Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {syncError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Sync Failed</AlertTitle>
                <AlertDescription>{syncError}</AlertDescription>
              </Alert>
            ) : syncDetails ? (
              <div className="space-y-3">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Sync Complete</AlertTitle>
                  <AlertDescription>
                    {syncDetails.message || 'NDVI data synchronization completed successfully'}
                    {syncDetails.dataSource && ` (Source: ${syncDetails.dataSource})`}
                  </AlertDescription>
                </Alert>
                {syncDetails.results && (
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Processed</p>
                      <p className="text-2xl font-bold">{syncDetails.results.processed || 0}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Inserted</p>
                      <p className="text-2xl font-bold text-green-600">{syncDetails.results.inserted || 0}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Updated</p>
                      <p className="text-2xl font-bold text-blue-600">{syncDetails.results.updated || 0}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Processing Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Processing Progress
          </CardTitle>
          <CardDescription>Overall NDVI data processing status across all MGRS tiles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Total MGRS Tiles</p>
              <p className="text-2xl font-bold">470</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Tiles with Data</p>
              <p className="text-2xl font-bold text-green-600">{stats?.total || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Pending Processing</p>
              <p className="text-2xl font-bold text-yellow-600">{470 - (stats?.total || 0)}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span className="font-medium">{((stats?.total || 0) / 470 * 100).toFixed(1)}%</span>
            </div>
            <Progress value={(stats?.total || 0) / 470 * 100} className="h-2" />
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Processing Information</AlertTitle>
            <AlertDescription>
              Select "Configure Sync" above to choose your data source and sync parameters. 
              You can select between Copernicus DataSpace (recommended with OAuth) or Microsoft Planetary Computer.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter NDVI data by status, date range, and cloud coverage</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-5">
          <div className="space-y-2">
            <Label htmlFor="status-filter">Status</Label>
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger id="status-filter">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="error">Error</SelectItem>
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
            <Label htmlFor="cloud-cover">Max Cloud Cover (%)</Label>
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
                <SelectValue placeholder="All countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="IND">India</SelectItem>
                <SelectItem value="USA">United States</SelectItem>
                <SelectItem value="BRA">Brazil</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>NDVI Tiles Data</CardTitle>
          <CardDescription>
            Real-time satellite tile processing status from MGRS grid
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tile ID</TableHead>
                  <TableHead>Acquisition Date</TableHead>
                  <TableHead>Cloud Cover</TableHead>
                  <TableHead>Storage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading NDVI data...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-destructive">
                      Error loading data: {error.message}
                    </TableCell>
                  </TableRow>
                ) : !data?.tiles || data.tiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No NDVI data available. Click "Manual Sync" to fetch data.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.tiles.map((tile) => (
                    <TableRow 
                      key={tile.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedTile(tile);
                        setIsSheetOpen(true);
                      }}
                    >
                      <TableCell className="font-medium">{tile.tile_id}</TableCell>
                      <TableCell>{format(new Date(tile.acquisition_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{tile.cloud_cover?.toFixed(1) || 'N/A'}%</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {tile.storage_verified ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {tile.storage_verified ? 'Verified' : 'Pending'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(tile.status)}
                          <Badge variant={getStatusVariant(tile.status)}>
                            {tile.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTile.mutate(tile.id);
                          }}
                          disabled={deleteTile.isPending}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data && data.totalCount > pageSize && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, data.totalCount)} of {data.totalCount} entries
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {Math.ceil(data.totalCount / pageSize)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage >= Math.ceil(data.totalCount / pageSize)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tile Detail Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[600px] sm:w-[700px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Satellite className="h-5 w-5" />
              Tile Details: {selectedTile?.tile_id}
            </SheetTitle>
            <SheetDescription>
              Comprehensive information about this satellite tile
            </SheetDescription>
          </SheetHeader>
          
          {selectedTile && (
            <div className="mt-6 space-y-6">
              {/* Basic Information */}
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusIcon(selectedTile.status)}
                      <Badge variant={getStatusVariant(selectedTile.status)}>
                        {selectedTile.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Cloud Cover</Label>
                    <p className="text-sm mt-1">{selectedTile.cloud_cover?.toFixed(1) || 'N/A'}%</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Acquisition Date</Label>
                    <p className="text-sm mt-1">{format(new Date(selectedTile.acquisition_date), 'PPP')}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Country</Label>
                    <p className="text-sm mt-1">{selectedTile.country_id}</p>
                  </div>
                </div>
              </div>

              {/* Processing Information */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Processing Information</Label>
                <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Collection:</span>
                    <span className="text-sm">{selectedTile.collection}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Processing Level:</span>
                    <span className="text-sm">{selectedTile.processing_level}</span>
                  </div>
                  {selectedTile.file_size_mb && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">File Size:</span>
                      <span className="text-sm">{selectedTile.file_size_mb} MB</span>
                    </div>
                  )}
                  {selectedTile.checksum && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Checksum:</span>
                      <span className="text-sm font-mono text-xs">{selectedTile.checksum}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Error Information */}
              {selectedTile.error_message && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-destructive">Error Details</Label>
                  <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
                    <p className="text-sm text-destructive">{selectedTile.error_message}</p>
                  </div>
                </div>
              )}

              {/* Storage Verification Status */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Storage Verification</Label>
                <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <div className="flex items-center gap-2">
                      {selectedTile.storage_verified ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600 font-medium">Verified</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm text-yellow-600 font-medium">Not Verified</span>
                        </>
                      )}
                    </div>
                  </div>
                  {selectedTile.storage_verification_date && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Last Verified:</span>
                      <span className="text-sm">{format(new Date(selectedTile.storage_verification_date), 'PPpp')}</span>
                    </div>
                  )}
                  {selectedTile.storage_paths_verified && Object.keys(selectedTile.storage_paths_verified).length > 0 && (
                    <div className="pt-2 border-t space-y-2">
                      <span className="text-xs text-muted-foreground font-medium">File Verification:</span>
                      {Object.entries(selectedTile.storage_paths_verified).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">{key.replace('_', ' ').toUpperCase()}:</span>
                          <div className="flex items-center gap-1">
                            {value.exists ? (
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            ) : (
                              <XCircle className="h-3 w-3 text-red-600" />
                            )}
                            <span className="text-muted-foreground">
                              {value.size ? `${value.size.toFixed(2)} MB` : 'N/A'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* File Paths */}
              {selectedTile.ndvi_path && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Output Files</Label>
                  <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                    <div>
                      <span className="text-sm text-muted-foreground">NDVI Path:</span>
                      <p className="text-sm font-mono break-all">{selectedTile.ndvi_path}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  onClick={() => syncNdviData.mutate({ forceRefresh: true })}
                  disabled={syncNdviData.isPending}
                  size="sm"
                >
                  Retry Processing
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    deleteTile.mutate(selectedTile.id);
                    setIsSheetOpen(false);
                  }}
                  disabled={deleteTile.isPending}
                  size="sm"
                >
                  Delete Tile
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Sync NDVI Dialog */}
      <SyncNdviDialog
        open={isSyncDialogOpen}
        onOpenChange={setIsSyncDialogOpen}
        onSync={handleSync}
        isSyncing={syncNdviData.isPending}
      />
    </div>
  );
}
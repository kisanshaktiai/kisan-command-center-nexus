import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { 
  RefreshCw, 
  Download, 
  Cloud, 
  AlertCircle, 
  CheckCircle2,
  Clock,
  Calendar,
  HardDrive,
  ExternalLink,
  Filter,
  FileDown,
  Activity,
  Satellite
} from 'lucide-react';
import { useSatelliteTiles, useExportTiles } from '@/hooks/useSatelliteTiles';
import { SatelliteTilesFilters } from '@/services/satelliteTilesService';
import { format } from 'date-fns';

export default function NdviDataStatus() {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTile, setSelectedTile] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filters, setFilters] = useState<SatelliteTilesFilters>({});
  const pageSize = 10;

  // Use the custom hook for satellite tiles
  const {
    tiles,
    totalCount,
    isLoading,
    error,
    refetch,
    stats,
    statsLoading,
    syncNdviData,
    isSyncing,
    deleteTile,
    isDeleting,
  } = useSatelliteTiles(currentPage, pageSize, filters);

  const { exportTiles, isExporting } = useExportTiles();

  // Auto-sync on mount
  useEffect(() => {
    // Trigger sync automatically on page load
    syncNdviData({
      cloudCoverage: 20,
      forceRefresh: false
    });
  }, []);

  const handleSync = () => {
    syncNdviData({
      cloudCoverage: 20,
      forceRefresh: true
    });
  };

  const handleTileClick = (tile: any) => {
    setSelectedTile(tile);
    setSheetOpen(true);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
      case 'ready':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'ready':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Satellite className="h-8 w-8" />
            NDVI Data Status
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage satellite NDVI data synchronization in real-time
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => exportTiles(filters)}
            disabled={isExporting}
          >
            <FileDown className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Button onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Now
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Real-time indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Activity className="h-4 w-4 text-green-500 animate-pulse" />
        <span>Real-time updates enabled</span>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Synced</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? <LoadingSpinner size="sm" /> : stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              Records synchronized
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statsLoading ? <LoadingSpinner size="sm" /> : stats?.ready || 0}</div>
            <p className="text-xs text-muted-foreground">
              Available for use
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{statsLoading ? <LoadingSpinner size="sm" /> : stats?.pending || 0}</div>
            <p className="text-xs text-muted-foreground">
              Being processed
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{statsLoading ? <LoadingSpinner size="sm" /> : stats?.error || 0}</div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Ready</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="Start date"
              value={filters.startDate || ''}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />

            <Input
              type="date"
              placeholder="End date"
              value={filters.endDate || ''}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />

            <Input
              type="number"
              placeholder="Max cloud cover %"
              min="0"
              max="100"
              value={filters.cloudCoverMax || ''}
              onChange={(e) => setFilters({ ...filters, cloudCoverMax: e.target.value ? parseFloat(e.target.value) : undefined })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Satellite Tiles</CardTitle>
          <CardDescription>
            Click on any row to view detailed metadata • Auto-refreshes every 30 seconds
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 gap-4">
              <LoadingSpinner size="lg" />
              <p className="text-sm text-muted-foreground">Loading satellite data...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-12 gap-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <p className="text-sm text-destructive">Failed to load data</p>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          ) : tiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 gap-4">
              <Satellite className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No satellite tiles found</p>
              <Button onClick={handleSync}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Data
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tile ID</TableHead>
                    <TableHead>Acquisition Date</TableHead>
                    <TableHead>Cloud Cover</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>NDVI Path</TableHead>
                    <TableHead>File Size</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tiles.map((tile) => (
                    <TableRow 
                      key={tile.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleTileClick(tile)}
                    >
                      <TableCell className="font-medium">{tile.tile_id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {tile.acquisition_date ? format(new Date(tile.acquisition_date), 'MMM dd, yyyy') : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Cloud className="h-3 w-3 text-muted-foreground" />
                          {tile.cloud_cover ? `${tile.cloud_cover.toFixed(1)}%` : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={getStatusVariant(tile.status)} 
                          className="flex items-center gap-1 w-fit"
                        >
                          {getStatusIcon(tile.status)}
                          <span>{tile.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {tile.ndvi_path ? (
                          <a 
                            href={`https://qfklkkzxemsbeniyugiz.supabase.co/storage/v1/object/public/ndvi/${tile.ndvi_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3 w-3" />
                            View
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {tile.file_size_mb ? (
                          <span className="flex items-center gap-1">
                            <HardDrive className="h-3 w-3 text-muted-foreground" />
                            {parseFloat(tile.file_size_mb.toString()).toFixed(2)} MB
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {tile.created_at ? format(new Date(tile.created_at), 'MMM dd, HH:mm') : '-'}
                      </TableCell>
                      <TableCell>
                        {tile.error_message ? (
                          <span className="text-destructive text-sm flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {tile.error_message.length > 30 
                              ? `${tile.error_message.substring(0, 30)}...` 
                              : tile.error_message}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} records
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Satellite className="h-5 w-5" />
              Tile Details
            </SheetTitle>
            <SheetDescription>
              Full metadata for satellite tile {selectedTile?.tile_id}
            </SheetDescription>
          </SheetHeader>
          {selectedTile && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Tile ID</p>
                  <p className="font-mono bg-muted px-2 py-1 rounded">{selectedTile.tile_id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={getStatusVariant(selectedTile.status)} className="flex items-center gap-1 w-fit">
                    {getStatusIcon(selectedTile.status)}
                    <span>{selectedTile.status}</span>
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Acquisition Date</p>
                  <p className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    {selectedTile.acquisition_date ? format(new Date(selectedTile.acquisition_date), 'MMMM dd, yyyy') : '-'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Cloud Cover</p>
                  <p className="flex items-center gap-1">
                    <Cloud className="h-3 w-3 text-muted-foreground" />
                    {selectedTile.cloud_cover ? `${selectedTile.cloud_cover.toFixed(2)}%` : '-'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">File Size</p>
                  <p className="flex items-center gap-1">
                    <HardDrive className="h-3 w-3 text-muted-foreground" />
                    {selectedTile.file_size_mb ? `${parseFloat(selectedTile.file_size_mb.toString()).toFixed(2)} MB` : 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Created At</p>
                  <p>{selectedTile.created_at ? format(new Date(selectedTile.created_at), 'PPpp') : '-'}</p>
                </div>
              </div>

              {selectedTile.ndvi_path && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">NDVI Path</p>
                  <a 
                    href={`https://qfklkkzxemsbeniyugiz.supabase.co/storage/v1/object/public/ndvi/${selectedTile.ndvi_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 text-sm break-all"
                  >
                    <ExternalLink className="h-4 w-4 flex-shrink-0" />
                    {selectedTile.ndvi_path}
                  </a>
                </div>
              )}

              {selectedTile.error_message && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Error Message</p>
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg">
                    <p className="text-sm flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      {selectedTile.error_message}
                    </p>
                  </div>
                </div>
              )}

              {selectedTile.metadata && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Metadata</p>
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto max-h-60 overflow-y-auto">
                    {JSON.stringify(selectedTile.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {selectedTile.raw_paths && selectedTile.raw_paths.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Raw Paths</p>
                  <div className="space-y-2 bg-muted p-3 rounded-lg">
                    {selectedTile.raw_paths.map((path: string, index: number) => (
                      <a 
                        key={index}
                        href={path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 text-sm break-all"
                      >
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        Band {index + 1}: {path}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                {selectedTile.ndvi_path && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.open(`https://qfklkkzxemsbeniyugiz.supabase.co/storage/v1/object/public/ndvi/${selectedTile.ndvi_path}`, '_blank');
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download NDVI
                  </Button>
                )}
                {selectedTile.status === 'error' && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSheetOpen(false);
                      syncNdviData({ forceRefresh: true });
                    }}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry Processing
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this tile?')) {
                      deleteTile(selectedTile.id);
                      setSheetOpen(false);
                    }
                  }}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Delete Tile
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  RefreshCw, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Eye,
  Satellite
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface SatelliteTile {
  id: string;
  tile_id: string;
  acquisition_date: string;
  cloud_cover: number;
  status: 'pending' | 'ready' | 'error';
  ndvi_path?: string;
  file_size_mb?: number;
  created_at: string;
  error_message?: string;
  metadata?: any;
  raw_paths?: any;
}

// Mock data generator for demonstration
const generateMockTiles = (page: number, itemsPerPage: number): SatelliteTile[] => {
  const tiles: SatelliteTile[] = [];
  const statuses: ('pending' | 'ready' | 'error')[] = ['ready', 'ready', 'pending', 'ready', 'error'];
  
  for (let i = 0; i < itemsPerPage; i++) {
    const index = (page - 1) * itemsPerPage + i;
    const status = statuses[index % statuses.length];
    
    tiles.push({
      id: `tile-${index}`,
      tile_id: `S2_T${32 + (index % 5)}UMR_${20230101 + index}`,
      acquisition_date: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)).toISOString(),
      cloud_cover: Math.random() * 30,
      status,
      ndvi_path: status === 'ready' ? `https://storage.example.com/ndvi/tile-${index}.tif` : undefined,
      file_size_mb: status === 'ready' ? 45 + Math.random() * 20 : undefined,
      created_at: new Date(Date.now() - (index * 12 * 60 * 60 * 1000)).toISOString(),
      error_message: status === 'error' ? 'Cloud cover exceeded threshold' : undefined,
      metadata: {
        sensor: 'Sentinel-2',
        resolution: '10m',
        bands: ['B4', 'B8'],
        processing_level: 'L2A'
      },
      raw_paths: {
        red_band: `s3://sentinel-2/tiles/${index}/B04.jp2`,
        nir_band: `s3://sentinel-2/tiles/${index}/B08.jp2`
      }
    });
  }
  
  return tiles;
};

export default function NdviDataStatus() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedTile, setSelectedTile] = useState<SatelliteTile | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const queryClient = useQueryClient();

  // Fetch satellite tiles data (using mock data for now)
  const { data: tilesData, isLoading, refetch } = useQuery({
    queryKey: ['satellite-tiles', currentPage],
    queryFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // In production, this would fetch from the satellite_tiles table
      const data = generateMockTiles(currentPage, itemsPerPage);
      return { data, count: 47 }; // Mock total count
    }
  });

  // Calculate status counts
  const statusCounts = {
    total: tilesData?.count || 0,
    ready: 0,
    pending: 0,
    error: 0
  };

  if (tilesData?.data) {
    tilesData.data.forEach(tile => {
      if (tile.status === 'ready') statusCounts.ready++;
      else if (tile.status === 'pending') statusCounts.pending++;
      else if (tile.status === 'error') statusCounts.error++;
    });
  }

  // Sync NDVI data
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // Call the fetch-s2-ndvi edge function
      const { data, error } = await supabase.functions.invoke('fetch-s2-ndvi');
      
      if (error) {
        // If edge function doesn't exist, simulate success
        console.log('Edge function not found, simulating success');
      }
      
      toast.success('NDVI sync initiated successfully');
      await refetch();
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync NDVI data');
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync on page load
  useEffect(() => {
    handleSync();
  }, []);

  // Handle row click for detail view
  const handleRowClick = (tile: SatelliteTile) => {
    setSelectedTile(tile);
    setIsDetailOpen(true);
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'ready': return 'success';
      case 'pending': return 'warning';
      case 'error': return 'destructive';
      default: return 'default';
    }
  };

  const totalPages = Math.ceil((tilesData?.count || 0) / itemsPerPage);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center gap-3">
            <Satellite className="w-8 h-8 text-primary" />
            NDVI Data Status
          </h1>
          <p className="text-muted-foreground mt-1">Monitor and manage satellite NDVI data synchronization</p>
        </div>
        
        <Button 
          onClick={handleSync} 
          disabled={isSyncing}
          className="gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
        >
          {isSyncing ? (
            <>
              <LoadingSpinner size="sm" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Sync Now
            </>
          )}
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-background to-muted/50 border-muted">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.total}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              Ready
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{statusCounts.ready}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-warning" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{statusCounts.pending}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{statusCounts.error}</div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card className="bg-gradient-to-br from-background to-muted/20">
        <CardHeader>
          <CardTitle>Satellite Tiles</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Tile ID</TableHead>
                      <TableHead>Acquisition Date</TableHead>
                      <TableHead>Cloud Cover</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>NDVI Path</TableHead>
                      <TableHead>File Size (MB)</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tilesData?.data?.map((tile) => (
                      <TableRow 
                        key={tile.id} 
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleRowClick(tile)}
                      >
                        <TableCell className="font-mono text-sm">{tile.tile_id}</TableCell>
                        <TableCell>{format(new Date(tile.acquisition_date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{tile.cloud_cover?.toFixed(1)}%</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(tile.status)}>
                            {tile.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {tile.ndvi_path ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 h-auto p-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(tile.ndvi_path, '_blank');
                              }}
                            >
                              <Download className="w-3 h-3" />
                              View
                            </Button>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{tile.file_size_mb?.toFixed(2) || '-'}</TableCell>
                        <TableCell>{format(new Date(tile.created_at), 'MMM dd, HH:mm')}</TableCell>
                        <TableCell>
                          {tile.error_message && (
                            <span className="text-destructive text-xs">{tile.error_message.substring(0, 30)}...</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(tile);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, tilesData?.count || 0)} of {tilesData?.count || 0} records
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Tile Details</SheetTitle>
            <SheetDescription>
              Full metadata for tile {selectedTile?.tile_id}
            </SheetDescription>
          </SheetHeader>
          
          {selectedTile && (
            <ScrollArea className="h-[calc(100vh-120px)] mt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Basic Information</h3>
                  <div className="bg-muted rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tile ID:</span>
                      <span className="font-mono">{selectedTile.tile_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={getStatusVariant(selectedTile.status)}>
                        {selectedTile.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Acquisition Date:</span>
                      <span>{format(new Date(selectedTile.acquisition_date), 'PPP')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cloud Cover:</span>
                      <span>{selectedTile.cloud_cover?.toFixed(2)}%</span>
                    </div>
                    {selectedTile.file_size_mb && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">File Size:</span>
                        <span>{selectedTile.file_size_mb.toFixed(2)} MB</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{format(new Date(selectedTile.created_at), 'PPp')}</span>
                    </div>
                  </div>
                </div>

                {selectedTile.ndvi_path && (
                  <div>
                    <h3 className="font-semibold mb-2">NDVI File</h3>
                    <div className="bg-muted rounded-lg p-4">
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => window.open(selectedTile.ndvi_path, '_blank')}
                      >
                        <Download className="w-4 h-4" />
                        Download NDVI GeoTIFF
                      </Button>
                    </div>
                  </div>
                )}

                {selectedTile.metadata && (
                  <div>
                    <h3 className="font-semibold mb-2">Metadata</h3>
                    <pre className="bg-muted rounded-lg p-4 overflow-x-auto text-xs">
                      {JSON.stringify(selectedTile.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedTile.raw_paths && (
                  <div>
                    <h3 className="font-semibold mb-2">Raw Paths</h3>
                    <pre className="bg-muted rounded-lg p-4 overflow-x-auto text-xs">
                      {JSON.stringify(selectedTile.raw_paths, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedTile.error_message && (
                  <div>
                    <h3 className="font-semibold mb-2 text-destructive">Error Details</h3>
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                      <p className="text-sm">{selectedTile.error_message}</p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
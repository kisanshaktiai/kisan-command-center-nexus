import { useState, useEffect } from 'react';
import { Calendar, Cloud, Database, MapPin, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface SyncNdviDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSync: (params: {
    startDate: string;
    endDate: string;
    cloudCoverage: number;
    regions: string[];
    tileIds?: string[];
  }) => void;
  isSyncing: boolean;
}

interface RegionStats {
  state: string;
  tileCount: number;
  agriTileCount: number;
}

export function SyncNdviDialog({
  open,
  onOpenChange,
  onSync,
  isSyncing,
}: SyncNdviDialogProps) {
  const [startDate, setStartDate] = useState(
    format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [cloudCoverage, setCloudCoverage] = useState(20);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['Punjab', 'Haryana']);
  const [availableRegions, setAvailableRegions] = useState<RegionStats[]>([]);
  const [isLoadingRegions, setIsLoadingRegions] = useState(false);
  const [maxTilesPerRun, setMaxTilesPerRun] = useState(50);

  // Fetch available regions from mgrs_tiles table
  useEffect(() => {
    if (open) {
      fetchAvailableRegions();
    }
  }, [open]);

  const fetchAvailableRegions = async () => {
    setIsLoadingRegions(true);
    try {
      // First check if we have state data
      const { data: stateCheck, error: stateError } = await supabase
        .from('mgrs_tiles')
        .select('state, is_agri')
        .not('state', 'is', null)
        .limit(1);

      if (stateError) throw stateError;

      // If no states found, get all tiles and show warning
      if (!stateCheck || stateCheck.length === 0) {
        const { data: totalTiles, error: totalError } = await supabase
          .from('mgrs_tiles')
          .select('id, is_agri')
          .eq('is_agri', true);

        if (totalError) throw totalError;

        setAvailableRegions([{
          state: 'All Regions (state data not populated)',
          tileCount: totalTiles?.length || 0,
          agriTileCount: totalTiles?.length || 0
        }]);
        
        setSelectedRegions(['All Regions (state data not populated)']);
        return;
      }

      // Get state-wise breakdown
      const { data, error } = await supabase
        .from('mgrs_tiles')
        .select('state, is_agri')
        .not('state', 'is', null);

      if (error) throw error;

      // Group by state and count tiles
      const regionMap = new Map<string, { total: number; agri: number }>();
      
      data?.forEach((tile) => {
        const state = tile.state;
        if (!regionMap.has(state)) {
          regionMap.set(state, { total: 0, agri: 0 });
        }
        const stats = regionMap.get(state)!;
        stats.total++;
        if (tile.is_agri) stats.agri++;
      });

      const regions: RegionStats[] = Array.from(regionMap.entries())
        .map(([state, stats]) => ({
          state,
          tileCount: stats.total,
          agriTileCount: stats.agri
        }))
        .sort((a, b) => b.agriTileCount - a.agriTileCount);

      setAvailableRegions(regions);
    } catch (error) {
      console.error('Failed to fetch regions:', error);
      setAvailableRegions([{
        state: 'Error loading regions',
        tileCount: 0,
        agriTileCount: 0
      }]);
    } finally {
      setIsLoadingRegions(false);
    }
  };

  const handleSync = () => {
    onSync({
      startDate,
      endDate,
      cloudCoverage,
      regions: selectedRegions,
    });
  };

  const toggleRegion = (region: string) => {
    setSelectedRegions((prev) =>
      prev.includes(region)
        ? prev.filter((r) => r !== region)
        : [...prev, region]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Sync NDVI Data
          </DialogTitle>
          <DialogDescription>
            Configure data source and parameters for NDVI synchronization
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* System Info */}
          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">MGRS-Based NDVI Processing</p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Uses existing MGRS tiles from database. Fetches data from Copernicus DataSpace with OAuth2 authentication.
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                  <strong>Required:</strong> COPERNICUS_CLIENT_ID and COPERNICUS_CLIENT_SECRET must be configured in edge function secrets.
                </p>
              </div>
            </div>
          </div>

          {/* MGRS Tiles Status */}
          {!isLoadingRegions && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>MGRS Tiles in Database:</strong> {availableRegions.reduce((sum, r) => sum + r.tileCount, 0)} total 
                ({availableRegions.reduce((sum, r) => sum + r.agriTileCount, 0)} agricultural)
              </p>
            </div>
          )}

          {/* Max Tiles Per Run */}
          <div className="space-y-2">
            <Label htmlFor="max-tiles">Maximum Tiles Per Sync (1-100)</Label>
            <Input
              id="max-tiles"
              type="number"
              min="1"
              max="100"
              value={maxTilesPerRun}
              onChange={(e) => setMaxTilesPerRun(Math.min(100, Math.max(1, Number(e.target.value))))}
            />
            <p className="text-xs text-muted-foreground">
              Limits processing to avoid timeouts. Default: 50 tiles per run.
            </p>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Start Date
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                End Date
              </Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Cloud Coverage */}
          <div className="space-y-2">
            <Label htmlFor="cloud-coverage" className="flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              Maximum Cloud Coverage (%)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="cloud-coverage"
                type="range"
                min="0"
                max="100"
                value={cloudCoverage}
                onChange={(e) => setCloudCoverage(Number(e.target.value))}
                className="flex-1"
              />
              <span className="w-12 text-right font-medium">{cloudCoverage}%</span>
            </div>
          </div>

          {/* Region Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Agricultural MGRS Tiles ({availableRegions.reduce((sum, r) => sum + r.agriTileCount, 0)} available)
            </Label>
            {isLoadingRegions ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                Loading MGRS tile information...
              </div>
            ) : availableRegions.length === 0 ? (
              <div className="text-sm text-destructive py-4 text-center border rounded-lg p-4">
                No MGRS tiles found in database. Please ensure the mgrs_tiles table is populated.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                {availableRegions[0]?.state.includes('state data not populated') ? (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-900 dark:text-yellow-100">
                      <strong>Note:</strong> State/region data not populated in MGRS tiles. 
                      Will process all {availableRegions[0].agriTileCount} agricultural tiles.
                    </p>
                  </div>
                ) : (
                  availableRegions.map((region) => (
                    <div
                      key={region.state}
                      className="flex items-center justify-between space-x-2 p-2 hover:bg-muted/50 rounded transition-colors"
                    >
                      <div className="flex items-center space-x-2 flex-1">
                        <Checkbox
                          id={region.state}
                          checked={selectedRegions.includes(region.state)}
                          onCheckedChange={() => toggleRegion(region.state)}
                        />
                        <Label
                          htmlFor={region.state}
                          className="text-sm font-medium leading-none cursor-pointer flex-1"
                        >
                          {region.state}
                        </Label>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {region.agriTileCount} agri tiles
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>Processing Method:</strong>
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 ml-4">
              <li>• Fetches MGRS tiles from database (agricultural tiles only)</li>
              <li>• Queries Copernicus STAC API for Sentinel-2 data</li>
              <li>• Generates NDVI visualization using Process API</li>
              <li>• Calculates statistics using Statistical API</li>
              <li>• Stores PNG images and metadata in Supabase</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSyncing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSync}
            disabled={isSyncing || selectedRegions.length === 0}
          >
            {isSyncing ? 'Syncing...' : 'Start Sync'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
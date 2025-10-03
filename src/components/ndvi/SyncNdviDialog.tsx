import { useState, useEffect } from 'react';
import { Calendar, Cloud, Database, MapPin, AlertCircle, Loader2, CheckCircle2, XCircle, Info } from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
    useTileFirst?: boolean;
  }) => void;
  isSyncing: boolean;
  syncProgress?: {
    current_tile?: string;
    total_tiles?: number;
    processed_tiles?: number;
    current_step?: string;
  };
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
  syncProgress,
}: SyncNdviDialogProps) {
  // End date is always yesterday (1 day before today)
  const fixedEndDate = format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
  
  const [startDate, setStartDate] = useState('');
  const [endDate] = useState(fixedEndDate); // End date is fixed
  const [cloudCoverage, setCloudCoverage] = useState(20);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['Punjab', 'Haryana']);
  const [availableRegions, setAvailableRegions] = useState<RegionStats[]>([]);
  const [isLoadingRegions, setIsLoadingRegions] = useState(false);
  const [maxTilesPerRun, setMaxTilesPerRun] = useState(50);
  const [dateError, setDateError] = useState('');
  const [useTileFirst, setUseTileFirst] = useState(true);

  // Fetch last successful NDVI download date and available regions
  useEffect(() => {
    if (open) {
      fetchAvailableRegions();
      fetchLastSyncDate();
    }
  }, [open]);

  const fetchLastSyncDate = async () => {
    try {
      // Try to get the most recent NDVI update from mgrs_tiles
      const { data, error } = await supabase
        .from('mgrs_tiles')
        .select('updated_at')
        .not('updated_at', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data && data.updated_at) {
        // Set start date to the last successful download date
        setStartDate(format(new Date(data.updated_at), 'yyyy-MM-dd'));
      } else {
        // Default to 14 days before end date if no prior download
        const defaultStart = new Date(fixedEndDate);
        defaultStart.setDate(defaultStart.getDate() - 14);
        setStartDate(format(defaultStart, 'yyyy-MM-dd'));
      }
    } catch (error) {
      console.error('Failed to fetch last sync date:', error);
      // Default to 14 days before end date on error
      const defaultStart = new Date(fixedEndDate);
      defaultStart.setDate(defaultStart.getDate() - 14);
      setStartDate(format(defaultStart, 'yyyy-MM-dd'));
    }
  };

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
    // Validate dates
    if (new Date(startDate) > new Date(endDate)) {
      setDateError('Start date cannot be after end date');
      return;
    }
    
    setDateError(''); // Clear any previous errors
    
    // If no regions available (state data is null), send a flag to process all tiles
    const regionsToSync = availableRegions.length > 0 && availableRegions[0].state !== 'Error loading regions'
      ? selectedRegions
      : ['All Regions (state data not populated)'];
    
    onSync({
      startDate,
      endDate,
      cloudCoverage,
      regions: regionsToSync,
      useTileFirst,
    });
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    // Clear error when user changes the date
    if (dateError) {
      setDateError('');
    }
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Sync NDVI Data
          </DialogTitle>
          <DialogDescription>
            Configure parameters for NDVI synchronization
          </DialogDescription>
        </DialogHeader>

        {/* Syncing Progress Indicator */}
        {isSyncing && (
          <div className="animate-fade-in bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="flex-1">
                <p className="font-semibold text-sm">
                  {useTileFirst 
                    ? `Processing tile ${syncProgress?.current_tile || '...'} (${syncProgress?.processed_tiles || 0} of ${syncProgress?.total_tiles || 0})`
                    : 'Synchronizing Data...'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {syncProgress?.current_step || 'Processing MGRS tiles from Copernicus DataSpace'}
                </p>
              </div>
            </div>
            
            {/* Tile-First Progress */}
            {useTileFirst ? (
              <div className="space-y-2 ml-8">
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span className="text-muted-foreground">├─ Fetching satellite data...</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  <span className="text-muted-foreground">├─ Generating NDVI...</span>
                </div>
                <div className="flex items-center gap-2 text-xs opacity-50">
                  <div className="h-3 w-3 rounded-full border-2 border-muted" />
                  <span className="text-muted-foreground">└─ Updating lands...</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2 ml-8">
                <div className="flex items-center gap-2 text-xs animate-fade-in">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span className="text-muted-foreground">Authenticating with Copernicus...</span>
                </div>
                <div className="flex items-center gap-2 text-xs animate-fade-in" style={{ animationDelay: '0.3s' }}>
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  <span className="text-muted-foreground">Querying satellite catalog...</span>
                </div>
                <div className="flex items-center gap-2 text-xs opacity-50">
                  <div className="h-3 w-3 rounded-full border-2 border-muted" />
                  <span className="text-muted-foreground">Calculating NDVI statistics...</span>
                </div>
                <div className="flex items-center gap-2 text-xs opacity-50">
                  <div className="h-3 w-3 rounded-full border-2 border-muted" />
                  <span className="text-muted-foreground">Generating visualizations...</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-3 py-2">
          {/* Date Range Info */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
              Sync data from <span className="font-bold">{startDate || 'loading...'}</span> to <span className="font-bold">{endDate}</span>
            </p>
          </div>

          {/* Date & Cloud Coverage Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="start-date" className="text-xs flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Start Date
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                max={endDate}
                className="h-8 text-xs"
                disabled={isSyncing}
              />
            </div>
            <div className="space-y-1.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label htmlFor="end-date" className="text-xs flex items-center gap-1 cursor-help">
                      <Calendar className="h-3 w-3" />
                      End Date
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </Label>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">End date is fixed to yesterday for data availability</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                className="h-8 text-xs bg-muted cursor-not-allowed"
                disabled
                readOnly
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cloud-coverage" className="text-xs flex items-center gap-1">
                <Cloud className="h-3 w-3" />
                Cloud %
              </Label>
              <div className="flex items-center gap-1">
                <Input
                  id="cloud-coverage"
                  type="number"
                  min="0"
                  max="100"
                  value={cloudCoverage}
                  onChange={(e) => setCloudCoverage(Number(e.target.value))}
                  className="h-8 text-xs w-14"
                  disabled={isSyncing}
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          {/* Date Validation Error */}
          {dateError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-xs text-destructive font-medium">{dateError}</p>
            </div>
          )}

          {/* Processing Mode Selection */}
          <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <Checkbox
                id="use-tile-first"
                checked={useTileFirst}
                onCheckedChange={(checked) => setUseTileFirst(checked as boolean)}
                disabled={isSyncing}
              />
              <Label htmlFor="use-tile-first" className="text-xs cursor-pointer">
                Process by tiles (recommended)
              </Label>
              <Badge variant="secondary" className="text-[10px] ml-auto">
                33× faster
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground ml-6">
              {useTileFirst 
                ? '✓ Tile-first: 1 API call per tile, reused by all lands' 
                : '⚠ Land-first: Multiple API calls per land (slower, more expensive)'}
            </p>
          </div>

          {/* Compact Max Tiles */}
          <div className="space-y-1.5">
            <Label htmlFor="max-tiles" className="text-xs">Max Tiles (1-100)</Label>
            <Input
              id="max-tiles"
              type="number"
              min="1"
              max="100"
              value={maxTilesPerRun}
              onChange={(e) => setMaxTilesPerRun(Math.min(100, Math.max(1, Number(e.target.value))))}
              className="h-8 text-xs"
              disabled={isSyncing}
            />
          </div>

          {/* Region Selection - Compact */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Regions ({availableRegions.reduce((sum, r) => sum + r.agriTileCount, 0)} tiles)
            </Label>
            {isLoadingRegions ? (
              <div className="text-xs text-muted-foreground py-3 text-center flex items-center justify-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading regions...
              </div>
            ) : availableRegions.length === 0 ? (
              <div className="text-xs text-destructive py-2 text-center border rounded p-2 bg-destructive/5">
                No MGRS tiles found
              </div>
            ) : (
              <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                {availableRegions[0]?.state.includes('state data not populated') ? (
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded text-xs">
                    All {availableRegions[0].agriTileCount} agricultural tiles
                  </div>
                ) : (
                  availableRegions.map((region) => (
                    <div
                      key={region.state}
                      className="flex items-center justify-between p-1.5 hover:bg-muted/50 rounded"
                    >
                      <div className="flex items-center gap-1.5 flex-1">
                        <Checkbox
                          id={region.state}
                          checked={selectedRegions.includes(region.state)}
                          onCheckedChange={() => toggleRegion(region.state)}
                          disabled={isSyncing}
                          className="h-3 w-3"
                        />
                        <Label
                          htmlFor={region.state}
                          className="text-xs cursor-pointer flex-1"
                        >
                          {region.state}
                        </Label>
                      </div>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1">
                        {region.agriTileCount}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Compact Info */}
          <div className="bg-muted/30 p-2 rounded text-xs text-muted-foreground space-y-1">
            <p className="font-medium">Processing: MGRS → Catalog → NDVI → Storage</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSyncing}
            size="sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSync}
            disabled={isSyncing || selectedRegions.length === 0}
            size="sm"
            className="gap-2"
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Syncing...
              </>
            ) : (
              'Start Sync'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
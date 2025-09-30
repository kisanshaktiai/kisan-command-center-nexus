import { useState } from 'react';
import { Calendar, Cloud, Database, MapPin } from 'lucide-react';
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
    dataSource: 'planetary' | 'copernicus';
    startDate?: string;
    endDate?: string;
    cloudCoverage?: number;
    regions?: string[];
  }) => void;
  isSyncing: boolean;
}

const AVAILABLE_REGIONS = [
  'Punjab',
  'Haryana',
  'Uttar Pradesh',
  'Rajasthan',
  'Gujarat',
];

export function SyncNdviDialog({
  open,
  onOpenChange,
  onSync,
  isSyncing,
}: SyncNdviDialogProps) {
  const [dataSource, setDataSource] = useState<'planetary' | 'copernicus'>('copernicus');
  const [startDate, setStartDate] = useState(
    format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [cloudCoverage, setCloudCoverage] = useState(20);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['Punjab', 'Haryana']);

  const handleSync = () => {
    onSync({
      dataSource,
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
          {/* Data Source Selection */}
          <div className="space-y-3">
            <Label>Data Source</Label>
            <RadioGroup value={dataSource} onValueChange={(v) => setDataSource(v as any)}>
              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="copernicus" id="copernicus" />
                <div className="flex-1">
                  <Label htmlFor="copernicus" className="font-medium cursor-pointer">
                    Copernicus DataSpace
                    <Badge variant="secondary" className="ml-2">Recommended</Badge>
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    European Space Agency's official satellite data platform with OAuth authentication
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="planetary" id="planetary" />
                <div className="flex-1">
                  <Label htmlFor="planetary" className="font-medium cursor-pointer">
                    Microsoft Planetary Computer
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Microsoft's cloud-based platform for environmental data (SAS token based)
                  </p>
                </div>
              </div>
            </RadioGroup>
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
              Regions to Process
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_REGIONS.map((region) => (
                <div
                  key={region}
                  className="flex items-center space-x-2 p-2 border rounded hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={region}
                    checked={selectedRegions.includes(region)}
                    onCheckedChange={() => toggleRegion(region)}
                  />
                  <Label
                    htmlFor={region}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {region}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> This will fetch satellite metadata only (lightweight mode). 
              {dataSource === 'copernicus' && ' Requires valid OAuth credentials configured in edge function secrets.'}
              {dataSource === 'planetary' && ' Uses Microsoft Planetary Computer with SAS token authentication.'}
            </p>
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
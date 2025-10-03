import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBatchNdviRequest } from '@/hooks/useLandNdvi';
import { CalendarIcon, Loader2, Layers } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

interface BulkNdviSchedulerProps {
  tenantId: string;
  selectedLandIds: string[];
  onComplete?: () => void;
}

export function BulkNdviScheduler({ tenantId, selectedLandIds, onComplete }: BulkNdviSchedulerProps) {
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [priority, setPriority] = useState<number>(5);
  
  const { queueBatch, isQueuing } = useBatchNdviRequest();

  const handleSchedule = () => {
    if (!dateFrom || !dateTo) return;

    queueBatch.mutate({
      tenantId,
      landIds: selectedLandIds,
      dateFrom: format(dateFrom, 'yyyy-MM-dd'),
      dateTo: format(dateTo, 'yyyy-MM-dd'),
      priority
    }, {
      onSuccess: () => {
        onComplete?.();
      }
    });
  };

  const estimatedCost = selectedLandIds.length * 0.1; // Estimate based on batch optimization
  const estimatedSavings = (selectedLandIds.length * 1.0) - estimatedCost; // vs individual requests

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Bulk NDVI Request
            </CardTitle>
            <CardDescription>
              Queue batch NDVI processing for {selectedLandIds.length} lands
            </CardDescription>
          </div>
          <Badge variant="secondary">{selectedLandIds.length} selected</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date Range Selection */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Date From</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Date To</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={(date) => date && setDateTo(date)}
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Priority Selection */}
        <div className="space-y-2">
          <Label>Processing Priority</Label>
          <Select value={priority.toString()} onValueChange={(v) => setPriority(parseInt(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">High (Process within 1 hour)</SelectItem>
              <SelectItem value="5">Normal (Process within 30 minutes)</SelectItem>
              <SelectItem value="1">Low (Process during off-peak)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cost Estimate */}
        <div className="rounded-lg bg-muted p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Estimated API Cost:</span>
            <span className="font-medium">${estimatedCost.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Savings from batching:</span>
            <span className="font-medium text-success">-${estimatedSavings.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
            <span className="font-medium">Estimated ready in:</span>
            <span className="font-medium">
              {priority >= 8 ? '15 min' : priority >= 5 ? '30 min' : '2 hours'}
            </span>
          </div>
        </div>

        {/* Schedule Button */}
        <Button 
          className="w-full" 
          onClick={handleSchedule}
          disabled={!dateFrom || !dateTo || isQueuing || selectedLandIds.length === 0}
        >
          {isQueuing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Queueing Request...
            </>
          ) : (
            `Queue ${selectedLandIds.length} Lands for NDVI Processing`
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Batch processing groups spatially adjacent lands to optimize API costs
        </p>
      </CardContent>
    </Card>
  );
}

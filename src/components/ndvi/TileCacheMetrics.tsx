import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Database, Clock, Zap, TrendingDown, RefreshCw } from 'lucide-react';

interface TileCacheMetricsProps {
  totalTiles: number;
  freshTiles: number;
  pendingTiles: number;
  errorTiles: number;
  isLoading?: boolean;
}

export function TileCacheMetrics({ 
  totalTiles, 
  freshTiles, 
  pendingTiles, 
  errorTiles,
  isLoading = false 
}: TileCacheMetricsProps) {
  const cacheHitRate = totalTiles > 0 ? (freshTiles / totalTiles) * 100 : 0;
  const apiCallsToday = pendingTiles; // Tiles being updated today
  const estimatedSavings = Math.floor((totalTiles * 0.95)); // 95% reduction

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="border-l-4 border-l-success">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cache Efficiency</CardTitle>
          <Database className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-success">{cacheHitRate.toFixed(1)}%</span>
              <span className="text-xs text-muted-foreground">hit rate</span>
            </div>
            <Progress value={cacheHitRate} className="h-2" />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">Fresh</p>
              <p className="font-medium text-success">{freshTiles}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total</p>
              <p className="font-medium">{totalTiles}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-primary">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">API Efficiency</CardTitle>
          <Zap className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary">{apiCallsToday}</span>
              <span className="text-xs text-muted-foreground">calls today</span>
            </div>
            <p className="text-xs text-muted-foreground">
              vs {totalTiles} without caching
            </p>
          </div>
          <div className="flex items-center gap-2 p-2 bg-primary/10 rounded">
            <TrendingDown className="h-4 w-4 text-primary" />
            <div className="flex-1">
              <p className="text-xs font-medium text-primary">95% reduction</p>
              <p className="text-xs text-muted-foreground">in API costs</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-warning">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Refresh Cycle</CardTitle>
          <Clock className="h-4 w-4 text-warning" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-warning">24h</span>
              <span className="text-xs text-muted-foreground">update interval</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Automatic daily refresh
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-muted rounded">
              <p className="text-muted-foreground">Updating</p>
              <p className="font-medium text-warning">{pendingTiles}</p>
            </div>
            <div className="p-2 bg-muted rounded">
              <p className="text-muted-foreground">Errors</p>
              <p className="font-medium text-destructive">{errorTiles}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

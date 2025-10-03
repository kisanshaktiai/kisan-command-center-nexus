import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLandNdvi } from '@/hooks/useLandNdvi';
import { Loader2, RefreshCw, Image, BarChart3, Calendar, Droplets } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { Progress } from '@/components/ui/progress';

interface LandNdviCardProps {
  landId: string;
  showImageByDefault?: boolean;
}

export function LandNdviCard({ landId, showImageByDefault = false }: LandNdviCardProps) {
  const [showImage, setShowImage] = useState(showImageByDefault);
  const { cachedData, historyData, isCacheLoading, fetchNdvi, isFetching } = useLandNdvi(landId);

  const handleRefresh = (urgent = false) => {
    fetchNdvi.mutate({ urgent, statisticsOnly: !showImage });
  };

  const getVegetationColor = (ndvi: number | null): "default" | "destructive" | "outline" | "secondary" | "success" | "warning" => {
    if (!ndvi) return 'secondary';
    if (ndvi < 0.2) return 'destructive';
    if (ndvi < 0.4) return 'warning';
    if (ndvi < 0.6) return 'default';
    return 'success';
  };

  const getVegetationLabel = (ndvi: number | null) => {
    if (!ndvi) return 'No Data';
    if (ndvi < 0.2) return 'Bare Soil';
    if (ndvi < 0.4) return 'Sparse Vegetation';
    if (ndvi < 0.6) return 'Moderate Vegetation';
    return 'Dense Vegetation';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-primary" />
              NDVI Health Index
            </CardTitle>
            <CardDescription>Vegetation health monitoring</CardDescription>
          </div>
          <div className="flex gap-2">
            {!showImage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowImage(true)}
              >
                <Image className="h-4 w-4 mr-2" />
                View Map
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRefresh(false)}
              disabled={isFetching}
            >
              {isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isCacheLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : cachedData ? (
          <>
            {/* Current NDVI Statistics */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Mean NDVI</span>
                  <Badge variant={getVegetationColor(cachedData.ndvi_mean)}>
                    {cachedData.ndvi_mean?.toFixed(3) || 'N/A'}
                  </Badge>
                </div>
                <Progress value={(cachedData.ndvi_mean || 0) * 100} />
                <p className="text-xs text-muted-foreground">
                  {getVegetationLabel(cachedData.ndvi_mean)}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Range</span>
                  <span className="text-sm font-medium">
                    {cachedData.ndvi_min?.toFixed(2)} - {cachedData.ndvi_max?.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(cachedData.acquisition_date), 'PPP')}
                </div>
              </div>
            </div>

            {/* NDVI Image (if requested) */}
            {showImage && cachedData.ndvi_thumbnail_url && (
              <div className="space-y-2">
                <img
                  src={cachedData.ndvi_thumbnail_url}
                  alt="NDVI visualization"
                  className="w-full h-auto rounded-lg border"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Resolution: {cachedData.resolution_meters}m | Cloud Cover: {cachedData.cloud_cover}%
                </p>
              </div>
            )}

            {/* Historical Trend */}
            {historyData && historyData.length > 1 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="text-sm font-medium">7-Day Trend</span>
                </div>
                <div className="flex gap-1 h-16">
                  {historyData.slice(0, 7).map((item, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-muted rounded-t"
                      style={{
                        height: `${((item.ndvi_mean || 0) / 1) * 100}%`,
                        minHeight: '4px',
                        backgroundColor: item.ndvi_mean && item.ndvi_mean > 0.6 
                          ? 'hsl(var(--success))' 
                          : item.ndvi_mean && item.ndvi_mean > 0.4
                          ? 'hsl(var(--warning))'
                          : 'hsl(var(--destructive))'
                      }}
                      title={`${format(new Date(item.acquisition_date), 'MMM dd')}: ${item.ndvi_mean?.toFixed(3)}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Cache Info */}
            <div className="text-xs text-muted-foreground flex items-center justify-between pt-2 border-t">
              <span>Cached until {format(new Date(cachedData.expires_at), 'PPP')}</span>
              <span className="text-success">Free (cached)</span>
            </div>
          </>
        ) : (
          <div className="text-center py-8 space-y-4">
            <p className="text-muted-foreground">No NDVI data available</p>
            <Button onClick={() => handleRefresh(true)} disabled={isFetching}>
              {isFetching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Fetch NDVI Data
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

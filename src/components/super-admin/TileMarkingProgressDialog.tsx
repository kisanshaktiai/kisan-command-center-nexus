import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, MapPin, Layers } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TileMarkingProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  executionId: string | null;
}

interface ProgressData {
  id: string;
  execution_id: string;
  status: 'running' | 'completed' | 'failed';
  total_lands: number;
  processed_lands: number;
  marked_tiles_count: number;
  current_step: string;
  current_land_id: string | null;
  errors: any;
  started_at: string;
  completed_at: string | null;
}

export function TileMarkingProgressDialog({
  open,
  onOpenChange,
  executionId,
}: TileMarkingProgressDialogProps) {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!executionId || !open) {
      setProgress(null);
      setIsLoading(true);
      return;
    }

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const fetchProgress = async () => {
      try {
        const { data, error } = await supabase
          .from('tile_marking_progress')
          .select('*')
          .eq('execution_id', executionId)
          .maybeSingle();

        if (error) {
          console.error('[TileMarkingProgress] Error fetching progress:', error);
          return;
        }

        if (data) {
          setProgress(data as ProgressData);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[TileMarkingProgress] Fetch error:', error);
      }
    };

    // Initial fetch
    fetchProgress();

    // Subscribe to realtime updates
    channel = supabase
      .channel(`tile-marking-progress-${executionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tile_marking_progress',
          filter: `execution_id=eq.${executionId}`,
        },
        (payload) => {
          console.log('[TileMarkingProgress] Realtime update:', payload);
          if (payload.new) {
            setProgress(payload.new as ProgressData);
            setIsLoading(false);
          }
        }
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [executionId, open]);

  const progressPercentage = progress
    ? Math.round((progress.processed_lands / progress.total_lands) * 100)
    : 0;

  const getStatusIcon = () => {
    if (!progress) return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
    
    switch (progress.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
    }
  };

  const getStatusBadge = () => {
    if (!progress) return null;

    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      running: 'secondary',
      completed: 'default',
      failed: 'destructive',
    };

    return (
      <Badge variant={variants[progress.status] || 'secondary'}>
        {progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {getStatusIcon()}
              Tile Marking Progress
            </DialogTitle>
            {getStatusBadge()}
          </div>
          <DialogDescription>
            Processing land boundaries to mark agricultural MGRS tiles
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : progress ? (
            <>
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Overall Progress</span>
                  <span className="text-muted-foreground">
                    {progress.processed_lands} / {progress.total_lands} lands
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  {progressPercentage}% Complete
                </p>
              </div>

              {/* Current Step */}
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Layers className="h-4 w-4 text-primary" />
                  Current Step
                </div>
                <p className="text-sm text-muted-foreground">
                  {progress.current_step}
                </p>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-3 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    Lands Processed
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    {progress.processed_lands}
                  </p>
                </div>
                <div className="rounded-lg border p-3 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Layers className="h-3 w-3" />
                    Tiles Marked
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    {progress.marked_tiles_count}
                  </p>
                </div>
              </div>

              {/* Errors (if any) */}
              {progress.errors && Array.isArray(JSON.parse(progress.errors)) && JSON.parse(progress.errors).length > 0 && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                    <XCircle className="h-4 w-4" />
                    Errors Encountered ({JSON.parse(progress.errors).length})
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {JSON.parse(progress.errors).slice(0, 5).map((error: any, index: number) => (
                      <p key={index} className="text-xs text-muted-foreground">
                        • {error.error || JSON.stringify(error)}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Completion Time */}
              {progress.completed_at && (
                <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                  Completed at {new Date(progress.completed_at).toLocaleString()}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No progress data available
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { WhiteLabelSyncValidator } from '@/services/WhiteLabelSyncValidator';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

export const WhiteLabelSyncStatus: React.FC = () => {
  const { data: syncStatus, isLoading, refetch } = useQuery({
    queryKey: ['white-label-sync-status'],
    queryFn: () => WhiteLabelSyncValidator.validateAllTenants(),
    refetchInterval: 30000 // Check every 30 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading sync status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          White-Label Sync Status
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 rounded-lg bg-muted">
            <div className="text-3xl font-bold text-foreground">{syncStatus?.total || 0}</div>
            <div className="text-sm text-muted-foreground mt-1">Total Tenants</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-green-500/10">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {syncStatus?.inSync || 0}
            </div>
            <div className="text-sm text-muted-foreground mt-1">In Sync</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-red-500/10">
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              {syncStatus?.outOfSync || 0}
            </div>
            <div className="text-sm text-muted-foreground mt-1">Out of Sync</div>
          </div>
        </div>

        {syncStatus?.details && syncStatus.details.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">Tenants with Sync Issues:</h4>
            {syncStatus.details.map((detail) => (
              <div key={detail.tenantId} className="border border-border rounded-lg p-4 bg-card">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-foreground">{detail.tenantName}</span>
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Out of Sync
                  </Badge>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  {detail.differences.map((diff, i) => (
                    <li key={i} className="list-disc">{diff}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {(!syncStatus?.details || syncStatus.details.length === 0) && (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 mx-auto mb-3 text-green-600 dark:text-green-400" />
            <p className="font-semibold text-lg text-foreground">All tenants in sync!</p>
            <p className="text-sm text-muted-foreground mt-1">
              white_label_configs and tenants tables are synchronized
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

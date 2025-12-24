/**
 * /health/version - Debug route for version information
 * 
 * Displays current app version, build hash, and update status.
 * Useful for debugging and verification during deployments.
 */

import { useAppVersionCheck } from '@/hooks/useAppVersionCheck';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, Wifi, WifiOff, Loader2 } from 'lucide-react';

export default function HealthVersion() {
  const {
    status,
    currentVersion,
    latestVersion,
    buildHash,
    updatePolicy,
    releaseNotes,
    isLoading,
    error,
    checkForUpdates,
  } = useAppVersionCheck();

  // Status badge config
  const statusConfig = {
    'checking': { label: 'Checking...', variant: 'secondary' as const, icon: Loader2 },
    'up-to-date': { label: 'Up to Date', variant: 'default' as const, icon: CheckCircle },
    'update-available': { label: 'Update Available', variant: 'outline' as const, icon: AlertTriangle },
    'update-required': { label: 'Update Required', variant: 'destructive' as const, icon: XCircle },
    'error': { label: 'Check Failed', variant: 'destructive' as const, icon: XCircle },
    'offline': { label: 'Offline', variant: 'secondary' as const, icon: WifiOff },
  };

  const currentStatus = statusConfig[status];
  const StatusIcon = currentStatus.icon;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">App Version Health</h1>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={checkForUpdates}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Current Version Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Current Build
            </CardTitle>
            <CardDescription>
              Locally running application version
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Version</p>
                <p className="text-xl font-mono font-semibold">{currentVersion}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Build Hash</p>
                <p className="text-xl font-mono font-semibold">{buildHash}</p>
              </div>
            </div>
            
            {/* Build timestamp from env */}
            <div>
              <p className="text-sm text-muted-foreground">Build Environment</p>
              <p className="text-sm font-mono">
                {import.meta.env.DEV ? 'Development' : 'Production'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Update Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Update Status</span>
              <Badge variant={currentStatus.variant} className="flex items-center gap-1">
                <StatusIcon className={`h-3 w-3 ${status === 'checking' ? 'animate-spin' : ''}`} />
                {currentStatus.label}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {latestVersion && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Latest Version</p>
                  <p className="text-xl font-mono font-semibold">{latestVersion}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Update Policy</p>
                  <Badge variant={updatePolicy === 'FORCED' ? 'destructive' : 'secondary'}>
                    {updatePolicy || 'OPTIONAL'}
                  </Badge>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {releaseNotes && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Release Notes</p>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm whitespace-pre-wrap">{releaseNotes}</p>
                </div>
              </div>
            )}

            {status === 'update-required' && (
              <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
                <p className="text-sm text-destructive font-medium">
                  Your app version is below the minimum supported version. 
                  Please update to continue using the application.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Debug Info */}
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
            <CardDescription>Technical details for troubleshooting</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="p-4 bg-muted rounded-md text-xs font-mono overflow-auto">
{JSON.stringify({
  environment: import.meta.env.MODE,
  version: currentVersion,
  buildHash: buildHash,
  appKey: import.meta.env.VITE_APP_KEY || 'admin_portal',
  status,
  latestVersion,
  updatePolicy,
  checkedAt: new Date().toISOString(),
}, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

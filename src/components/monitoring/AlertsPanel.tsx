
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Clock, RefreshCw, Bell } from 'lucide-react';
import { usePlatformAlerts, useAcknowledgeAlert, useResolveAlert } from '@/lib/api/queries';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ALERT_SEVERITY_COLORS = {
  critical: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-blue-500 text-white',
  info: 'bg-gray-500 text-white'
};

export const AlertsPanel: React.FC = () => {
  const { data: alerts, isLoading, error, refetch } = usePlatformAlerts();
  const acknowledgeAlert = useAcknowledgeAlert();
  const resolveAlert = useResolveAlert();
  const [filter, setFilter] = useState<'all' | 'active' | 'acknowledged' | 'resolved'>('all');

  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeAlert.mutateAsync(alertId);
      toast.success('Alert acknowledged');
    } catch (error) {
      toast.error('Failed to acknowledge alert');
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      await resolveAlert.mutateAsync(alertId);
      toast.success('Alert resolved');
    } catch (error) {
      toast.error('Failed to resolve alert');
    }
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white/90 to-slate-50/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-800">
            <Bell className="h-5 w-5 text-red-500" />
            Platform Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading alerts...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white/90 to-slate-50/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-800">
            <Bell className="h-5 w-5 text-red-500" />
            Platform Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Error loading alerts: {error.message}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Ensure alerts is an array and filter them
  const alertsArray = Array.isArray(alerts) ? alerts : [];
  const filteredAlerts = alertsArray.filter(alert => {
    if (filter === 'all') return true;
    return alert.status === filter;
  });

  const getAlertIcon = (status: string, severity: string) => {
    if (status === 'resolved') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === 'acknowledged') return <Clock className="h-4 w-4 text-blue-500" />;
    return <AlertTriangle className={cn("h-4 w-4", severity === 'critical' ? 'text-red-500' : 'text-orange-500')} />;
  };

  const getSeverityBadge = (severity: string) => {
    const colorClass = ALERT_SEVERITY_COLORS[severity as keyof typeof ALERT_SEVERITY_COLORS] || ALERT_SEVERITY_COLORS.info;
    return (
      <Badge className={colorClass}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white/90 to-slate-50/90 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-800">
            <Bell className="h-5 w-5 text-red-500" />
            Platform Alerts
            <Badge variant="outline" className="ml-2">
              {filteredAlerts.length || 0}
            </Badge>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border">
              {['all', 'active', 'acknowledged', 'resolved'].map((status) => (
                <Button
                  key={status}
                  variant={filter === status ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFilter(status as typeof filter)}
                  className="rounded-none first:rounded-l-lg last:rounded-r-lg"
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {filter === 'all' ? 'No alerts found' : `No ${filter} alerts`}
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className="p-4 rounded-lg border border-gray-200 bg-white/50 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getAlertIcon(alert.status, alert.severity)}
                  <div>
                    <h4 className="font-semibold text-slate-800">{alert.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {getSeverityBadge(alert.severity)}
                  <Badge 
                    variant="outline" 
                    className={cn(
                      alert.status === 'active' && 'border-red-200 text-red-700',
                      alert.status === 'acknowledged' && 'border-blue-200 text-blue-700',
                      alert.status === 'resolved' && 'border-green-200 text-green-700'
                    )}
                  >
                    {alert.status}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  Created: {new Date(alert.created_at).toLocaleString()}
                  {alert.tenant_id && (
                    <span className="ml-3">Tenant: {alert.tenant_id}</span>
                  )}
                </div>
                
                {alert.status === 'active' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAcknowledge(alert.id)}
                      disabled={acknowledgeAlert.isPending}
                    >
                      {acknowledgeAlert.isPending ? 'Acknowledging...' : 'Acknowledge'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleResolve(alert.id)}
                      disabled={resolveAlert.isPending}
                    >
                      {resolveAlert.isPending ? 'Resolving...' : 'Resolve'}
                    </Button>
                  </div>
                )}
                
                {alert.status === 'acknowledged' && (
                  <Button
                    size="sm"
                    onClick={() => handleResolve(alert.id)}
                    disabled={resolveAlert.isPending}
                  >
                    {resolveAlert.isPending ? 'Resolving...' : 'Resolve'}
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};


import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertTriangle, 
  Bell, 
  CheckCircle, 
  Clock, 
  Filter,
  Eye
} from 'lucide-react';
import { usePlatformAlerts, useAcknowledgeAlert, useResolveAlert } from '@/lib/api/queries';

type AlertStatus = 'active' | 'acknowledged' | 'resolved';

const AlertsPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [unreadCount, setUnreadCount] = useState(0);

  // Use real data queries
  const { data: alerts = [], isLoading } = usePlatformAlerts(filter);
  const acknowledgeAlert = useAcknowledgeAlert();
  const resolveAlert = useResolveAlert();

  // Update unread count
  useEffect(() => {
    if (alerts) {
      const unresolved = alerts.filter(alert => alert.status === 'active').length;
      setUnreadCount(unresolved);
    }
  }, [alerts]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: AlertStatus) => {
    switch (status) {
      case 'active': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'acknowledged': return <Eye className="h-4 w-4 text-yellow-500" />;
      case 'resolved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: AlertStatus) => {
    switch (status) {
      case 'active': return 'destructive';
      case 'acknowledged': return 'secondary';
      case 'resolved': return 'default';
      default: return 'outline';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <>
      {/* Floating Alert Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button size="lg" className="relative shadow-lg">
              <Bell className="w-5 h-5 mr-2" />
              Alerts
              {unreadCount > 0 && (
                <Badge className="absolute -top-2 -right-2 px-2 py-1 text-xs bg-red-500">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[540px]">
            <SheetHeader>
              <SheetTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Platform Alerts
                </div>
                <Badge variant="outline">
                  {alerts.filter(a => a.status === 'active').length} active
                </Badge>
              </SheetTitle>
              <SheetDescription>
                Monitor and manage platform alerts and notifications
              </SheetDescription>
            </SheetHeader>

            {/* Filter Controls */}
            <div className="flex items-center gap-2 my-4">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter alerts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Alerts</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="unresolved">Unresolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Alerts List */}
            <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="h-16 bg-muted rounded"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>No alerts found</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <Card key={alert.id} className={`${alert.status === 'active' ? 'border-red-200' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(alert.status as AlertStatus)}
                          <h4 className="font-medium text-sm">{alert.alert_name}</h4>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant={getSeverityColor(alert.severity) as any} className="text-xs">
                            {alert.severity}
                          </Badge>
                          <Badge variant={getStatusColor(alert.status as AlertStatus) as any} className="text-xs">
                            {alert.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {alert.description}
                      </p>

                      {alert.current_value && alert.threshold_value && (
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                          <span>Current: {alert.current_value}</span>
                          <span>Threshold: {alert.threshold_value}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {formatTimeAgo(alert.triggered_at)}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          {alert.status === 'active' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => acknowledgeAlert.mutate(alert.id)}
                              disabled={acknowledgeAlert.isPending}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Ack
                            </Button>
                          )}
                          {(alert.status === 'active' || alert.status === 'acknowledged') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resolveAlert.mutate(alert.id)}
                              disabled={resolveAlert.isPending}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Resolve
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};

export default AlertsPanel;


import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, AlertTriangle, Info, X, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface NotificationCenterProps {
  notifications: any[];
  onNotificationRead?: (id: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ 
  notifications, 
  onNotificationRead 
}) => {
  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('platform_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      onNotificationRead?.(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return AlertTriangle;
      case 'warning': return AlertTriangle;
      case 'success': return CheckCircle;
      default: return Info;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white/90 to-slate-50/90 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-800">
          <Bell className="h-5 w-5 text-blue-500" />
          Notifications ({notifications.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {notifications.map((notification) => {
            const Icon = getSeverityIcon(notification.severity);
            
            return (
              <div 
                key={notification.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-all duration-200",
                  "hover:shadow-md bg-white/70"
                )}
              >
                <div className={cn(
                  "p-2 rounded-lg",
                  getSeverityColor(notification.severity)
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-slate-800">
                        {notification.title}
                      </h4>
                      <p className="text-sm text-slate-600 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        {formatTimestamp(notification.created_at)}
                      </p>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(notification.id)}
                      className="h-8 w-8 p-0 hover:bg-slate-100"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          
          {notifications.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <Bell className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>No new notifications</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

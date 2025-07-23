
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Clock, User, Building, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  type: 'tenant_created' | 'farmer_registered' | 'api_call' | 'subscription_changed';
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export const ActivityFeed: React.FC = () => {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['platform-activity-feed'],
    queryFn: async (): Promise<ActivityItem[]> => {
      const activities: ActivityItem[] = [];
      
      // Get recent tenant creations
      const { data: recentTenants } = await supabase
        .from('tenants')
        .select('id, name, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      recentTenants?.forEach(tenant => {
        activities.push({
          id: `tenant-${tenant.id}`,
          type: 'tenant_created',
          title: 'New Tenant Created',
          description: `${tenant.name} joined the platform`,
          timestamp: tenant.created_at,
        });
      });
      
      // Get recent farmer registrations
      const { data: recentFarmers } = await supabase
        .from('farmers')
        .select('id, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      recentFarmers?.forEach(farmer => {
        activities.push({
          id: `farmer-${farmer.id}`,
          type: 'farmer_registered',
          title: 'New Farmer Registration',
          description: `Farmer registered to the platform`,
          timestamp: farmer.created_at,
        });
      });
      
      // Sort by timestamp
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);
    },
    refetchInterval: 60000, // Refetch every minute
  });

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'tenant_created': return Building;
      case 'farmer_registered': return User;
      case 'api_call': return Activity;
      case 'subscription_changed': return Clock;
      default: return Activity;
    }
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'tenant_created': return 'bg-blue-500';
      case 'farmer_registered': return 'bg-green-500';
      case 'api_call': return 'bg-purple-500';
      case 'subscription_changed': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white/90 to-slate-50/90 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-800">
          <Activity className="h-5 w-5 text-blue-500 animate-pulse" />
          Live Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {activities?.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              return (
                <div 
                  key={activity.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-xl transition-all duration-200",
                    "hover:bg-white/60 hover:shadow-md border border-transparent hover:border-slate-200/50"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg shadow-sm",
                    getActivityColor(activity.type)
                  )}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {activity.title}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">
                          {activity.description}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0 ml-2">
                        {formatTimestamp(activity.timestamp)}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {(!activities || activities.length === 0) && (
              <div className="text-center py-8 text-slate-500">
                <Activity className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>No recent activity</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

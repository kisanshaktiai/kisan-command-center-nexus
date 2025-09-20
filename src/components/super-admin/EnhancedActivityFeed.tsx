import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Building, Users, TrendingUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  type: 'tenant_created' | 'farmers_batch' | 'milestone' | 'api_surge';
  title: string;
  description: string;
  timestamp: string;
  metadata?: {
    tenantName?: string;
    tenantLogo?: string;
    count?: number;
    endpoint?: string;
  };
}

const ActivityIcon: React.FC<{ type: ActivityItem['type'] }> = ({ type }) => {
  const icons = {
    tenant_created: Building,
    farmers_batch: Users,
    milestone: Sparkles,
    api_surge: TrendingUp
  };
  
  const Icon = icons[type];
  
  const colors = {
    tenant_created: 'bg-gradient-to-br from-blue-500 to-blue-600',
    farmers_batch: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    milestone: 'bg-gradient-to-br from-purple-500 to-purple-600',
    api_surge: 'bg-gradient-to-br from-amber-500 to-amber-600'
  };
  
  return (
    <div className={cn("p-2.5 rounded-xl shadow-lg", colors[type])}>
      <Icon className="w-5 h-5 text-white" />
    </div>
  );
};

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="relative">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
        <Activity className="w-12 h-12 text-slate-400 dark:text-slate-500" />
      </div>
      <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
        <span className="text-white text-xs font-bold">0</span>
      </div>
    </div>
    <h3 className="mt-6 text-lg font-semibold text-slate-700 dark:text-slate-300">
      No Recent Activity
    </h3>
    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-xs">
      Your platform activity will appear here. Check back soon for updates!
    </p>
    <button className="mt-6 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300">
      View Historical Data
    </button>
  </div>
);

export const EnhancedActivityFeed: React.FC = () => {
  const { data: rawActivities, isLoading } = useQuery({
    queryKey: ['enhanced-activity-feed'],
    queryFn: async (): Promise<ActivityItem[]> => {
      const activities: ActivityItem[] = [];
      
      // Fetch recent tenants
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, name, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      
      // Fetch recent farmers
      const { data: farmers } = await supabase
        .from('farmers')
        .select('id, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      
      // Process tenant activities
      tenants?.forEach(tenant => {
        activities.push({
          id: `tenant-${tenant.id}`,
          type: 'tenant_created',
          title: 'New Tenant Onboarded',
          description: tenant.name,
          timestamp: tenant.created_at,
          metadata: {
            tenantName: tenant.name
          }
        });
      });
      
      // Group farmers by day
      const farmersByDay = new Map<string, number>();
      farmers?.forEach(farmer => {
        const date = new Date(farmer.created_at).toDateString();
        farmersByDay.set(date, (farmersByDay.get(date) || 0) + 1);
      });
      
      // Create batch farmer activities
      farmersByDay.forEach((count, date) => {
        if (count >= 3) {
          activities.push({
            id: `farmers-batch-${date}`,
            type: 'farmers_batch',
            title: 'Farmers Registered',
            description: `${count} farmers joined the platform`,
            timestamp: new Date(date).toISOString(),
            metadata: { count }
          });
        }
      });
      
      // Add milestone activities
      if (tenants && tenants.length >= 10) {
        activities.push({
          id: 'milestone-tenants',
          type: 'milestone',
          title: 'Platform Milestone',
          description: `Reached ${tenants.length} active tenants!`,
          timestamp: new Date().toISOString(),
          metadata: { count: tenants.length }
        });
      }
      
      return activities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ).slice(0, 15);
    },
    refetchInterval: 60000
  });

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
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const activities = useMemo(() => rawActivities || [], [rawActivities]);

  return (
    <Card className={cn(
      "border-0 shadow-xl h-full",
      "bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl"
    )}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500 animate-pulse" />
            Live Activity Feed
          </CardTitle>
          <Badge variant="secondary" className="font-medium">
            {activities.length} events
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {activities.map((activity) => (
              <div 
                key={activity.id}
                className={cn(
                  "group flex items-start gap-3 p-3 rounded-xl",
                  "transition-all duration-300",
                  "hover:bg-slate-50 dark:hover:bg-slate-800/50",
                  "border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                )}
              >
                {activity.type === 'tenant_created' && activity.metadata?.tenantLogo ? (
                  <Avatar className="w-10 h-10 shadow-lg">
                    <img src={activity.metadata.tenantLogo} alt={activity.metadata.tenantName} />
                    <AvatarFallback>
                      {activity.metadata.tenantName?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <ActivityIcon type={activity.type} />
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                        {activity.title}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                        {activity.description}
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className="text-xs shrink-0 font-medium"
                    >
                      {formatTimestamp(activity.timestamp)}
                    </Badge>
                  </div>
                  
                  {activity.metadata?.count && activity.type === 'farmers_batch' && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {[...Array(Math.min(activity.metadata.count, 3))].map((_, i) => (
                          <div 
                            key={i}
                            className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 border-2 border-white dark:border-slate-900 flex items-center justify-center"
                          >
                            <Users className="w-3 h-3 text-white" />
                          </div>
                        ))}
                      </div>
                      {activity.metadata.count > 3 && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          +{activity.metadata.count - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
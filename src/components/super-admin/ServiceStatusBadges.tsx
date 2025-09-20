import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, XCircle, Server, Database, Globe, Shield, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Service {
  name: string;
  status: 'healthy' | 'warning' | 'down';
  icon: React.FC<{ className?: string }>;
  responseTime?: number;
  uptime?: number;
}

const ServiceBadge: React.FC<{ service: Service }> = ({ service }) => {
  const statusConfig = {
    healthy: {
      icon: CheckCircle2,
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      border: 'border-emerald-500/20',
      text: 'text-emerald-700 dark:text-emerald-400',
      iconColor: 'text-emerald-500',
      label: 'Healthy'
    },
    warning: {
      icon: AlertCircle,
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      border: 'border-amber-500/20',
      text: 'text-amber-700 dark:text-amber-400',
      iconColor: 'text-amber-500',
      label: 'Warning'
    },
    down: {
      icon: XCircle,
      bg: 'bg-red-500/10 dark:bg-red-500/20',
      border: 'border-red-500/20',
      text: 'text-red-700 dark:text-red-400',
      iconColor: 'text-red-500',
      label: 'Down'
    }
  };

  const config = statusConfig[service.status];
  const StatusIcon = config.icon;
  const ServiceIcon = service.icon;

  return (
    <div className={cn(
      "group relative flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl",
      "transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
      config.bg,
      config.border
    )}>
      <div className="flex items-center gap-3 flex-1">
        <ServiceIcon className={cn("w-5 h-5", config.text)} />
        <div className="flex-1">
          <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">
            {service.name}
          </p>
          {service.responseTime && (
            <p className="text-xs text-slate-500 dark:text-slate-500">
              {service.responseTime}ms • {service.uptime}% uptime
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StatusIcon className={cn("w-5 h-5", config.iconColor)} />
        <span className={cn("text-sm font-semibold", config.text)}>
          {config.label === 'Healthy' ? '✅' : config.label === 'Warning' ? '⚠️' : '❌'}
        </span>
      </div>
    </div>
  );
};

export const ServiceStatusBadges: React.FC = () => {
  const { data: services, isLoading } = useQuery({
    queryKey: ['service-status'],
    queryFn: async (): Promise<Service[]> => {
      // Fetch real service health data if available
      const { data: healthData } = await supabase
        .from('system_health_metrics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      // Mock data with real-time enhancements
      const defaultServices: Service[] = [
        { 
          name: 'Database', 
          status: 'healthy', 
          icon: Database,
          responseTime: 45,
          uptime: 99.9
        },
        { 
          name: 'API Gateway', 
          status: 'healthy', 
          icon: Globe,
          responseTime: 120,
          uptime: 99.5
        },
        { 
          name: 'Auth Service', 
          status: 'healthy', 
          icon: Shield,
          responseTime: 85,
          uptime: 99.8
        },
        { 
          name: 'Edge Functions', 
          status: 'warning', 
          icon: Zap,
          responseTime: 250,
          uptime: 98.2
        },
        { 
          name: 'Storage', 
          status: 'healthy', 
          icon: Server,
          responseTime: 95,
          uptime: 99.7
        }
      ];

      // Override with real data if available
      if (healthData && healthData.length > 0) {
        const latestHealth = healthData[0];
        if (latestHealth.value < 50) {
          defaultServices[0].status = 'down';
        } else if (latestHealth.value < 80) {
          defaultServices[0].status = 'warning';
        }
      }

      return defaultServices;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card className="border-0 shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const healthyCount = services?.filter(s => s.status === 'healthy').length || 0;
  const totalCount = services?.length || 0;

  return (
    <Card className={cn(
      "border-0 shadow-xl",
      "bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl"
    )}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Server className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            Service Status
          </CardTitle>
          <div className={cn(
            "px-3 py-1 rounded-full text-sm font-semibold",
            healthyCount === totalCount 
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : healthyCount > totalCount / 2
              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
              : "bg-red-500/10 text-red-700 dark:text-red-400"
          )}>
            {healthyCount}/{totalCount} Operational
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {services?.map((service) => (
            <ServiceBadge key={service.name} service={service} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
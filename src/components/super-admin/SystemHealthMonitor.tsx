
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Server, 
  Database, 
  Wifi, 
  HardDrive, 
  Cpu, 
  Activity,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SystemMetric {
  name: string;
  value: number;
  status: 'healthy' | 'warning' | 'critical';
  unit: string;
  icon: React.ElementType;
  description: string;
}

export const SystemHealthMonitor: React.FC = () => {
  // Mock system metrics - in production these would come from monitoring services
  const metrics: SystemMetric[] = [
    {
      name: 'API Response Time',
      value: 145,
      status: 'healthy',
      unit: 'ms',
      icon: Wifi,
      description: 'Average API response time'
    },
    {
      name: 'Database Performance',
      value: 98,
      status: 'healthy',
      unit: '%',
      icon: Database,
      description: 'Database query performance'
    },
    {
      name: 'Server CPU Usage',
      value: 67,
      status: 'warning',
      unit: '%',
      icon: Cpu,
      description: 'Current CPU utilization'
    },
    {
      name: 'Storage Usage',
      value: 82,
      status: 'warning',
      unit: '%',
      icon: HardDrive,
      description: 'Total storage utilization'
    },
    {
      name: 'System Uptime',
      value: 99.9,
      status: 'healthy',
      unit: '%',
      icon: Server,
      description: 'System availability uptime'
    }
  ];

  const getStatusColor = (status: SystemMetric['status']) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getStatusIcon = (status: SystemMetric['status']) => {
    switch (status) {
      case 'healthy': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'critical': return AlertTriangle;
    }
  };

  const getProgressColor = (status: SystemMetric['status']) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
    }
  };

  const overallHealth = metrics.reduce((acc, metric) => {
    const weight = metric.status === 'healthy' ? 100 : metric.status === 'warning' ? 70 : 30;
    return acc + weight;
  }, 0) / metrics.length;

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white/90 to-slate-50/90 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-800">
            <Activity className="h-5 w-5 text-blue-500" />
            System Health
          </CardTitle>
          <Badge 
            variant="outline" 
            className={cn(
              "font-medium",
              overallHealth >= 90 ? 'text-green-600 bg-green-50 border-green-200' :
              overallHealth >= 70 ? 'text-orange-600 bg-orange-50 border-orange-200' :
              'text-red-600 bg-red-50 border-red-200'
            )}
          >
            {Math.round(overallHealth)}% Health
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {metrics.map((metric) => {
            const StatusIcon = getStatusIcon(metric.status);
            const Icon = metric.icon;
            
            return (
              <div key={metric.name} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-100">
                      <Icon className="h-4 w-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{metric.name}</p>
                      <p className="text-sm text-slate-500">{metric.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-slate-800">
                      {metric.value}{metric.unit}
                    </span>
                    <StatusIcon className={cn(
                      "h-5 w-5",
                      metric.status === 'healthy' ? 'text-green-500' :
                      metric.status === 'warning' ? 'text-orange-500' :
                      'text-red-500'
                    )} />
                  </div>
                </div>
                
                {metric.unit === '%' && (
                  <div className="w-full">
                    <Progress 
                      value={metric.value} 
                      className="h-2"
                      // Custom progress bar color based on status
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

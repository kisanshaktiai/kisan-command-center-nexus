
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface SystemHealthDisplayProps {
  systemHealth: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    healthScore: number;
  };
  isLoading?: boolean;
}

const getHealthStatus = (score: number) => {
  if (score >= 90) return { status: 'healthy', color: 'text-green-600', icon: CheckCircle };
  if (score >= 70) return { status: 'warning', color: 'text-yellow-600', icon: AlertTriangle };
  return { status: 'critical', color: 'text-red-600', icon: XCircle };
};

const getUsageColor = (usage: number) => {
  if (usage >= 90) return 'bg-red-500';
  if (usage >= 70) return 'bg-yellow-500';
  return 'bg-green-500';
};

export const SystemHealthDisplay: React.FC<SystemHealthDisplayProps> = ({ 
  systemHealth, 
  isLoading = false 
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const { status, color, icon: Icon } = getHealthStatus(systemHealth.healthScore);

  return (
    <div className="space-y-6">
      {/* Overall Health Score */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">System Health Score</CardTitle>
          <Icon className={`h-4 w-4 ${color}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{systemHealth.healthScore}%</div>
          <p className={`text-xs ${color} capitalize`}>{status}</p>
        </CardContent>
      </Card>

      {/* Resource Usage Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth.cpuUsage}%</div>
            <Progress 
              value={systemHealth.cpuUsage} 
              className="mt-2"
              indicatorClassName={getUsageColor(systemHealth.cpuUsage)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth.memoryUsage}%</div>
            <Progress 
              value={systemHealth.memoryUsage} 
              className="mt-2"
              indicatorClassName={getUsageColor(systemHealth.memoryUsage)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disk Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth.diskUsage}%</div>
            <Progress 
              value={systemHealth.diskUsage} 
              className="mt-2"
              indicatorClassName={getUsageColor(systemHealth.diskUsage)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};


import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Database, HardDrive, Users, Activity } from 'lucide-react';

interface ResourceMetricsDisplayProps {
  resourceMetrics: {
    storageUsed: number;
    storageTotal: number;
    databaseConnections: number;
    activeUsers: number;
  };
  isLoading?: boolean;
}

export const ResourceMetricsDisplay: React.FC<ResourceMetricsDisplayProps> = ({ 
  resourceMetrics, 
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

  const storagePercentage = Math.round((resourceMetrics.storageUsed / resourceMetrics.storageTotal) * 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
          <HardDrive className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {resourceMetrics.storageUsed}GB
          </div>
          <p className="text-xs text-muted-foreground">
            of {resourceMetrics.storageTotal}GB ({storagePercentage}%)
          </p>
          <Progress value={storagePercentage} className="mt-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">DB Connections</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{resourceMetrics.databaseConnections}</div>
          <p className="text-xs text-muted-foreground">Active connections</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{resourceMetrics.activeUsers}</div>
          <p className="text-xs text-muted-foreground">Currently online</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">System Load</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {Math.round((resourceMetrics.databaseConnections / 50) * 100)}%
          </div>
          <p className="text-xs text-muted-foreground">Resource utilization</p>
        </CardContent>
      </Card>
    </div>
  );
};


import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Server, Cpu, HardDrive, Activity } from 'lucide-react';

interface SystemHealthData {
  services: Array<{
    name: string;
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    response_time: number;
  }>;
  resources: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

interface SystemHealthMonitorProps {
  data: SystemHealthData;
  isLoading?: boolean;
}

const SystemHealthMonitor: React.FC<SystemHealthMonitorProps> = ({ 
  data, 
  isLoading = false 
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Process the data to match expected structure
  const resourceData = [
    {
      time: new Date().toLocaleTimeString(),
      cpu: data.resources?.cpu || 0,
      memory: data.resources?.memory || 0,
      network: data.resources?.cpu * 0.8 || 0, // Derived network usage
      response_time: data.services?.[0]?.response_time || 0
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': return 'default';
      case 'warning': return 'secondary';
      case 'critical': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Resource Usage */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.resources?.cpu?.toFixed(1) || 0}%</div>
            <Progress value={data.resources?.cpu || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.resources?.memory?.toFixed(1) || 0}%</div>
            <Progress value={data.resources?.memory || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disk Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.resources?.disk?.toFixed(1) || 0}%</div>
            <Progress value={data.resources?.disk || 0} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Services Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Services Status
          </CardTitle>
          <CardDescription>Real-time health monitoring of platform services</CardDescription>
        </CardHeader>
        <CardContent>
          {!data.services || data.services.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No service data available
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {data.services.map((service) => (
                <div key={service.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Activity className={`h-4 w-4 ${getStatusColor(service.status)}`} />
                    <div>
                      <h4 className="font-medium">{service.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Uptime: {service.uptime?.toFixed(1) || 0}% | Response: {service.response_time || 0}ms
                      </p>
                    </div>
                  </div>
                  <Badge variant={getStatusBadge(service.status) as any}>
                    {service.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemHealthMonitor;
